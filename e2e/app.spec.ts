import { expect, test } from "@playwright/test";

test("shows the application heading", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Saving goals" }),
  ).toBeVisible();
});
