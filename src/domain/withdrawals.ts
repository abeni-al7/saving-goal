export interface WithdrawalInput {
  readonly amountMinorUnits: number;
  readonly currentBalanceMinorUnits: number;
  readonly warningThresholdPercent: number;
}

export interface WithdrawalEvaluation {
  readonly requiresConfirmation: boolean;
  readonly projectedBalanceMinorUnits: number;
  readonly impactPercent: number;
}

export function evaluateWithdrawal(
  input: WithdrawalInput,
): WithdrawalEvaluation {
  validateInput(input);

  if (input.amountMinorUnits > input.currentBalanceMinorUnits) {
    throw new Error("Withdrawal cannot exceed the current balance.");
  }

  const amount = BigInt(input.amountMinorUnits);
  const balance = BigInt(input.currentBalanceMinorUnits);
  const threshold = BigInt(input.warningThresholdPercent);
  const impactBasisPoints = (amount * 10_000n) / balance;

  return {
    requiresConfirmation: amount * 100n > balance * threshold,
    projectedBalanceMinorUnits:
      input.currentBalanceMinorUnits - input.amountMinorUnits,
    impactPercent: Number(impactBasisPoints) / 100,
  };
}

function validateInput(input: WithdrawalInput): void {
  if (
    !Number.isSafeInteger(input.amountMinorUnits) ||
    input.amountMinorUnits <= 0
  ) {
    throw new Error("Withdrawal amount must be a positive safe integer.");
  }

  if (
    !Number.isSafeInteger(input.currentBalanceMinorUnits) ||
    input.currentBalanceMinorUnits < 0
  ) {
    throw new Error("Current balance must be a nonnegative safe integer.");
  }

  if (
    !Number.isInteger(input.warningThresholdPercent) ||
    input.warningThresholdPercent < 0 ||
    input.warningThresholdPercent > 100
  ) {
    throw new Error(
      "Warning threshold must be a whole percentage from 0 to 100.",
    );
  }
}
