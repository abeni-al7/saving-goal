import {
  createGoal,
  editGoal,
  type CreateGoalInput,
  type DomainProviders,
  type EditGoalInput,
} from "../domain/goals";
import { recordFirstCompletion } from "../domain/progress";
import {
  deleteGoal,
  deriveBalance,
  recordTransaction,
} from "../domain/transactions";
import type { GoalId, SavingsState } from "../domain/types";
import { evaluateWithdrawal } from "../domain/withdrawals";
import { emptySavingsState } from "../storage/savings-storage";

export type StorageStatus =
  | { readonly kind: "ready" }
  | {
      readonly kind: "recovery-required";
      readonly reason:
        "malformed-json" | "invalid-data" | "unsupported-version";
      readonly message: string;
    }
  | { readonly kind: "unavailable"; readonly message: string }
  | { readonly kind: "session-only"; readonly message: string }
  | {
      readonly kind: "save-error";
      readonly reason: "invalid-data" | "quota-exceeded" | "unavailable";
      readonly message: string;
    };

export interface PendingWithdrawal {
  readonly goalId: GoalId;
  readonly amountMinorUnits: number;
  readonly projectedBalanceMinorUnits: number;
  readonly impactPercent: number;
}

export interface SavingsReducerState {
  readonly savings: SavingsState;
  readonly pendingWithdrawal: PendingWithdrawal | null;
  readonly storageStatus: StorageStatus;
  readonly revision: number;
}

export type SavingsAction =
  | { readonly type: "goal/create"; readonly input: CreateGoalInput }
  | {
      readonly type: "goal/edit";
      readonly goalId: GoalId;
      readonly input: EditGoalInput;
    }
  | {
      readonly type: "transaction/deposit";
      readonly goalId: GoalId;
      readonly amountMinorUnits: number;
    }
  | {
      readonly type: "withdrawal/request";
      readonly goalId: GoalId;
      readonly amountMinorUnits: number;
    }
  | { readonly type: "withdrawal/confirm" }
  | { readonly type: "withdrawal/cancel" }
  | { readonly type: "goal/delete"; readonly goalId: GoalId }
  | { readonly type: "savings/reset" }
  | {
      readonly type: "storage/status";
      readonly status: StorageStatus;
    };

export function createInitialSavingsReducerState(
  savings: SavingsState = emptySavingsState(),
  storageStatus: StorageStatus = { kind: "ready" },
): SavingsReducerState {
  return {
    savings,
    pendingWithdrawal: null,
    storageStatus,
    revision: 0,
  };
}

export function createSavingsReducer(providers: DomainProviders) {
  return function savingsReducer(
    state: SavingsReducerState,
    action: SavingsAction,
  ): SavingsReducerState {
    switch (action.type) {
      case "goal/create": {
        const created = createGoal(action.input, providers);
        const goal = recordFirstCompletion(
          created.goal,
          created.openingTransaction.amountMinorUnits,
          providers.now,
        );

        return commitSavings(state, {
          goals: [...state.savings.goals, goal],
          transactions: [
            ...state.savings.transactions,
            created.openingTransaction,
          ],
        });
      }

      case "goal/edit": {
        const currentGoal = findGoal(state.savings, action.goalId);
        const editedGoal = editGoal(currentGoal, action.input);
        const balance = deriveBalance(
          action.goalId,
          state.savings.transactions,
        );
        const completedGoal = recordFirstCompletion(
          editedGoal,
          balance,
          providers.now,
        );

        return commitSavings(state, {
          ...state.savings,
          goals: state.savings.goals.map((goal) =>
            goal.id === action.goalId ? completedGoal : goal,
          ),
        });
      }

      case "transaction/deposit": {
        const savings = recordTransaction(
          state.savings,
          {
            goalId: action.goalId,
            kind: "deposit",
            amountMinorUnits: action.amountMinorUnits,
          },
          providers,
        );

        return commitSavings(
          state,
          recordCompletion(savings, action.goalId, providers.now),
        );
      }

      case "withdrawal/request": {
        const goal = findGoal(state.savings, action.goalId);
        const evaluation = evaluateWithdrawal({
          amountMinorUnits: action.amountMinorUnits,
          currentBalanceMinorUnits: deriveBalance(
            action.goalId,
            state.savings.transactions,
          ),
          warningThresholdPercent: goal.withdrawalWarningPercent,
        });

        if (evaluation.requiresConfirmation) {
          return {
            ...state,
            pendingWithdrawal: {
              goalId: action.goalId,
              amountMinorUnits: action.amountMinorUnits,
              projectedBalanceMinorUnits: evaluation.projectedBalanceMinorUnits,
              impactPercent: evaluation.impactPercent,
            },
          };
        }

        return commitSavings(
          state,
          recordWithdrawal(
            state.savings,
            action.goalId,
            action.amountMinorUnits,
            providers,
          ),
        );
      }

      case "withdrawal/confirm": {
        if (state.pendingWithdrawal === null) {
          throw new Error("There is no withdrawal awaiting confirmation.");
        }

        return commitSavings(
          state,
          recordWithdrawal(
            state.savings,
            state.pendingWithdrawal.goalId,
            state.pendingWithdrawal.amountMinorUnits,
            providers,
          ),
        );
      }

      case "withdrawal/cancel":
        return { ...state, pendingWithdrawal: null };

      case "goal/delete":
        findGoal(state.savings, action.goalId);
        return commitSavings(state, deleteGoal(state.savings, action.goalId));

      case "savings/reset":
        return commitSavings(state, emptySavingsState());

      case "storage/status":
        return { ...state, storageStatus: action.status };
    }
  };
}

function findGoal(state: SavingsState, goalId: GoalId) {
  const goal = state.goals.find((candidate) => candidate.id === goalId);
  if (goal === undefined) {
    throw new Error("Goal does not exist.");
  }

  return goal;
}

function recordWithdrawal(
  state: SavingsState,
  goalId: GoalId,
  amountMinorUnits: number,
  providers: DomainProviders,
): SavingsState {
  return recordTransaction(
    state,
    { goalId, kind: "withdrawal", amountMinorUnits },
    providers,
  );
}

function recordCompletion(
  state: SavingsState,
  goalId: GoalId,
  now: () => string,
): SavingsState {
  const balance = deriveBalance(goalId, state.transactions);

  return {
    ...state,
    goals: state.goals.map((goal) =>
      goal.id === goalId ? recordFirstCompletion(goal, balance, now) : goal,
    ),
  };
}

function commitSavings(
  state: SavingsReducerState,
  savings: SavingsState,
): SavingsReducerState {
  return {
    ...state,
    savings,
    pendingWithdrawal: null,
    revision: state.revision + 1,
  };
}
