import { describe, expect, it } from "vitest";
import { createGoal, type DomainProviders } from "./goals";
import {
  deleteGoal,
  deriveBalance,
  recordTransaction,
  transactionsForGoal,
} from "./transactions";
import type { SavingsState } from "./types";

function providers(id: string, now: string): DomainProviders {
  return { createId: () => id, now: () => now };
}

function stateWithGoal(): SavingsState {
  const { goal, openingTransaction } = createGoal(
    {
      name: "Emergency fund",
      targetAmount: "1000",
      openingBalanceAmount: "100",
      currency: "USD",
    },
    (() => {
      const ids = ["goal-1", "opening-1"];
      let index = 0;
      return {
        createId: () => ids[index++] ?? "unexpected-id",
        now: () => "2026-08-09T09:00:00.000Z",
      };
    })(),
  );

  return { goals: [goal], transactions: [openingTransaction] };
}

describe("transactions", () => {
  it("records deposits and withdrawals without mutating prior state", () => {
    const initialState = stateWithGoal();
    const goalId = initialState.goals[0].id;
    const afterDeposit = recordTransaction(
      initialState,
      { goalId, kind: "deposit", amountMinorUnits: 2500 },
      providers("deposit-1", "2026-08-09T10:00:00.000Z"),
    );
    const afterWithdrawal = recordTransaction(
      afterDeposit,
      { goalId, kind: "withdrawal", amountMinorUnits: 1250 },
      providers("withdrawal-1", "2026-08-09T11:00:00.000Z"),
    );

    expect(initialState.transactions).toHaveLength(1);
    expect(afterWithdrawal.transactions).toHaveLength(3);
    expect(afterWithdrawal.transactions[1]).toMatchObject({
      id: "deposit-1",
      kind: "deposit",
      amountMinorUnits: 2500,
    });
    expect(afterWithdrawal.transactions[2]).toMatchObject({
      id: "withdrawal-1",
      kind: "withdrawal",
      amountMinorUnits: 1250,
    });
  });

  it.each([
    { label: "an omitted reason", reason: undefined },
    { label: "a whitespace-only reason", reason: "   \n  " },
  ])("omits $label from a withdrawal", ({ reason }) => {
    const initialState = stateWithGoal();
    const goalId = initialState.goals[0].id;

    const withdrawn = recordTransaction(
      initialState,
      {
        goalId,
        kind: "withdrawal",
        amountMinorUnits: 100,
        reason,
      },
      providers("withdrawal-reason", "2026-08-09T11:00:00.000Z"),
    );

    expect(withdrawn.transactions.at(-1)).not.toHaveProperty("reason");
  });

  it("trims and records a withdrawal reason up to 160 characters", () => {
    const initialState = stateWithGoal();
    const goalId = initialState.goals[0].id;
    const reason = "r".repeat(160);

    const trimmed = recordTransaction(
      initialState,
      {
        goalId,
        kind: "withdrawal",
        amountMinorUnits: 100,
        reason: "  Planned repair  ",
      },
      providers("withdrawal-trimmed", "2026-08-09T11:00:00.000Z"),
    );
    const atLimit = recordTransaction(
      initialState,
      { goalId, kind: "withdrawal", amountMinorUnits: 100, reason },
      providers("withdrawal-limit", "2026-08-09T11:00:00.000Z"),
    );

    expect(trimmed.transactions.at(-1)).toHaveProperty(
      "reason",
      "Planned repair",
    );
    expect(atLimit.transactions.at(-1)).toHaveProperty("reason", reason);
  });

  it("rejects a withdrawal reason over 160 characters", () => {
    const initialState = stateWithGoal();
    const goalId = initialState.goals[0].id;

    expect(() =>
      recordTransaction(
        initialState,
        {
          goalId,
          kind: "withdrawal",
          amountMinorUnits: 100,
          reason: "r".repeat(161),
        },
        providers("withdrawal-long", "2026-08-09T11:00:00.000Z"),
      ),
    ).toThrow("Withdrawal reason must be 160 characters or fewer.");
  });

  it("derives the balance from the immutable ledger", () => {
    const initialState = stateWithGoal();
    const goalId = initialState.goals[0].id;
    const withDeposit = recordTransaction(
      initialState,
      { goalId, kind: "deposit", amountMinorUnits: 5000 },
      providers("deposit-2", "2026-08-09T10:00:00.000Z"),
    );
    const withWithdrawal = recordTransaction(
      withDeposit,
      { goalId, kind: "withdrawal", amountMinorUnits: 3000 },
      providers("withdrawal-2", "2026-08-09T11:00:00.000Z"),
    );

    expect(deriveBalance(goalId, withWithdrawal.transactions)).toBe(12000);
  });

  it("orders a goal ledger deterministically by timestamp then identifier", () => {
    const state = stateWithGoal();
    const goalId = state.goals[0].id;
    const later = recordTransaction(
      state,
      { goalId, kind: "deposit", amountMinorUnits: 100 },
      providers("transaction-b", "2026-08-09T11:00:00.000Z"),
    );
    const tied = recordTransaction(
      later,
      { goalId, kind: "deposit", amountMinorUnits: 200 },
      providers("transaction-a", "2026-08-09T11:00:00.000Z"),
    );

    expect(
      transactionsForGoal(tied.transactions, goalId).map(
        (transaction) => transaction.id,
      ),
    ).toEqual(["opening-1", "transaction-a", "transaction-b"]);
  });

  it("rejects invalid transaction records", () => {
    const state = stateWithGoal();

    expect(() =>
      recordTransaction(
        state,
        {
          goalId: state.goals[0].id,
          kind: "deposit",
          amountMinorUnits: 0,
        },
        providers("invalid", "2026-08-09T12:00:00.000Z"),
      ),
    ).toThrow("Transaction amount must be a positive safe integer.");
  });

  it("rejects a transaction that would make the balance unsafe", () => {
    const state = stateWithGoal();
    const goalId = state.goals[0].id;
    const nearLimit: SavingsState = {
      ...state,
      transactions: [
        {
          ...state.transactions[0],
          amountMinorUnits: Number.MAX_SAFE_INTEGER - 1,
        },
      ],
    };

    expect(() =>
      recordTransaction(
        nearLimit,
        { goalId, kind: "deposit", amountMinorUnits: 2 },
        providers("overflow", "2026-08-09T12:00:00.000Z"),
      ),
    ).toThrow("Projected balance is outside the safe integer range.");
  });

  it("rejects transactions for a missing goal", () => {
    const state = stateWithGoal();

    expect(() =>
      recordTransaction(
        state,
        {
          goalId: "missing-goal" as (typeof state.goals)[number]["id"],
          kind: "deposit",
          amountMinorUnits: 100,
        },
        providers("invalid", "2026-08-09T12:00:00.000Z"),
      ),
    ).toThrow("Goal does not exist.");
  });

  it("rejects a derived balance outside the safe integer range", () => {
    const state = stateWithGoal();
    const goalId = state.goals[0].id;

    expect(() =>
      deriveBalance(goalId, [
        ...state.transactions,
        {
          id: "huge-deposit" as (typeof state.transactions)[number]["id"],
          goalId,
          kind: "deposit",
          amountMinorUnits: Number.MAX_SAFE_INTEGER,
          occurredAt: "2026-08-09T12:00:00.000Z",
        },
      ]),
    ).toThrow("Derived balance is outside the safe integer range.");
  });

  it("deletes one goal and all of its transactions", () => {
    const firstState = stateWithGoal();
    const second = createGoal(
      {
        name: "Travel",
        targetAmount: "500",
        openingBalanceAmount: "20",
        currency: "EUR",
      },
      (() => {
        const ids = ["goal-2", "opening-2"];
        let index = 0;
        return {
          createId: () => ids[index++] ?? "unexpected-id",
          now: () => "2026-08-09T09:30:00.000Z",
        };
      })(),
    );
    const state = {
      goals: [...firstState.goals, second.goal],
      transactions: [...firstState.transactions, second.openingTransaction],
    };

    const remaining = deleteGoal(state, firstState.goals[0].id);

    expect(remaining.goals).toEqual([second.goal]);
    expect(remaining.transactions).toEqual([second.openingTransaction]);
    expect(state.goals).toHaveLength(2);
  });
});
