import { describe, expect, it } from "vitest";
import { createGoal, editGoal, type DomainProviders } from "./goals";

function providers(...ids: string[]): DomainProviders {
  let index = 0;

  return {
    createId: () => ids[index++] ?? "unexpected-id",
    now: () => "2026-08-09T12:00:00.000Z",
  };
}

describe("goals", () => {
  it("creates a goal and its opening-balance transaction", () => {
    const result = createGoal(
      {
        name: "  Emergency fund  ",
        targetAmount: "5000.00",
        openingBalanceAmount: "125.50",
        currency: "USD",
      },
      providers("goal-1", "transaction-1"),
    );

    expect(result.goal).toEqual({
      id: "goal-1",
      name: "Emergency fund",
      targetMinorUnits: 500000,
      currency: "USD",
      withdrawalWarningPercent: 20,
      createdAt: "2026-08-09T12:00:00.000Z",
    });
    expect(result.openingTransaction).toEqual({
      id: "transaction-1",
      goalId: "goal-1",
      kind: "opening",
      amountMinorUnits: 12550,
      occurredAt: "2026-08-09T12:00:00.000Z",
    });
  });

  it("records a zero opening balance as an immutable ledger entry", () => {
    const result = createGoal(
      {
        name: "Travel",
        targetAmount: "800",
        openingBalanceAmount: "0",
        currency: "EUR",
        withdrawalWarningPercent: 35,
      },
      providers("goal-2", "transaction-2"),
    );

    expect(result.goal.withdrawalWarningPercent).toBe(35);
    expect(result.openingTransaction.amountMinorUnits).toBe(0);
  });

  it("edits only the mutable goal fields", () => {
    const { goal } = createGoal(
      {
        name: "Travel",
        targetAmount: "800",
        openingBalanceAmount: "100",
        currency: "EUR",
      },
      providers("goal-3", "transaction-3"),
    );

    const attemptedChanges = {
      name: "Long trip",
      targetAmount: "1200.50",
      withdrawalWarningPercent: 15,
      currency: "JPY",
      openingBalanceAmount: "999",
    };
    const editedGoal = editGoal(goal, attemptedChanges);

    expect(editedGoal).toEqual({
      ...goal,
      name: "Long trip",
      targetMinorUnits: 120050,
      withdrawalWarningPercent: 15,
    });
    expect(goal.name).toBe("Travel");
    expect(editedGoal.currency).toBe("EUR");
  });

  it.each([
    ["blank name", { name: " ", targetAmount: "1" }, "Goal name is required."],
    [
      "zero target",
      { name: "Goal", targetAmount: "0" },
      "Amount must be greater than zero.",
    ],
    [
      "negative opening balance",
      { name: "Goal", targetAmount: "1", openingBalanceAmount: "-1" },
      "Amount cannot be negative.",
    ],
    [
      "invalid warning threshold",
      { name: "Goal", targetAmount: "1", withdrawalWarningPercent: 101 },
      "Warning threshold must be a whole percentage from 0 to 100.",
    ],
  ])("rejects %s", (_label, overrides, expectedMessage) => {
    const validInput = {
      name: "Goal",
      targetAmount: "100",
      openingBalanceAmount: "0",
      currency: "USD",
    };

    expect(() =>
      createGoal(
        {
          ...validInput,
          ...overrides,
        },
        providers("goal-invalid", "transaction-invalid"),
      ),
    ).toThrow(expectedMessage);
  });
});
