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

  it("loads valid version-one data through migration", () => {
    const rawValue = JSON.stringify({ version: 1, state: validState });
    localStorage.setItem(SAVINGS_STORAGE_KEY, rawValue);

    expect(loadSavings(localStorage)).toEqual({
      status: "loaded",
      state: validState,
    });
    expect(localStorage.getItem(SAVINGS_STORAGE_KEY)).toBe(rawValue);
  });

  it("loads valid version-two metadata", () => {
    const state: SavingsState = {
      goals: [
        {
          ...validState.goals[0],
          iconDataUrl: "data:image/png;base64,AAAA",
        },
      ],
      transactions: [
        ...validState.transactions,
        {
          id: "transaction-2" as SavingsState["transactions"][number]["id"],
          goalId: validState.goals[0].id,
          kind: "withdrawal",
          amountMinorUnits: 1_000,
          occurredAt: "2026-08-10T12:00:00.000Z",
          reason: "Emergency repair",
        },
      ],
    };
    localStorage.setItem(
      SAVINGS_STORAGE_KEY,
      JSON.stringify({ version: 2, state }),
    );

    expect(loadSavings(localStorage)).toEqual({ status: "loaded", state });
  });

  it.each([
    ["malformed JSON", "{definitely-not-json", "malformed-json"],
    [
      "schema-invalid JSON",
      JSON.stringify({ version: 1, state: { goals: "nope" } }),
      "invalid-data",
    ],
    [
      "schema-invalid version-two JSON",
      JSON.stringify({
        version: 2,
        state: {
          goals: [],
          transactions: [{ ...validState.transactions[0], reason: "Invalid" }],
        },
      }),
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

  it("saves a version-two envelope", () => {
    expect(saveSavings(localStorage, validState)).toEqual({ success: true });
    expect(JSON.parse(localStorage.getItem(SAVINGS_STORAGE_KEY) ?? "")).toEqual(
      { version: 2, state: validState },
    );
  });

  it("saves the normalized version-two envelope", () => {
    const state: SavingsState = {
      ...validState,
      transactions: [
        ...validState.transactions,
        {
          id: "transaction-2" as SavingsState["transactions"][number]["id"],
          goalId: validState.goals[0].id,
          kind: "withdrawal",
          amountMinorUnits: 1_000,
          occurredAt: "2026-08-10T12:00:00.000Z",
          reason: "  Emergency repair  ",
        },
      ],
    };

    expect(saveSavings(localStorage, state)).toEqual({ success: true });
    expect(
      JSON.parse(localStorage.getItem(SAVINGS_STORAGE_KEY) ?? "").state
        .transactions[1].reason,
    ).toBe("Emergency repair");
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

  it("rejects invalid version-two state without changing the existing raw value", () => {
    const rawValue = JSON.stringify({ version: 1, state: validState });
    localStorage.setItem(SAVINGS_STORAGE_KEY, rawValue);
    const invalidState: SavingsState = {
      ...validState,
      transactions: [
        {
          ...validState.transactions[0],
          reason: "Opening balances cannot have reasons",
        },
      ],
    };

    expect(saveSavings(localStorage, invalidState)).toEqual({
      success: false,
      reason: "invalid-data",
      message: "Changes contain invalid saving data and could not be saved.",
    });
    expect(localStorage.getItem(SAVINGS_STORAGE_KEY)).toBe(rawValue);
  });

  it("removes saved data only when reset is explicit", () => {
    localStorage.setItem(SAVINGS_STORAGE_KEY, "corrupt but preserved");

    expect(resetSavings(localStorage)).toEqual({ success: true });
    expect(localStorage.getItem(SAVINGS_STORAGE_KEY)).toBeNull();
  });
});
