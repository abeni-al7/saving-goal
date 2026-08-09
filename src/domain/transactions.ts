import type { DomainProviders } from "./goals";
import type {
  GoalId,
  SavingsState,
  Transaction,
  TransactionId,
  TransactionKind,
} from "./types";

type RecordableTransactionKind = Exclude<TransactionKind, "opening">;

export interface RecordTransactionInput {
  readonly goalId: GoalId;
  readonly kind: RecordableTransactionKind;
  readonly amountMinorUnits: number;
}

export function recordTransaction(
  state: SavingsState,
  input: RecordTransactionInput,
  providers: DomainProviders,
): SavingsState {
  if (!state.goals.some((goal) => goal.id === input.goalId)) {
    throw new Error("Goal does not exist.");
  }

  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0
  ) {
    throw new Error("Transaction amount must be a positive safe integer.");
  }

  const transaction: Transaction = {
    id: providers.createId() as TransactionId,
    goalId: input.goalId,
    kind: input.kind,
    amountMinorUnits: input.amountMinorUnits,
    occurredAt: providers.now(),
  };

  return {
    ...state,
    transactions: [...state.transactions, transaction],
  };
}

export function deriveBalance(
  goalId: GoalId,
  transactions: readonly Transaction[],
): number {
  const balance = transactions
    .filter((transaction) => transaction.goalId === goalId)
    .reduce((total, transaction) => {
      const amount = BigInt(transaction.amountMinorUnits);
      return transaction.kind === "withdrawal"
        ? total - amount
        : total + amount;
    }, 0n);

  if (
    balance > BigInt(Number.MAX_SAFE_INTEGER) ||
    balance < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error("Derived balance is outside the safe integer range.");
  }

  return Number(balance);
}

export function transactionsForGoal(
  transactions: readonly Transaction[],
  goalId: GoalId,
): Transaction[] {
  return transactions
    .filter((transaction) => transaction.goalId === goalId)
    .sort(
      (left, right) =>
        left.occurredAt.localeCompare(right.occurredAt) ||
        left.id.localeCompare(right.id),
    );
}

export function deleteGoal(state: SavingsState, goalId: GoalId): SavingsState {
  return {
    goals: state.goals.filter((goal) => goal.id !== goalId),
    transactions: state.transactions.filter(
      (transaction) => transaction.goalId !== goalId,
    ),
  };
}
