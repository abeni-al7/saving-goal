import { currencyCode, parseAmountToMinorUnits } from "./money";
import { isNormalizedGoalIconDataUrl } from "./goal-icons";
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
  readonly iconDataUrl?: string;
}

export type GoalArtworkChange =
  | { readonly type: "preserve" }
  | { readonly type: "replace"; readonly iconDataUrl: string }
  | { readonly type: "remove" };

export interface EditGoalInput {
  readonly name: string;
  readonly targetAmount: string;
  readonly withdrawalWarningPercent: number;
  readonly artwork: GoalArtworkChange;
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
  const iconDataUrl = validateOptionalIconDataUrl(input.iconDataUrl);

  return {
    goal: {
      id: goalId,
      name,
      targetMinorUnits,
      currency,
      withdrawalWarningPercent,
      createdAt: occurredAt,
      ...(iconDataUrl === undefined ? {} : { iconDataUrl }),
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
  const artwork = input.artwork;
  const editedGoal: Goal = {
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

  switch (artwork.type) {
    case "preserve":
      return editedGoal;
    case "replace":
      return {
        ...editedGoal,
        iconDataUrl: validateIconDataUrl(artwork.iconDataUrl),
      };
    case "remove": {
      const goalWithoutArtwork = { ...editedGoal };
      delete goalWithoutArtwork.iconDataUrl;
      return goalWithoutArtwork;
    }
  }
}

function validateOptionalIconDataUrl(value: string | undefined) {
  return value === undefined ? undefined : validateIconDataUrl(value);
}

function validateIconDataUrl(value: string): string {
  if (!isNormalizedGoalIconDataUrl(value)) {
    throw new Error("Goal artwork must be a normalized PNG image.");
  }

  return value;
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
