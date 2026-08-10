import { expect, type Locator, type Page, test } from "@playwright/test";
import { Buffer } from "node:buffer";

const storageKey = "saving-goal:state";
const geometryTolerancePixels = 2;

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.reload();
});

test("creates a goal from the empty state and restores it after reload", async ({
  page,
}) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "1000.00",
    openingBalance: "250.00",
    currency: "USD",
    warningThreshold: "20",
  });

  await expect(
    page.getByRole("heading", { level: 3, name: "Emergency fund" }),
  ).toBeVisible();
  await expect(page.locator(".goal-card__balance strong")).toHaveText(
    "$250.00",
  );

  await page.reload();

  await expect(
    page.getByRole("heading", { level: 3, name: "Emergency fund" }),
  ).toBeVisible();
  await expect(page.locator(".goal-card__balance strong")).toHaveText(
    "$250.00",
  );
});

test("keeps differently denominated goals separate", async ({ page }) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "1000.00",
    openingBalance: "250.00",
    currency: "USD",
    warningThreshold: "20",
  });
  await createGoal(page, {
    name: "Japan trip",
    target: "100000",
    openingBalance: "25000",
    currency: "JPY",
    warningThreshold: "20",
  });

  await expect(goalCard(page, "Emergency fund")).toContainText("$250.00");
  await expect(goalCard(page, "Emergency fund")).toContainText("of $1,000.00");
  await expect(goalCard(page, "Japan trip")).toContainText("¥25,000");
  await expect(goalCard(page, "Japan trip")).toContainText("of ¥100,000");
  await expect(page.getByLabel("Goal summary")).toHaveText(
    "2 goals, 0 completed",
  );
  await expect(page.getByText(/total/i)).toHaveCount(0);
});

test("records deposits and ordinary withdrawals", async ({ page }) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "500.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
  });

  await recordTransaction(page, "Emergency fund", "deposit", "40.00");
  await expect(goalBalance(page, "Emergency fund")).toHaveText("$140.00");

  await recordTransaction(page, "Emergency fund", "withdrawal", "10.00");
  await expect(goalBalance(page, "Emergency fund")).toHaveText("$130.00");

  const disclosure = page.getByRole("button", { name: "Show 3 activities" });
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  await expect(
    page.getByRole("list", { name: "Activity for Emergency fund" }),
  ).toHaveCount(0);
  await disclosure.click();

  const activity = page.getByRole("list", {
    name: "Activity for Emergency fund",
  });
  await expect(activity.getByRole("listitem")).toHaveCount(3);
  await expect(activity.getByRole("listitem")).toHaveText([
    /Withdrawal.*-\$10\.00/,
    /Deposit.*\$40\.00/,
    /Opening balance.*\$100\.00/,
  ]);

  await page.getByRole("button", { name: "Hide activity" }).click();
  await expect(activity).toHaveCount(0);
  await expect(disclosure).toHaveAttribute("aria-expanded", "false");
});

test("persists ordinary and warned withdrawal reasons exactly once", async ({
  page,
}) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "500.00",
    openingBalance: "200.00",
    currency: "USD",
    warningThreshold: "20",
  });

  await recordTransaction(
    page,
    "Emergency fund",
    "withdrawal",
    "20.00",
    "Replace a damaged tire",
  );
  await recordTransaction(
    page,
    "Emergency fund",
    "withdrawal",
    "50.00",
    "Urgent dental appointment",
  );

  const warning = page.getByRole("dialog", {
    name: "Confirm large withdrawal",
  });
  await expect(warning).toContainText("Urgent dental appointment");
  await warning.getByRole("button", { name: "Confirm withdrawal" }).click();
  await expect.poll(() => storedTransactionCount(page)).toBe(3);
  await page.reload();

  await expandActivity(page, "Emergency fund", 3);
  const activity = activityList(page, "Emergency fund");
  const reasons = page.getByTestId("withdrawal-reason");
  await expect(reasons).toHaveCount(2);
  const ordinaryWithdrawal = activity.getByRole("listitem").filter({
    hasText: "Replace a damaged tire",
  });
  const warnedWithdrawal = activity.getByRole("listitem").filter({
    hasText: "Urgent dental appointment",
  });
  await expect(ordinaryWithdrawal).toHaveCount(1);
  await expect(
    ordinaryWithdrawal.getByText("Reason", { exact: true }),
  ).toBeVisible();
  await expect(ordinaryWithdrawal).toContainText("-$20.00");
  await expect(warnedWithdrawal).toHaveCount(1);
  await expect(
    warnedWithdrawal.getByText("Reason", { exact: true }),
  ).toBeVisible();
  await expect(warnedWithdrawal).toContainText("-$50.00");
  await expect.poll(() => storedTransactionCount(page)).toBe(3);
});

test("creates, persists, replaces, and removes normalized goal artwork", async ({
  page,
}) => {
  const originalArtwork = await generatedArtwork(page, {
    name: "wide-goal.png",
    mimeType: "image/png",
    width: 320,
    height: 160,
  });
  await createGoal(page, {
    name: "Camera fund",
    target: "1200.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
    artwork: originalArtwork,
  });

  const originalSource = await expectNormalizedArtwork(
    page,
    "Camera fund",
    128,
    64,
  );
  await expectArtworkAspectRatio(page, "Camera fund", 2);
  await expect.poll(() => storedEnvelopeVersion(page)).toBe(2);
  await page.reload();
  await expectNormalizedArtwork(page, "Camera fund", 128, 64);
  await expectArtworkAspectRatio(page, "Camera fund", 2);

  const replacementArtwork = await generatedArtwork(page, {
    name: "tall-goal.jpg",
    mimeType: "image/jpeg",
    width: 60,
    height: 120,
  });
  await page.getByRole("button", { name: "Edit Camera fund" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit saving goal" });
  await editDialog
    .getByLabel("Replace artwork")
    .setInputFiles(replacementArtwork);
  await expect(
    editDialog.getByRole("img", { name: "Goal artwork preview" }),
  ).not.toHaveAttribute("src", originalSource);
  await editDialog.getByRole("button", { name: "Save changes" }).click();

  const replacementSource = await expectNormalizedArtwork(
    page,
    "Camera fund",
    60,
    120,
  );
  expect(replacementSource).not.toBe(originalSource);
  await expectArtworkAspectRatio(page, "Camera fund", 0.5);
  await page.reload();
  await expectNormalizedArtwork(page, "Camera fund", 60, 120);
  await expectArtworkAspectRatio(page, "Camera fund", 0.5);

  await page.getByRole("button", { name: "Edit Camera fund" }).click();
  await editDialog.getByRole("button", { name: "Remove artwork" }).click();
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect(goalArtwork(page, "Camera fund")).toHaveCount(0);
  await expect.poll(() => storedGoalIcon(page, "Camera fund")).toBeUndefined();

  await page.reload();
  await expect(goalArtwork(page, "Camera fund")).toHaveCount(0);
});

test("rejects unsupported and oversized artwork without changing the saved goal", async ({
  page,
}) => {
  const artwork = await generatedArtwork(page, {
    name: "goal.png",
    mimeType: "image/png",
    width: 160,
    height: 80,
  });
  await createGoal(page, {
    name: "Camera fund",
    target: "1200.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
    artwork,
  });
  const savedIcon = await storedGoalIcon(page, "Camera fund");

  await page.getByRole("button", { name: "Edit Camera fund" }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit saving goal" });
  await editDialog.getByLabel("Replace artwork").setInputFiles({
    name: "animated.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("unsupported"),
  });
  await expect(editDialog).toContainText("Choose a PNG, JPEG, or WebP image.");
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => storedGoalIcon(page, "Camera fund")).toBe(savedIcon);

  await page.getByRole("button", { name: "Edit Camera fund" }).click();
  await editDialog.getByLabel("Replace artwork").setInputFiles({
    name: "oversized.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await expect(editDialog).toContainText(
    "Choose an image no larger than 2 MB.",
  );
  await editDialog.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => storedGoalIcon(page, "Camera fund")).toBe(savedIcon);
  await expect(goalArtwork(page, "Camera fund")).toHaveAttribute(
    "src",
    savedIcon!,
  );
});

test("cancels and confirms a warned withdrawal without duplication", async ({
  page,
}) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "500.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
  });

  await recordTransaction(page, "Emergency fund", "withdrawal", "30.00");
  const warning = page.getByRole("dialog", {
    name: "Confirm large withdrawal",
  });
  await expect(warning).toContainText("$70.00");
  await expect(warning).toContainText("30% of the current balance");
  await warning.getByRole("button", { name: "Keep savings" }).click();

  await expect(goalBalance(page, "Emergency fund")).toHaveText("$100.00");
  await expect(
    goalCard(page, "Emergency fund").getByRole("button", {
      name: "Show 1 activities",
    }),
  ).toBeVisible();

  await recordTransaction(page, "Emergency fund", "withdrawal", "30.00");
  await warning.getByRole("button", { name: "Confirm withdrawal" }).click();

  await expect(goalBalance(page, "Emergency fund")).toHaveText("$70.00");
  await expandActivity(page, "Emergency fund", 2);
  await expect(
    activityList(page, "Emergency fund").getByRole("listitem"),
  ).toHaveCount(2);
});

test("rejects an overdraft without adding a ledger entry", async ({ page }) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "500.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
  });
  await expect.poll(() => storedTransactionCount(page)).toBe(1);

  await page
    .getByRole("button", { name: "Add transaction for Emergency fund" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await dialog.getByRole("button", { name: "Withdrawal" }).click();
  await dialog.getByRole("textbox", { name: "Amount" }).fill("150.00");
  await dialog.getByRole("button", { name: "Record withdrawal" }).click();

  await expect(
    dialog.getByText("Withdrawal cannot exceed the current balance."),
  ).toBeVisible();
  await expect(dialog).toBeVisible();
  await expect(goalBalance(page, "Emergency fund")).toHaveText("$100.00");
  await expect.poll(() => storedTransactionCount(page)).toBe(1);
});

test("records first completion, shows overfunding, and does not replay it", async ({
  page,
}, testInfo) => {
  await createGoal(page, {
    name: "Laptop",
    target: "100.00",
    openingBalance: "90.00",
    currency: "USD",
    warningThreshold: "20",
  });
  const progress = page.getByRole("progressbar", {
    name: "Progress for Laptop",
  });
  const reducedMotion = testInfo.project.name === "reduced-motion-chromium";

  if (!reducedMotion) {
    await observeCompletionAccent(progress);
  }
  await recordTransaction(page, "Laptop", "deposit", "20.00");

  await expect(goalCard(page, "Laptop")).toContainText("Goal complete");
  await expect(progress).toHaveAttribute("aria-valuenow", "100");
  await expect(progress).toHaveAttribute("aria-valuetext", "110% funded");
  if (reducedMotion) {
    await expect(progress).toHaveAttribute("data-motion", "reduced");
    await expect(progress).toHaveAttribute("data-completion-accent", "settled");
  } else {
    await expect(progress).toHaveAttribute(
      "data-observed-completion-accent",
      "playing",
    );
  }

  await page.reload();

  const restoredProgress = page.getByRole("progressbar", {
    name: "Progress for Laptop",
  });
  await expect(restoredProgress).toHaveAttribute(
    "aria-valuetext",
    "110% funded",
  );
  await expect(restoredProgress).toHaveAttribute(
    "data-completion-accent",
    "settled",
  );
});

test("edits mutable goal fields while currency and opening balance stay locked", async ({
  page,
}) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "500.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
  });

  await page.getByRole("button", { name: "Edit Emergency fund" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit saving goal" });
  await expect(
    dialog.getByRole("textbox", { name: "Currency" }),
  ).toBeDisabled();
  await expect(
    dialog.getByRole("textbox", { name: "Opening balance" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("textbox", { name: "Currency" })).toHaveValue(
    "USD",
  );
  await expect(
    dialog.getByRole("textbox", { name: "Opening balance" }),
  ).toHaveValue("100.00");

  await dialog
    .getByRole("textbox", { name: "Goal name" })
    .fill("Rainy day fund");
  await dialog.getByRole("textbox", { name: "Target amount" }).fill("750.00");
  await dialog
    .getByRole("spinbutton", { name: "Withdrawal warning threshold (%)" })
    .fill("10");
  await dialog.getByRole("button", { name: "Save changes" }).click();

  await expect(goalCard(page, "Rainy day fund")).toContainText("of $750.00");
  await expect(goalBalance(page, "Rainy day fund")).toHaveText("$100.00");
});

test("deletes a goal and its transaction history after confirmation", async ({
  page,
}) => {
  await createGoal(page, {
    name: "Emergency fund",
    target: "500.00",
    openingBalance: "100.00",
    currency: "USD",
    warningThreshold: "20",
  });
  await recordTransaction(page, "Emergency fund", "deposit", "25.00");
  await expect.poll(() => storedTransactionCount(page)).toBe(2);

  await page.getByRole("button", { name: "Delete Emergency fund" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete Emergency fund?" });
  await expect(dialog).toContainText("all of its transaction history");
  await dialog.getByRole("button", { name: "Delete permanently" }).click();

  await expect(
    page.getByRole("region", { name: "Start your first goal" }),
  ).toBeVisible();
  await expect.poll(() => storedGoalCount(page)).toBe(0);
  await expect.poll(() => storedTransactionCount(page)).toBe(0);
});

test("preserves malformed storage until the user explicitly resets it", async ({
  page,
}) => {
  const malformedValue = '{"version":1,"state":';
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: storageKey,
    value: malformedValue,
  });
  await page.reload();

  await expect(
    page.getByRole("heading", { name: "Saved data needs attention" }),
  ).toBeVisible();
  await expect.poll(() => storedRawValue(page)).toBe(malformedValue);

  await page.getByRole("button", { name: "Reset saved data" }).click();
  const dialog = page.getByRole("dialog", { name: "Reset saved data?" });
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect.poll(() => storedRawValue(page)).toBe(malformedValue);

  await page.getByRole("button", { name: "Reset saved data" }).click();
  await dialog.getByRole("button", { name: "Reset permanently" }).click();

  await expect.poll(() => storedRawValue(page)).not.toBe(malformedValue);
  await expect.poll(() => storedGoalCount(page)).toBe(0);
  await expect.poll(() => storedTransactionCount(page)).toBe(0);
  await expect(
    page.getByRole("region", { name: "Start your first goal" }),
  ).toBeVisible();
});

test("supports keyboard interaction-polish workflows", async ({ page }) => {
  const firstArtwork = await generatedArtwork(page, {
    name: "first.png",
    mimeType: "image/png",
    width: 80,
    height: 40,
  });
  await page.getByRole("button", { name: "Add goal" }).focus();
  await page.keyboard.press("Enter");
  let createDialog = page.getByRole("dialog", {
    name: "Create a saving goal",
  });
  await page.keyboard.press("Escape");
  await expect(createDialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Add goal" })).toBeFocused();

  await page.keyboard.press("Enter");
  createDialog = page.getByRole("dialog", { name: "Create a saving goal" });
  await createDialog
    .getByRole("textbox", { name: "Goal name" })
    .fill("Keyboard fund");
  await createDialog
    .getByRole("textbox", { name: "Target amount" })
    .fill("500.00");
  await createDialog
    .getByRole("textbox", { name: "Opening balance" })
    .fill("200.00");
  await chooseFileWithKeyboard(
    page,
    createDialog.getByLabel("Goal artwork (optional)"),
    firstArtwork,
  );
  await createDialog.getByRole("button", { name: "Create goal" }).focus();
  await page.keyboard.press("Enter");

  const activityDisclosure = goalCard(page, "Keyboard fund").getByRole(
    "button",
    { name: "Show 1 activities" },
  );
  await activityDisclosure.focus();
  await page.keyboard.press("Enter");
  await expect(activityList(page, "Keyboard fund")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(activityList(page, "Keyboard fund")).toHaveCount(0);

  const replacementArtwork = await generatedArtwork(page, {
    name: "replacement.webp",
    mimeType: "image/webp",
    width: 40,
    height: 80,
  });
  await page.getByRole("button", { name: "Edit Keyboard fund" }).focus();
  await page.keyboard.press("Enter");
  const editDialog = page.getByRole("dialog", { name: "Edit saving goal" });
  await chooseFileWithKeyboard(
    page,
    editDialog.getByLabel("Replace artwork"),
    replacementArtwork,
  );
  await editDialog.getByRole("button", { name: "Save changes" }).focus();
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Edit Keyboard fund" }).focus();
  await page.keyboard.press("Enter");
  await editDialog.getByRole("button", { name: "Remove artwork" }).focus();
  await page.keyboard.press("Enter");
  await editDialog.getByRole("button", { name: "Save changes" }).focus();
  await page.keyboard.press("Enter");
  await expect(goalArtwork(page, "Keyboard fund")).toHaveCount(0);

  await recordDepositWithKeyboard(page, "Keyboard fund", "20.00");
  await expect(goalBalance(page, "Keyboard fund")).toHaveText("$220.00");
  await recordWithdrawalWithKeyboard(
    page,
    "Keyboard fund",
    "20.00",
    "Keyboard ordinary reason",
  );
  await recordWithdrawalWithKeyboard(
    page,
    "Keyboard fund",
    "50.00",
    "Keyboard warned reason",
  );
  let warning = page.getByRole("dialog", {
    name: "Confirm large withdrawal",
  });
  await expect(
    warning.getByRole("button", { name: "Keep savings" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    warning.getByRole("button", { name: "Confirm withdrawal" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(warning).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add transaction for Keyboard fund" }),
  ).toBeFocused();

  await recordWithdrawalWithKeyboard(
    page,
    "Keyboard fund",
    "50.00",
    "Keyboard warned reason",
  );
  warning = page.getByRole("dialog", { name: "Confirm large withdrawal" });
  await warning.getByRole("button", { name: "Confirm withdrawal" }).focus();
  await page.keyboard.press("Enter");
  await expandActivityWithKeyboard(page, "Keyboard fund", 4);
  await expect(page.getByTestId("withdrawal-reason")).toHaveCount(2);

  await page.getByRole("button", { name: "Edit Keyboard fund" }).focus();
  await page.keyboard.press("Enter");
  await page
    .getByRole("dialog", { name: "Edit saving goal" })
    .getByRole("button", { name: "Cancel" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Edit Keyboard fund" }),
  ).toBeFocused();

  await page.getByRole("button", { name: "Delete Keyboard fund" }).focus();
  await page.keyboard.press("Enter");
  const deleteDialog = page.getByRole("dialog", {
    name: "Delete Keyboard fund?",
  });
  await expect(
    deleteDialog.getByRole("button", { name: "Cancel" }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    deleteDialog.getByRole("button", { name: "Delete permanently" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Start your first goal" }),
  ).toBeVisible();

  const malformedValue = '{"version":2,"state":';
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: storageKey,
    value: malformedValue,
  });
  await page.reload();
  const resetTrigger = page.getByRole("button", { name: "Reset saved data" });
  await resetTrigger.focus();
  await page.keyboard.press("Enter");
  let resetDialog = page.getByRole("dialog", { name: "Reset saved data?" });
  await page.keyboard.press("Escape");
  await expect(resetDialog).toHaveCount(0);
  await expect(resetTrigger).toBeFocused();
  await page.keyboard.press("Enter");
  resetDialog = page.getByRole("dialog", { name: "Reset saved data?" });
  await resetDialog.getByRole("button", { name: "Reset permanently" }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Start your first goal" }),
  ).toBeVisible();
});

test("fits progress visuals and dialog framing at the configured viewport", async ({
  page,
}, testInfo) => {
  const longGoalName = "A very long professional laptop replacement fund";
  const artwork = await generatedArtwork(page, {
    name: "responsive-goal.png",
    mimeType: "image/png",
    width: 320,
    height: 160,
  });
  const longReason = "R".repeat(160);
  await createGoal(page, {
    name: longGoalName,
    target: "1000.00",
    openingBalance: "1250.00",
    currency: "USD",
    warningThreshold: "20",
    artwork,
  });
  await recordTransaction(
    page,
    longGoalName,
    "withdrawal",
    "100.00",
    longReason,
  );
  await createGoal(page, {
    name: "Japan trip",
    target: "500000",
    openingBalance: "175000",
    currency: "JPY",
    warningThreshold: "20",
  });

  const longGoal = goalCard(page, longGoalName);
  const activityDisclosure = longGoal.locator(".activity-disclosure__trigger");
  await expect(activityDisclosure).toHaveAccessibleName("Show 2 activities");
  await expect(activityDisclosure).toHaveAttribute("aria-expanded", "false");
  await expect(activityList(page, longGoalName)).toHaveCount(0);
  await assertActionGeometry(page, longGoal);

  if (testInfo.project.name === "reduced-motion-chromium") {
    await expect(longGoal.locator(".activity-disclosure")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
  }

  await expectNoHorizontalOverflow(page);
  const fillWidths = await page
    .getByTestId("progress-fill")
    .evaluateAll((fills) =>
      fills.map((fill) => fill.getBoundingClientRect().width),
    );
  expect(fillWidths).toHaveLength(2);
  expect(fillWidths.every((width) => width > 0)).toBe(true);

  const artworkBox = await longGoal
    .locator(".goal-card__artwork")
    .boundingBox();
  const artworkImageBox = await longGoal
    .getByRole("img", { name: `${longGoalName} goal artwork` })
    .boundingBox();
  expect(artworkBox).not.toBeNull();
  expect(artworkImageBox).not.toBeNull();
  expect(artworkBox!.width).toBeGreaterThanOrEqual(160);
  expect(artworkBox!.width / artworkBox!.height).toBeCloseTo(2, 2);
  expect(artworkImageBox!.width).toBe(128);
  expect(artworkImageBox!.height).toBe(64);

  await page.screenshot({
    path: `test-results/session-17-${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });

  await activityDisclosure.click();
  const expandedActivity = activityList(page, longGoalName);
  await expect(expandedActivity.getByRole("listitem")).toHaveCount(2);
  const longReasonElement = page.getByTestId("withdrawal-reason");
  await expect(longReasonElement).toHaveText(longReason);
  await expect(
    longReasonElement.locator("..").getByText("Reason", { exact: true }),
  ).toBeVisible();
  const longReasonBox = await longReasonElement.boundingBox();
  const longReasonAmountBox = await longReasonElement
    .locator("xpath=ancestor::li[1]")
    .locator(".activity-list__amount")
    .boundingBox();
  const viewport = page.viewportSize();
  expect(longReasonBox).not.toBeNull();
  expect(longReasonAmountBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(longReasonBox!.x).toBeGreaterThanOrEqual(0);
  expect(longReasonBox!.x + longReasonBox!.width).toBeLessThanOrEqual(
    viewport!.width,
  );
  expect(longReasonBox!.height).toBeGreaterThan(20);
  expect(longReasonBox!.x + longReasonBox!.width).toBeLessThanOrEqual(
    longReasonAmountBox!.x,
  );
  await assertWithinViewport(page, expandedActivity);

  await page.screenshot({
    path: `test-results/session-17-${testInfo.project.name}-expanded-activity.png`,
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Add transaction for Japan trip" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await expect(dialog).toBeInViewport();
  await assertDialogGeometry(page, dialog, testInfo.project.name);
  if (testInfo.project.name === "reduced-motion-chromium") {
    await expect(page.locator(".dialog-backdrop")).toHaveAttribute(
      "data-motion",
      "reduced",
    );
  }
  await page.screenshot({
    path: `test-results/session-17-${testInfo.project.name}-transaction-sheet.png`,
  });

  await dialog.getByRole("button", { name: "Withdrawal" }).click();
  await dialog.getByRole("textbox", { name: "Amount" }).fill("50000");
  if (testInfo.project.name === "reduced-motion-chromium") {
    await expect(
      dialog.locator('[data-motion-region="withdrawal-reason"]'),
    ).toHaveAttribute("data-motion", "reduced");
    await expect(
      dialog.locator('[data-motion-region="transaction-preview"]'),
    ).toHaveAttribute("data-motion", "reduced");
    await expect(
      dialog.getByRole("button", { name: "Withdrawal", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await dialog.getByRole("button", { name: "Record withdrawal" }).click();
  const warning = page.getByRole("dialog", {
    name: "Confirm large withdrawal",
  });
  await assertDialogGeometry(page, warning, testInfo.project.name);
  await page.screenshot({
    path: `test-results/session-17-${testInfo.project.name}-warning-dialog.png`,
  });
  await warning.getByRole("button", { name: "Keep savings" }).click();
  await expect(warning).toHaveCount(0);

  const replacementArtwork = await generatedArtwork(page, {
    name: "processing.png",
    mimeType: "image/png",
    width: 256,
    height: 128,
  });
  await delayImageDecoding(page);
  await page.getByRole("button", { name: `Edit ${longGoalName}` }).click();
  const editDialog = page.getByRole("dialog", { name: "Edit saving goal" });
  await editDialog
    .getByLabel("Replace artwork")
    .setInputFiles(replacementArtwork);
  const artworkStage = editDialog.getByTestId("goal-artwork-stage");
  await expect(artworkStage).toHaveAttribute("data-state", "processing");
  await expect(editDialog.getByRole("status")).toContainText(
    "Processing artwork",
  );
  await expect(
    editDialog.getByRole("button", { name: "Save changes" }),
  ).toBeDisabled();
  if (testInfo.project.name === "reduced-motion-chromium") {
    await expect(artworkStage).toHaveAttribute("data-motion", "reduced");
  }
  await page.screenshot({
    path: `test-results/session-17-${testInfo.project.name}-artwork-processing.png`,
  });
  await page.keyboard.press("Escape");
});

interface GoalInput {
  readonly name: string;
  readonly target: string;
  readonly openingBalance: string;
  readonly currency: string;
  readonly warningThreshold: string;
  readonly artwork?: ArtworkFile;
}

interface ArtworkFile {
  readonly name: string;
  readonly mimeType: string;
  readonly buffer: Buffer;
}

async function createGoal(page: Page, input: GoalInput): Promise<void> {
  await page.getByRole("button", { name: "Add goal" }).click();
  const dialog = page.getByRole("dialog", { name: "Create a saving goal" });

  await dialog.getByRole("textbox", { name: "Goal name" }).fill(input.name);
  await dialog
    .getByRole("textbox", { name: "Target amount" })
    .fill(input.target);
  await dialog
    .getByRole("textbox", { name: "Opening balance" })
    .fill(input.openingBalance);
  await dialog.getByRole("textbox", { name: "Currency" }).fill(input.currency);
  await dialog
    .getByRole("spinbutton", { name: "Withdrawal warning threshold (%)" })
    .fill(input.warningThreshold);
  if (input.artwork !== undefined) {
    await dialog
      .getByLabel("Goal artwork (optional)")
      .setInputFiles(input.artwork);
    await expect(
      dialog.getByRole("img", { name: "Goal artwork preview" }),
    ).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Create goal" }).click();
  await expect(dialog).toHaveCount(0);
}

function goalCard(page: Page, goalName: string) {
  return page.getByRole("article", { name: goalName });
}

function goalBalance(page: Page, goalName: string) {
  return goalCard(page, goalName).locator(".goal-card__balance strong");
}

function goalArtwork(page: Page, goalName: string) {
  return goalCard(page, goalName).locator(".goal-card__artwork img");
}

function activityList(page: Page, goalName: string) {
  return page.getByRole("list", { name: `Activity for ${goalName}` });
}

async function expandActivity(
  page: Page,
  goalName: string,
  count: number,
): Promise<void> {
  const card = goalCard(page, goalName);
  const disclosure = card.locator(".activity-disclosure__trigger");
  await expect(disclosure).toHaveAccessibleName(`Show ${count} activities`);
  await disclosure.click();
  await expect(disclosure).toHaveAccessibleName("Hide activity");
  await expect(disclosure).toHaveAttribute("aria-expanded", "true");
  await expect(activityList(page, goalName)).toBeVisible();
}

async function expandActivityWithKeyboard(
  page: Page,
  goalName: string,
  count: number,
): Promise<void> {
  const disclosure = goalCard(page, goalName).locator(
    ".activity-disclosure__trigger",
  );
  await expect(disclosure).toHaveAccessibleName(`Show ${count} activities`);
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(activityList(page, goalName)).toBeVisible();
}

async function generatedArtwork(
  page: Page,
  input: {
    readonly name: string;
    readonly mimeType: "image/png" | "image/jpeg" | "image/webp";
    readonly width: number;
    readonly height: number;
  },
): Promise<ArtworkFile> {
  const dataUrl = await page.evaluate(({ width, height, mimeType }) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) {
      throw new Error("Canvas is unavailable.");
    }

    context.fillStyle = "#f45d48";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#1d6b4f";
    context.fillRect(0, 0, Math.ceil(width / 2), Math.ceil(height / 2));
    return canvas.toDataURL(mimeType);
  }, input);

  return {
    name: input.name,
    mimeType: input.mimeType,
    buffer: Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64"),
  };
}

async function expectNormalizedArtwork(
  page: Page,
  goalName: string,
  width: number,
  height: number,
): Promise<string> {
  const artwork = goalArtwork(page, goalName);
  await expect(artwork).toHaveAttribute("src", /^data:image\/png;base64,/);
  await expect
    .poll(() =>
      artwork.evaluate((image: HTMLImageElement) => ({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })),
    )
    .toEqual({ width, height });
  return (await artwork.getAttribute("src"))!;
}

async function expectArtworkAspectRatio(
  page: Page,
  goalName: string,
  expectedRatio: number,
): Promise<void> {
  await expect
    .poll(async () => {
      const box = await goalCard(page, goalName)
        .locator(".goal-card__artwork")
        .boundingBox();
      return box === null ? 0 : box.width / box.height;
    })
    .toBeCloseTo(expectedRatio, 2);
}

async function chooseFileWithKeyboard(
  page: Page,
  input: ReturnType<Page["getByLabel"]>,
  artwork: ArtworkFile,
): Promise<void> {
  await input.focus();
  await expect(input).toBeFocused();
  await input.setInputFiles(artwork);
  await expect(
    page.getByRole("img", { name: "Goal artwork preview" }),
  ).toBeVisible();
}

async function recordWithdrawalWithKeyboard(
  page: Page,
  goalName: string,
  amount: string,
  reason: string,
): Promise<void> {
  await page
    .getByRole("button", { name: `Add transaction for ${goalName}` })
    .focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await dialog.getByRole("button", { name: "Withdrawal" }).focus();
  await page.keyboard.press("Enter");
  await dialog.getByRole("textbox", { name: "Amount" }).focus();
  await page.keyboard.type(amount);
  await dialog.getByRole("textbox", { name: "Reason (optional)" }).focus();
  await page.keyboard.type(reason);
  await dialog.getByRole("button", { name: "Record withdrawal" }).focus();
  await page.keyboard.press("Enter");
}

async function recordDepositWithKeyboard(
  page: Page,
  goalName: string,
  amount: string,
): Promise<void> {
  const trigger = page.getByRole("button", {
    name: `Add transaction for ${goalName}`,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await dialog.getByRole("textbox", { name: "Amount" }).fill(amount);
  await dialog.getByRole("button", { name: "Record deposit" }).focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toBeFocused();
}

async function assertActionGeometry(page: Page, card: Locator): Promise<void> {
  const viewport = page.viewportSize();
  const actionBoxes = await card
    .locator(".goal-card__actions > *")
    .evaluateAll((controls) =>
      controls.map((control) => {
        const box = control.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
  expect(viewport).not.toBeNull();
  expect(actionBoxes).toHaveLength(3);
  expect(new Set(actionBoxes.map((box) => Math.round(box.y))).size).toBe(1);
  expect(
    actionBoxes.every(
      (box) =>
        box.x >= 0 &&
        box.x + box.width <= viewport!.width &&
        box.width > 0 &&
        box.height >= 44,
    ),
  ).toBe(true);
}

async function assertWithinViewport(
  page: Page,
  locator: Locator,
): Promise<void> {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  await expectNoHorizontalOverflow(page);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.locator("body").evaluate((body) => {
    const viewportWidth = document.documentElement.clientWidth;
    return Array.from(body.querySelectorAll("*"))
      .map((element) => {
        const box = element.getBoundingClientRect();
        return {
          element: `${element.tagName.toLowerCase()}.${element.className}`,
          left: box.left,
          right: box.right,
        };
      })
      .filter(({ left, right }) => left < -0.5 || right > viewportWidth + 0.5);
  });

  expect(overflow).toEqual([]);
}

async function assertDialogGeometry(
  page: Page,
  dialog: Locator,
  projectName: string,
): Promise<void> {
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  await expect
    .poll(async () => {
      const currentBox = await dialog.boundingBox();
      if (currentBox === null) {
        return Number.POSITIVE_INFINITY;
      }

      return projectName === "mobile-chromium"
        ? Math.abs(currentBox.y + currentBox.height - viewport!.height)
        : Math.abs(currentBox.y + currentBox.height / 2 - viewport!.height / 2);
    })
    .toBeLessThanOrEqual(geometryTolerancePixels);

  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);

  if (projectName === "mobile-chromium") {
    expect(Math.abs(box!.x)).toBeLessThanOrEqual(geometryTolerancePixels);
    expect(Math.abs(box!.width - viewport!.width)).toBeLessThanOrEqual(
      geometryTolerancePixels,
    );
    expect(
      Math.abs(box!.y + box!.height - viewport!.height),
    ).toBeLessThanOrEqual(geometryTolerancePixels);
    const paddingBottom = await dialog.evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).paddingBottom),
    );
    expect(paddingBottom).toBeGreaterThanOrEqual(24);
  } else {
    expect(box!.width).toBeLessThanOrEqual(544);
    expect(
      Math.abs(box!.x + box!.width / 2 - viewport!.width / 2),
    ).toBeLessThanOrEqual(geometryTolerancePixels);
    expect(
      Math.abs(box!.y + box!.height / 2 - viewport!.height / 2),
    ).toBeLessThanOrEqual(geometryTolerancePixels);
    expect(box!.height).toBeLessThanOrEqual(viewport!.height - 32);
  }
}

async function delayImageDecoding(page: Page): Promise<void> {
  await page.evaluate(() => {
    const originalCreateImageBitmap = window.createImageBitmap.bind(window);
    const delayedCreateImageBitmap = async (
      image: ImageBitmapSource,
      options?: ImageBitmapOptions,
    ) => {
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
      return options === undefined
        ? originalCreateImageBitmap(image)
        : originalCreateImageBitmap(image, options);
    };
    window.createImageBitmap =
      delayedCreateImageBitmap as typeof window.createImageBitmap;
  });
}

async function recordTransaction(
  page: Page,
  goalName: string,
  mode: "deposit" | "withdrawal",
  amount: string,
  reason?: string,
): Promise<void> {
  await page
    .getByRole("button", { name: `Add transaction for ${goalName}` })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await dialog
    .getByRole("button", {
      name: mode === "deposit" ? "Deposit" : "Withdrawal",
      exact: true,
    })
    .click();
  await dialog.getByRole("textbox", { name: "Amount" }).fill(amount);
  if (mode === "withdrawal" && reason !== undefined) {
    await dialog
      .getByRole("textbox", { name: "Reason (optional)" })
      .fill(reason);
  }
  await dialog.getByRole("button", { name: `Record ${mode}` }).click();
}

async function observeCompletionAccent(
  progress: ReturnType<Page["getByRole"]>,
): Promise<void> {
  await progress.evaluate((element) => {
    const recordPlayingState = () => {
      if (element.getAttribute("data-completion-accent") === "playing") {
        element.setAttribute("data-observed-completion-accent", "playing");
      }
    };
    const observer = new MutationObserver(recordPlayingState);
    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-completion-accent"],
    });
    recordPlayingState();
  });
}

async function storedRawValue(page: Page): Promise<string | null> {
  return page.evaluate((key) => localStorage.getItem(key), storageKey);
}

async function storedGoalCount(page: Page): Promise<number> {
  return storedCollectionCount(page, "goals");
}

async function storedEnvelopeVersion(page: Page): Promise<number> {
  return page.evaluate((key) => {
    const rawValue = localStorage.getItem(key);
    return rawValue === null
      ? -1
      : (JSON.parse(rawValue) as { version: number }).version;
  }, storageKey);
}

async function storedGoalIcon(
  page: Page,
  goalName: string,
): Promise<string | undefined> {
  return page.evaluate(
    ({ key, name }) => {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) {
        return undefined;
      }

      const envelope = JSON.parse(rawValue) as {
        state: { goals: { name: string; iconDataUrl?: string }[] };
      };
      return envelope.state.goals.find((goal) => goal.name === name)
        ?.iconDataUrl;
    },
    { key: storageKey, name: goalName },
  );
}

async function storedTransactionCount(page: Page): Promise<number> {
  return storedCollectionCount(page, "transactions");
}

async function storedCollectionCount(
  page: Page,
  collection: "goals" | "transactions",
): Promise<number> {
  return page.evaluate(
    ({ key, collectionName }) => {
      const rawValue = localStorage.getItem(key);
      if (rawValue === null) {
        return -1;
      }

      const envelope = JSON.parse(rawValue) as {
        state: { goals: unknown[]; transactions: unknown[] };
      };
      return envelope.state[collectionName].length;
    },
    { key: storageKey, collectionName: collection },
  );
}
