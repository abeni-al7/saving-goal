import type { Goal } from "./types";

export interface GoalProgress {
  readonly percentage: number;
  readonly fillPercent: number;
  readonly isComplete: boolean;
}

export function calculateProgress(
  balanceMinorUnits: number,
  targetMinorUnits: number,
): GoalProgress {
  if (!Number.isSafeInteger(balanceMinorUnits) || balanceMinorUnits < 0) {
    throw new Error("Balance must be a nonnegative safe integer.");
  }

  if (!Number.isSafeInteger(targetMinorUnits) || targetMinorUnits <= 0) {
    throw new Error("Target must be a positive safe integer.");
  }

  const percentage = Number(
    (BigInt(balanceMinorUnits) * 100n) / BigInt(targetMinorUnits),
  );

  return {
    percentage,
    fillPercent: Math.min(percentage, 100),
    isComplete: balanceMinorUnits >= targetMinorUnits,
  };
}

export function recordFirstCompletion(
  goal: Goal,
  balanceMinorUnits: number,
  now: () => string,
): Goal {
  if (
    goal.completedAt !== undefined ||
    balanceMinorUnits < goal.targetMinorUnits
  ) {
    return goal;
  }

  return { ...goal, completedAt: now() };
}
