import { describe, expect, it } from "vitest";
import type { DomainProviders } from "../domain/goals";
import type { GoalId } from "../domain/types";
import {
  createInitialSavingsReducerState,
  createSavingsReducer,
  type SavingsReducerState,
} from "./savings-reducer";

function providers(): DomainProviders {
  let id = 0;

  return {
    createId: () => `id-${++id}`,
    now: () => "2026-08-09T12:00:00.000Z",
  };
}

function stateWithGoal(): {
  state: SavingsReducerState;
  reducer: ReturnType<typeof createSavingsReducer>;
  goalId: GoalId;
} {
  const reducer = createSavingsReducer(providers());
  const state = reducer(createInitialSavingsReducerState(), {
    type: "goal/create",
    input: {
      name: "Emergency fund",
      targetAmount: "100.00",
      openingBalanceAmount: "50.00",
      currency: "USD",
      withdrawalWarningPercent: 20,
    },
  });

  return { state, reducer, goalId: state.savings.goals[0].id };
}

describe("savings reducer", () => {
  it("creates a goal with its opening transaction", () => {
    const { state } = stateWithGoal();

    expect(state.savings.goals).toHaveLength(1);
    expect(state.savings.transactions).toEqual([
      expect.objectContaining({ kind: "opening", amountMinorUnits: 5000 }),
    ]);
    expect(state.revision).toBe(1);
  });

  it("edits only mutable goal fields", () => {
    const { state, reducer, goalId } = stateWithGoal();

    const edited = reducer(state, {
      type: "goal/edit",
      goalId,
      input: {
        name: "Rainy day fund",
        targetAmount: "120.00",
        withdrawalWarningPercent: 15,
      },
    });

    expect(edited.savings.goals[0]).toEqual({
      ...state.savings.goals[0],
      name: "Rainy day fund",
      targetMinorUnits: 12_000,
      withdrawalWarningPercent: 15,
    });
    expect(edited.revision).toBe(2);
  });

  it("records a deposit and first completion together", () => {
    const { state, reducer, goalId } = stateWithGoal();

    const deposited = reducer(state, {
      type: "transaction/deposit",
      goalId,
      amountMinorUnits: 5000,
    });

    expect(deposited.savings.transactions.at(-1)).toEqual(
      expect.objectContaining({ kind: "deposit", amountMinorUnits: 5000 }),
    );
    expect(deposited.savings.goals[0].completedAt).toBe(
      "2026-08-09T12:00:00.000Z",
    );

    const overfunded = reducer(deposited, {
      type: "transaction/deposit",
      goalId,
      amountMinorUnits: 100,
    });
    expect(overfunded.savings.goals[0].completedAt).toBe(
      deposited.savings.goals[0].completedAt,
    );
  });

  it("records an ordinary withdrawal immediately", () => {
    const { state, reducer, goalId } = stateWithGoal();

    const withdrawn = reducer(state, {
      type: "withdrawal/request",
      goalId,
      amountMinorUnits: 1000,
      reason: "  New brake pads  ",
    });

    expect(withdrawn.pendingWithdrawal).toBeNull();
    expect(withdrawn.savings.transactions.at(-1)).toEqual(
      expect.objectContaining({
        kind: "withdrawal",
        amountMinorUnits: 1000,
        reason: "New brake pads",
      }),
    );
  });

  it("stages a warned withdrawal until it is confirmed exactly once", () => {
    const { state, reducer, goalId } = stateWithGoal();

    const warned = reducer(state, {
      type: "withdrawal/request",
      goalId,
      amountMinorUnits: 1001,
      reason: "  Urgent repair  ",
    });

    expect(warned.savings).toBe(state.savings);
    expect(warned.pendingWithdrawal).toEqual({
      goalId,
      amountMinorUnits: 1001,
      projectedBalanceMinorUnits: 3999,
      impactPercent: 20.02,
      reason: "Urgent repair",
    });

    const confirmed = reducer(warned, { type: "withdrawal/confirm" });
    expect(confirmed.pendingWithdrawal).toBeNull();
    expect(confirmed.savings.transactions).toHaveLength(
      state.savings.transactions.length + 1,
    );
    expect(confirmed.savings.transactions.at(-1)).toEqual(
      expect.objectContaining({
        kind: "withdrawal",
        reason: "Urgent repair",
      }),
    );
  });

  it("cancels a warned withdrawal reason without changing savings", () => {
    const { state, reducer, goalId } = stateWithGoal();
    const warned = reducer(state, {
      type: "withdrawal/request",
      goalId,
      amountMinorUnits: 1001,
      reason: "Unexpected expense",
    });

    const canceled = reducer(warned, { type: "withdrawal/cancel" });

    expect(canceled.pendingWithdrawal).toBeNull();
    expect(canceled.savings).toBe(state.savings);
    expect(canceled.revision).toBe(state.revision);
  });

  it("rejects an overdraft without changing state", () => {
    const { state, reducer, goalId } = stateWithGoal();

    expect(() =>
      reducer(state, {
        type: "withdrawal/request",
        goalId,
        amountMinorUnits: 5001,
      }),
    ).toThrow("Withdrawal cannot exceed the current balance.");
    expect(state.savings.transactions).toHaveLength(1);
  });

  it("deletes a goal and its transaction history", () => {
    const { state, reducer, goalId } = stateWithGoal();

    const deleted = reducer(state, { type: "goal/delete", goalId });

    expect(deleted.savings).toEqual({ goals: [], transactions: [] });
  });

  it("resets all savings data", () => {
    const { state, reducer } = stateWithGoal();

    const reset = reducer(state, { type: "savings/reset" });

    expect(reset.savings).toEqual({ goals: [], transactions: [] });
    expect(reset.pendingWithdrawal).toBeNull();
    expect(reset.revision).toBe(2);
  });

  it("updates storage status without marking savings data as changed", () => {
    const { state, reducer } = stateWithGoal();
    const status = {
      kind: "save-error" as const,
      reason: "quota-exceeded" as const,
      message: "Changes could not be saved because storage is full.",
    };

    const failed = reducer(state, { type: "storage/status", status });

    expect(failed.storageStatus).toEqual(status);
    expect(failed.revision).toBe(state.revision);
    expect(failed.savings).toBe(state.savings);
  });
});
