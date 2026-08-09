import { expect, type Page, test } from "@playwright/test";

const storageKey = "saving-goal:state";

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

  const activity = page.getByRole("list", {
    name: "Activity for Emergency fund",
  });
  await expect(activity.getByText("Deposit", { exact: true })).toBeVisible();
  await expect(activity.getByText("$40.00", { exact: true })).toBeVisible();
  await expect(activity.getByText("Withdrawal", { exact: true })).toBeVisible();
  await expect(activity.getByText("-$10.00", { exact: true })).toBeVisible();
  await expect(activity.getByRole("listitem")).toHaveCount(3);
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
    page
      .getByRole("list", { name: "Activity for Emergency fund" })
      .getByRole("listitem"),
  ).toHaveCount(1);

  await recordTransaction(page, "Emergency fund", "withdrawal", "30.00");
  await warning.getByRole("button", { name: "Confirm withdrawal" }).click();

  await expect(goalBalance(page, "Emergency fund")).toHaveText("$70.00");
  await expect(
    page
      .getByRole("list", { name: "Activity for Emergency fund" })
      .getByRole("listitem"),
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

test("fits progress visuals and dialog framing at the configured viewport", async ({
  page,
}, testInfo) => {
  await createGoal(page, {
    name: "A very long professional laptop replacement fund",
    target: "1000.00",
    openingBalance: "1250.00",
    currency: "USD",
    warningThreshold: "20",
  });
  await createGoal(page, {
    name: "Japan trip",
    target: "500000",
    openingBalance: "175000",
    currency: "JPY",
    warningThreshold: "20",
  });

  await expect(page.locator("html")).toHaveJSProperty(
    "scrollWidth",
    await page.locator("html").evaluate((element) => element.clientWidth),
  );
  const fillWidths = await page
    .getByTestId("progress-fill")
    .evaluateAll((fills) =>
      fills.map((fill) => fill.getBoundingClientRect().width),
    );
  expect(fillWidths).toHaveLength(2);
  expect(fillWidths.every((width) => width > 0)).toBe(true);

  await page.screenshot({
    path: `test-results/session-8-${testInfo.project.name}-dashboard.png`,
    fullPage: true,
  });

  await page
    .getByRole("button", { name: "Add transaction for Japan trip" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add transaction" });
  await expect(dialog).toBeInViewport();
  const dialogBox = await dialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.y).toBeGreaterThanOrEqual(0);
  expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(viewport!.width);
  expect(dialogBox!.y + dialogBox!.height).toBeLessThanOrEqual(
    viewport!.height,
  );
  await page.screenshot({
    path: `test-results/session-8-${testInfo.project.name}-dialog.png`,
  });
});

interface GoalInput {
  readonly name: string;
  readonly target: string;
  readonly openingBalance: string;
  readonly currency: string;
  readonly warningThreshold: string;
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
  await dialog.getByRole("button", { name: "Create goal" }).click();
}

function goalCard(page: Page, goalName: string) {
  return page.getByRole("article", { name: goalName });
}

function goalBalance(page: Page, goalName: string) {
  return goalCard(page, goalName).locator(".goal-card__balance strong");
}

async function recordTransaction(
  page: Page,
  goalName: string,
  mode: "deposit" | "withdrawal",
  amount: string,
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
