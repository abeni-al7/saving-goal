import type { SavingsState } from "../domain/types";
import {
  migrateSavingsEnvelope,
  SAVINGS_SCHEMA_VERSION,
  SAVINGS_STORAGE_KEY,
} from "./schema";

export type SavingsStorage = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

export type LoadSavingsResult =
  | { readonly status: "empty"; readonly state: SavingsState }
  | { readonly status: "loaded"; readonly state: SavingsState }
  | {
      readonly status: "invalid";
      readonly reason:
        "malformed-json" | "invalid-data" | "unsupported-version";
      readonly rawValue: string;
    }
  | { readonly status: "unavailable"; readonly message: string };

export type SaveSavingsResult =
  | { readonly success: true }
  | {
      readonly success: false;
      readonly reason: "quota-exceeded" | "unavailable";
      readonly message: string;
    };

export type ResetSavingsResult =
  | { readonly success: true }
  | {
      readonly success: false;
      readonly reason: "unavailable";
      readonly message: string;
    };

export function emptySavingsState(): SavingsState {
  return { goals: [], transactions: [] };
}

export function loadSavings(storage: SavingsStorage): LoadSavingsResult {
  let rawValue: string | null;

  try {
    rawValue = storage.getItem(SAVINGS_STORAGE_KEY);
  } catch {
    return {
      status: "unavailable",
      message: "Saved data could not be accessed.",
    };
  }

  if (rawValue === null) {
    return { status: "empty", state: emptySavingsState() };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    return { status: "invalid", reason: "malformed-json", rawValue };
  }

  const migration = migrateSavingsEnvelope(parsed);
  if (!migration.success) {
    return {
      status: "invalid",
      reason: migration.reason,
      rawValue,
    };
  }

  return { status: "loaded", state: migration.envelope.state };
}

export function saveSavings(
  storage: SavingsStorage,
  state: SavingsState,
): SaveSavingsResult {
  const serialized = JSON.stringify({
    version: SAVINGS_SCHEMA_VERSION,
    state,
  });

  try {
    storage.setItem(SAVINGS_STORAGE_KEY, serialized);
    return { success: true };
  } catch (error) {
    if (isQuotaExceededError(error)) {
      return {
        success: false,
        reason: "quota-exceeded",
        message: "Changes could not be saved because storage is full.",
      };
    }

    return {
      success: false,
      reason: "unavailable",
      message: "Changes could not be saved.",
    };
  }
}

export function resetSavings(storage: SavingsStorage): ResetSavingsResult {
  try {
    storage.removeItem(SAVINGS_STORAGE_KEY);
    return { success: true };
  } catch {
    return {
      success: false,
      reason: "unavailable",
      message: "Saved data could not be reset.",
    };
  }
}

function isQuotaExceededError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED")
  );
}
