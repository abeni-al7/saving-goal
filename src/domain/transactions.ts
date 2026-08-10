import type { DomainProviders } from "./goals";
import type {
  GoalId,
  SavingsState,
  Transaction,
  TransactionId,
  TransactionKind,
} from "./types";

type RecordableTransactionKind = Exclude<TransactionKind, "opening">;

export const MAX_WITHDRAWAL_REASON_LENGTH = 160;

export type RecordTransactionInput =
  | {
      readonly goalId: GoalId;
      readonly kind: "deposit";
      readonly amountMinorUnits: number;
      readonly reason?: never;
    }
  | {
      readonly goalId: GoalId;
      readonly kind: "withdrawal";
      readonly amountMinorUnits: number;
      readonly reason?: string;
    };

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

  projectTransactionBalance(
    deriveBalance(input.goalId, state.transactions),
    input.kind,
    input.amountMinorUnits,
  );

  const reason =
    input.kind === "withdrawal"
      ? normalizeWithdrawalReason(input.reason)
      : undefined;

  const transaction: Transaction = {
    id: providers.createId() as TransactionId,
    goalId: input.goalId,
    kind: input.kind,
    amountMinorUnits: input.amountMinorUnits,
    occurredAt: providers.now(),
    ...(reason === undefined ? {} : { reason }),
  };

  return {
    ...state,
    transactions: [...state.transactions, transaction],
  };
}

export function normalizeWithdrawalReason(
  reason: string | undefined,
): string | undefined {
  const normalized = reason?.trim();

  if (normalized === undefined || normalized.length === 0) {
    return undefined;
  }

  if (normalized.length > MAX_WITHDRAWAL_REASON_LENGTH) {
    throw new Error(
      `Withdrawal reason must be ${MAX_WITHDRAWAL_REASON_LENGTH} characters or fewer.`,
    );
  }

  return normalized;
}

export function projectTransactionBalance(
  currentBalanceMinorUnits: number,
  kind: RecordableTransactionKind,
  amountMinorUnits: number,
): number {
  if (!Number.isSafeInteger(currentBalanceMinorUnits)) {
    throw new Error("Current balance must be a safe integer.");
  }

  if (!Number.isSafeInteger(amountMinorUnits) || amountMinorUnits <= 0) {
    throw new Error("Transaction amount must be a positive safe integer.");
  }

  const currentBalance = BigInt(currentBalanceMinorUnits);
  const amount = BigInt(amountMinorUnits);
  const projectedBalance =
    kind === "deposit" ? currentBalance + amount : currentBalance - amount;

  if (
    projectedBalance > BigInt(Number.MAX_SAFE_INTEGER) ||
    projectedBalance < BigInt(Number.MIN_SAFE_INTEGER)
  ) {
    throw new Error("Projected balance is outside the safe integer range.");
  }

  return Number(projectedBalance);
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
