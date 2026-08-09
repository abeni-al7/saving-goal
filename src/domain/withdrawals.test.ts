import { describe, expect, it } from "vitest";
import { evaluateWithdrawal } from "./withdrawals";

describe("withdrawals", () => {
  it("allows an ordinary withdrawal without confirmation", () => {
    expect(
      evaluateWithdrawal({
        amountMinorUnits: 1000,
        currentBalanceMinorUnits: 10000,
        warningThresholdPercent: 20,
      }),
    ).toEqual({
      requiresConfirmation: false,
      projectedBalanceMinorUnits: 9000,
      impactPercent: 10,
    });
  });

  it("does not warn at exactly the configured threshold", () => {
    expect(
      evaluateWithdrawal({
        amountMinorUnits: 2000,
        currentBalanceMinorUnits: 10000,
        warningThresholdPercent: 20,
      }).requiresConfirmation,
    ).toBe(false);
  });

  it("warns above the configured threshold", () => {
    expect(
      evaluateWithdrawal({
        amountMinorUnits: 2001,
        currentBalanceMinorUnits: 10000,
        warningThresholdPercent: 20,
      }),
    ).toEqual({
      requiresConfirmation: true,
      projectedBalanceMinorUnits: 7999,
      impactPercent: 20.01,
    });
  });

  it("rejects a withdrawal from a zero balance", () => {
    expect(() =>
      evaluateWithdrawal({
        amountMinorUnits: 1,
        currentBalanceMinorUnits: 0,
        warningThresholdPercent: 20,
      }),
    ).toThrow("Withdrawal cannot exceed the current balance.");
  });

  it("rejects an overdraft before warning evaluation", () => {
    expect(() =>
      evaluateWithdrawal({
        amountMinorUnits: 10001,
        currentBalanceMinorUnits: 10000,
        warningThresholdPercent: 20,
      }),
    ).toThrow("Withdrawal cannot exceed the current balance.");
  });
});
