import { z } from "zod";
import type { SavingsState } from "../domain/types";

export const SAVINGS_STORAGE_KEY = "saving-goal:state";
export const SAVINGS_SCHEMA_VERSION = 1 as const;

const safeInteger = z.number().int().safe();
const timestamp = z.iso.datetime({ offset: true });
const supportedCurrencies = new Set(Intl.supportedValuesOf("currency"));

const goalSchema = z
  .object({
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
  })
  .strict();

const transactionSchema = z
  .object({
    id: z.string().min(1),
    goalId: z.string().min(1),
    kind: z.enum(["opening", "deposit", "withdrawal"]),
    amountMinorUnits: safeInteger.nonnegative(),
    occurredAt: timestamp,
  })
  .strict()
  .refine(
    (transaction) =>
      transaction.kind === "opening" || transaction.amountMinorUnits > 0,
    { message: "Deposit and withdrawal amounts must be positive." },
  );

export const savingsEnvelopeV1Schema = z
  .object({
    version: z.literal(SAVINGS_SCHEMA_VERSION),
    state: z
      .object({
        goals: z.array(goalSchema),
        transactions: z.array(transactionSchema),
      })
      .strict(),
  })
  .strict();

export interface SavingsEnvelopeV1 {
  readonly version: typeof SAVINGS_SCHEMA_VERSION;
  readonly state: SavingsState;
}

export type MigrationResult =
  | { readonly success: true; readonly envelope: SavingsEnvelopeV1 }
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
  if (
    typeof value === "object" &&
    value !== null &&
    "version" in value &&
    value.version !== SAVINGS_SCHEMA_VERSION
  ) {
    return {
      success: false,
      reason: "unsupported-version",
      version: value.version,
    };
  }

  const parsed = savingsEnvelopeV1Schema.safeParse(value);
  if (!parsed.success) {
    return { success: false, reason: "invalid-data", error: parsed.error };
  }

  return {
    success: true,
    envelope: parsed.data as unknown as SavingsEnvelopeV1,
  };
}
