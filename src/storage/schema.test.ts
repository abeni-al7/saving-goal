import { describe, expect, it } from "vitest";
import { migrateSavingsEnvelope } from "./schema";

describe("storage schema", () => {
  it("accepts a valid version-one envelope", () => {
    const envelope = {
      version: 1,
      state: {
        goals: [
          {
            id: "goal-1",
            name: "Emergency fund",
            targetMinorUnits: 500_000,
            currency: "USD",
            withdrawalWarningPercent: 20,
            createdAt: "2026-08-09T12:00:00.000Z",
          },
        ],
        transactions: [
          {
            id: "transaction-1",
            goalId: "goal-1",
            kind: "opening",
            amountMinorUnits: 10_000,
            occurredAt: "2026-08-09T12:00:00.000Z",
          },
        ],
      },
    };

    expect(migrateSavingsEnvelope(envelope)).toEqual({
      success: true,
      envelope,
    });
  });

  it("rejects schema-invalid version-one data", () => {
    const result = migrateSavingsEnvelope({
      version: 1,
      state: { goals: [], transactions: "not-an-array" },
    });

    expect(result).toMatchObject({
      success: false,
      reason: "invalid-data",
    });
  });

  it("rejects unknown future versions without interpreting their data", () => {
    expect(
      migrateSavingsEnvelope({ version: 2, state: { future: true } }),
    ).toEqual({
      success: false,
      reason: "unsupported-version",
      version: 2,
    });
  });
});
