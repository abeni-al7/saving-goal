import { z } from "zod";
import { isNormalizedGoalIconDataUrl } from "../domain/goal-icons";
import type { SavingsState } from "../domain/types";

export const SAVINGS_STORAGE_KEY = "saving-goal:state";
export const SAVINGS_SCHEMA_VERSION = 2 as const;

const LEGACY_SAVINGS_SCHEMA_VERSION = 1 as const;
const MAX_WITHDRAWAL_REASON_LENGTH = 160;
const safeInteger = z.number().int().safe();
const timestamp = z.iso.datetime({ offset: true });
const supportedCurrencies = new Set(Intl.supportedValuesOf("currency"));

const goalShape = {
  id: z.string().min(1),
  name: z.string().trim().min(1),
  targetMinorUnits: safeInteger.positive(),
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .refine((value) => supportedCurrencies.has(value)),
  withdrawalWarningPercent: z.number().int().min(0).max(100),
  createdAt: timestamp,
  completedAt: timestamp.optional(),
};

const transactionShape = {
  id: z.string().min(1),
  goalId: z.string().min(1),
  amountMinorUnits: safeInteger,
  occurredAt: timestamp,
};

const openingTransactionSchema = z
  .object({
    ...transactionShape,
    kind: z.literal("opening"),
    amountMinorUnits: transactionShape.amountMinorUnits.nonnegative(),
  })
  .strict();

const depositTransactionSchema = z
  .object({
    ...transactionShape,
    kind: z.literal("deposit"),
    amountMinorUnits: transactionShape.amountMinorUnits.positive(),
  })
  .strict();

const withdrawalTransactionV1Schema = z
  .object({
    ...transactionShape,
    kind: z.literal("withdrawal"),
    amountMinorUnits: transactionShape.amountMinorUnits.positive(),
  })
  .strict();

const withdrawalTransactionV2Schema = withdrawalTransactionV1Schema.extend({
  reason: z.string().trim().min(1).max(MAX_WITHDRAWAL_REASON_LENGTH).optional(),
});

const transactionV1Schema = z.discriminatedUnion("kind", [
  openingTransactionSchema,
  depositTransactionSchema,
  withdrawalTransactionV1Schema,
]);

const transactionV2Schema = z.discriminatedUnion("kind", [
  openingTransactionSchema,
  depositTransactionSchema,
  withdrawalTransactionV2Schema,
]);

const goalV1Schema = z.object(goalShape).strict();
const goalV2Schema = goalV1Schema.extend({
  iconDataUrl: z.string().refine(isNormalizedGoalIconDataUrl).optional(),
});

export const savingsEnvelopeV1Schema = z
  .object({
    version: z.literal(LEGACY_SAVINGS_SCHEMA_VERSION),
    state: z
      .object({
        goals: z.array(goalV1Schema),
        transactions: z.array(transactionV1Schema),
      })
      .strict(),
  })
  .strict();

export const savingsEnvelopeV2Schema = z
  .object({
    version: z.literal(SAVINGS_SCHEMA_VERSION),
    state: z
      .object({
        goals: z.array(goalV2Schema),
        transactions: z.array(transactionV2Schema),
      })
      .strict(),
  })
  .strict();

export interface SavingsEnvelopeV2 {
  readonly version: typeof SAVINGS_SCHEMA_VERSION;
  readonly state: SavingsState;
}

export type MigrationResult =
  | { readonly success: true; readonly envelope: SavingsEnvelopeV2 }
  | {
      readonly success: false;
      readonly reason: "unsupported-version";
      readonly version: unknown;
    }
  | {
      readonly success: false;
      readonly reason: "invalid-data";
      readonly error: z.ZodError;
    };

export function migrateSavingsEnvelope(value: unknown): MigrationResult {
  if (!isVersionedValue(value)) {
    const parsed = savingsEnvelopeV2Schema.safeParse(value);
    if (!parsed.success) {
      return { success: false, reason: "invalid-data", error: parsed.error };
    }

    return {
      success: true,
      envelope: parsed.data as unknown as SavingsEnvelopeV2,
    };
  }

  if (value.version === SAVINGS_SCHEMA_VERSION) {
    const parsed = savingsEnvelopeV2Schema.safeParse(value);
    return parsed.success
      ? {
          success: true,
          envelope: parsed.data as unknown as SavingsEnvelopeV2,
        }
      : { success: false, reason: "invalid-data", error: parsed.error };
  }

  if (value.version === LEGACY_SAVINGS_SCHEMA_VERSION) {
    const parsed = savingsEnvelopeV1Schema.safeParse(value);
    return parsed.success
      ? {
          success: true,
          envelope: {
            version: SAVINGS_SCHEMA_VERSION,
            state: parsed.data.state as unknown as SavingsState,
          },
        }
      : { success: false, reason: "invalid-data", error: parsed.error };
  }

  return {
    success: false,
    reason: "unsupported-version",
    version: value.version,
  };
}

function isVersionedValue(
  value: unknown,
): value is { readonly version: unknown } {
  return typeof value === "object" && value !== null && "version" in value;
}
