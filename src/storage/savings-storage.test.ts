import { beforeEach, describe, expect, it } from "vitest";
import type { SavingsState } from "../domain/types";
import { SAVINGS_STORAGE_KEY } from "./schema";
import {
  loadSavings,
  resetSavings,
  saveSavings,
  type SavingsStorage,
} from "./savings-storage";

const validState: SavingsState = {
  goals: [
    {
      id: "goal-1" as SavingsState["goals"][number]["id"],
      name: "Emergency fund",
      targetMinorUnits: 500_000,
      currency: "USD" as SavingsState["goals"][number]["currency"],
      withdrawalWarningPercent: 20,
      createdAt: "2026-08-09T12:00:00.000Z",
    },
  ],
  transactions: [
    {
      id: "transaction-1" as SavingsState["transactions"][number]["id"],
      goalId: "goal-1" as SavingsState["goals"][number]["id"],
      kind: "opening",
      amountMinorUnits: 10_000,
      occurredAt: "2026-08-09T12:00:00.000Z",
    },
  ],
};

beforeEach(() => {
  localStorage.clear();
});

describe("savings storage", () => {
  it("returns an empty state when no saved value exists", () => {
    expect(loadSavings(localStorage)).toEqual({
      status: "empty",
      state: { goals: [], transactions: [] },
    });
  });

  it("loads valid version-one data", () => {
    localStorage.setItem(
      SAVINGS_STORAGE_KEY,
      JSON.stringify({ version: 1, state: validState }),
    );

    expect(loadSavings(localStorage)).toEqual({
      status: "loaded",
      state: validState,
    });
  });

  it.each([
    ["malformed JSON", "{definitely-not-json", "malformed-json"],
    [
      "schema-invalid JSON",
      JSON.stringify({ version: 1, state: { goals: "nope" } }),
      "invalid-data",
    ],
    [
      "a future version",
      JSON.stringify({ version: 9, state: { future: true } }),
      "unsupported-version",
    ],
  ])("preserves %s", (_label, rawValue, reason) => {
    localStorage.setItem(SAVINGS_STORAGE_KEY, rawValue);

    expect(loadSavings(localStorage)).toEqual({
      status: "invalid",
      reason,
      rawValue,
    });
    expect(localStorage.getItem(SAVINGS_STORAGE_KEY)).toBe(rawValue);
  });

  it("reports storage that is unavailable during reads", () => {
    const unavailableStorage: SavingsStorage = {
      getItem: () => {
        throw new DOMException("Access denied", "SecurityError");
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };

    expect(loadSavings(unavailableStorage)).toEqual({
      status: "unavailable",
      message: "Saved data could not be accessed.",
    });
  });

  it("saves a version-one envelope", () => {
    expect(saveSavings(localStorage, validState)).toEqual({ success: true });
    expect(JSON.parse(localStorage.getItem(SAVINGS_STORAGE_KEY) ?? "")).toEqual(
      { version: 1, state: validState },
    );
  });

  it("reports quota failures without changing the existing raw value", () => {
    const rawValue = JSON.stringify({ version: 9, state: { future: true } });
    const quotaStorage: SavingsStorage = {
      getItem: () => rawValue,
      setItem: () => {
        throw new DOMException("Storage is full", "QuotaExceededError");
      },
      removeItem: () => undefined,
    };

    expect(saveSavings(quotaStorage, validState)).toEqual({
      success: false,
      reason: "quota-exceeded",
      message: "Changes could not be saved because storage is full.",
    });
    expect(quotaStorage.getItem(SAVINGS_STORAGE_KEY)).toBe(rawValue);
  });

  it("removes saved data only when reset is explicit", () => {
    localStorage.setItem(SAVINGS_STORAGE_KEY, "corrupt but preserved");

    expect(resetSavings(localStorage)).toEqual({ success: true });
    expect(localStorage.getItem(SAVINGS_STORAGE_KEY)).toBeNull();
  });
});
