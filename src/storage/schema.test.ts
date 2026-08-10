import { describe, expect, it } from "vitest";
import {
  migrateSavingsEnvelope,
  savingsEnvelopeV1Schema,
  savingsEnvelopeV2Schema,
} from "./schema";

const goal = {
  id: "goal-1",
  name: "Emergency fund",
  targetMinorUnits: 500_000,
  currency: "USD",
  withdrawalWarningPercent: 20,
  createdAt: "2026-08-09T12:00:00.000Z",
};

const openingTransaction = {
  id: "transaction-1",
  goalId: "goal-1",
  kind: "opening",
  amountMinorUnits: 10_000,
  occurredAt: "2026-08-09T12:00:00.000Z",
};

describe("storage schema", () => {
  it("migrates a valid version-one envelope without changing its state", () => {
    const envelope = {
      version: 1,
      state: {
        goals: [goal],
        transactions: [openingTransaction],
      },
    };

    expect(migrateSavingsEnvelope(envelope)).toEqual({
      success: true,
      envelope: { version: 2, state: envelope.state },
    });
  });

  it("accepts version-two optional goal icons and withdrawal reasons", () => {
    const envelope = {
      version: 2,
      state: {
        goals: [{ ...goal, iconDataUrl: "data:image/png;base64,AAAA" }],
        transactions: [
          openingTransaction,
          {
            id: "transaction-2",
            goalId: "goal-1",
            kind: "withdrawal",
            amountMinorUnits: 1_000,
            occurredAt: "2026-08-10T12:00:00.000Z",
            reason: "Emergency repair",
          },
        ],
      },
    };

    expect(savingsEnvelopeV2Schema.safeParse(envelope).success).toBe(true);
    expect(migrateSavingsEnvelope(envelope)).toEqual({
      success: true,
      envelope,
    });
  });

  it.each([
    ["blank withdrawal reasons", { reason: "   " }],
    ["overlength withdrawal reasons", { reason: "r".repeat(161) }],
  ])("rejects %s", (_label, metadata) => {
    const result = savingsEnvelopeV2Schema.safeParse({
      version: 2,
      state: {
        goals: [goal],
        transactions: [
          {
            ...openingTransaction,
            kind: "withdrawal",
            amountMinorUnits: 1_000,
            ...metadata,
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });

  it.each(["opening", "deposit"])(
    "rejects reasons on %s transactions",
    (kind) => {
      const result = savingsEnvelopeV2Schema.safeParse({
        version: 2,
        state: {
          goals: [goal],
          transactions: [
            {
              ...openingTransaction,
              kind,
              amountMinorUnits: kind === "opening" ? 0 : 1_000,
              reason: "Not allowed",
            },
          ],
        },
      });

      expect(result.success).toBe(false);
    },
  );

  it.each([
    ["malformed icon data URLs", "data:image/png;base64,not base64!"],
    ["non-PNG icon data URLs", "data:image/webp;base64,AAAA"],
    [
      "icon payloads over 100 KB",
      `data:image/png;base64,${"A".repeat(102_401)}`,
    ],
  ])("rejects %s", (_label, iconDataUrl) => {
    const result = savingsEnvelopeV2Schema.safeParse({
      version: 2,
      state: {
        goals: [{ ...goal, iconDataUrl }],
        transactions: [openingTransaction],
      },
    });

    expect(result.success).toBe(false);
  });

  it.each([
    ["envelope", { extra: true }],
    ["state", { stateExtra: true }],
    ["goal", { goalExtra: true }],
    ["transaction", { transactionExtra: true }],
  ])("rejects unknown fields on the version-two %s", (location, extra) => {
    const envelope = {
      version: 2,
      state: {
        goals: [{ ...goal }],
        transactions: [{ ...openingTransaction }],
      },
    };

    if (location === "envelope") {
      Object.assign(envelope, extra);
    } else if (location === "state") {
      Object.assign(envelope.state, extra);
    } else if (location === "goal") {
      Object.assign(envelope.state.goals[0], extra);
    } else {
      Object.assign(envelope.state.transactions[0], extra);
    }

    expect(savingsEnvelopeV2Schema.safeParse(envelope).success).toBe(false);
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

  it("keeps version-one validation strict during migration", () => {
    const legacyEnvelopeWithNewMetadata = {
      version: 1,
      state: {
        goals: [{ ...goal, iconDataUrl: "data:image/png;base64,AAAA" }],
        transactions: [openingTransaction],
      },
    };

    expect(
      savingsEnvelopeV1Schema.safeParse(legacyEnvelopeWithNewMetadata).success,
    ).toBe(false);
    expect(migrateSavingsEnvelope(legacyEnvelopeWithNewMetadata)).toMatchObject(
      {
        success: false,
        reason: "invalid-data",
      },
    );
  });

  it("rejects unknown future versions without interpreting their data", () => {
    expect(
      migrateSavingsEnvelope({ version: 9, state: { future: true } }),
    ).toEqual({
      success: false,
      reason: "unsupported-version",
      version: 9,
    });
  });
});
