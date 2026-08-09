import { currencyCode, parseAmountToMinorUnits } from "./money";
import type { Goal, GoalId, Transaction, TransactionId } from "./types";

const DEFAULT_WITHDRAWAL_WARNING_PERCENT = 20;

export interface DomainProviders {
  readonly createId: () => string;
  readonly now: () => string;
}

export interface CreateGoalInput {
  readonly name: string;
  readonly targetAmount: string;
  readonly openingBalanceAmount: string;
  readonly currency: string;
  readonly withdrawalWarningPercent?: number;
}

export interface EditGoalInput {
  readonly name: string;
  readonly targetAmount: string;
  readonly withdrawalWarningPercent: number;
}

export interface CreatedGoal {
  readonly goal: Goal;
  readonly openingTransaction: Transaction;
}

export function createGoal(
  input: CreateGoalInput,
  providers: DomainProviders,
): CreatedGoal {
  const name = validateGoalName(input.name);
  const currency = currencyCode(input.currency);
  const targetMinorUnits = parseAmountToMinorUnits(
    input.targetAmount,
    currency,
  );
  const openingBalanceMinorUnits = parseAmountToMinorUnits(
    input.openingBalanceAmount,
    currency,
    { allowZero: true },
  );
  const withdrawalWarningPercent = validateWarningPercent(
    input.withdrawalWarningPercent ?? DEFAULT_WITHDRAWAL_WARNING_PERCENT,
  );
  const goalId = providers.createId() as GoalId;
  const occurredAt = providers.now();

  return {
    goal: {
      id: goalId,
      name,
      targetMinorUnits,
      currency,
      withdrawalWarningPercent,
      createdAt: occurredAt,
    },
    openingTransaction: {
      id: providers.createId() as TransactionId,
      goalId,
      kind: "opening",
      amountMinorUnits: openingBalanceMinorUnits,
      occurredAt,
    },
  };
}

export function editGoal(goal: Goal, input: EditGoalInput): Goal {
  return {
    ...goal,
    name: validateGoalName(input.name),
    targetMinorUnits: parseAmountToMinorUnits(
      input.targetAmount,
      goal.currency,
    ),
    withdrawalWarningPercent: validateWarningPercent(
      input.withdrawalWarningPercent,
    ),
  };
}

function validateGoalName(value: string): string {
  const name = value.trim();
  if (name.length === 0) {
    throw new Error("Goal name is required.");
  }

  return name;
}

function validateWarningPercent(value: number): number {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new Error(
      "Warning threshold must be a whole percentage from 0 to 100.",
    );
  }

  return value;
}
