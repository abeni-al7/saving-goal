import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { DomainProviders } from "../domain/goals";
import type { SavingsStorage } from "../storage/savings-storage";
import { useSavings } from "./useSavings";

function providers(): DomainProviders {
  let id = 0;

  return {
    createId: () => `id-${++id}`,
    now: () => "2026-08-09T12:00:00.000Z",
  };
}

const createGoalAction = {
  type: "goal/create" as const,
  input: {
    name: "Emergency fund",
    targetAmount: "100.00",
    openingBalanceAmount: "10.00",
    currency: "USD",
  },
};

describe("useSavings", () => {
  it("hydrates lazily with one storage read", () => {
    const getItem = vi.fn(() =>
      JSON.stringify({
        version: 1,
        state: {
          goals: [
            {
              id: "goal-1",
              name: "Travel",
              targetMinorUnits: 80_000,
              currency: "EUR",
              withdrawalWarningPercent: 20,
              createdAt: "2026-08-09T12:00:00.000Z",
            },
          ],
          transactions: [
            {
              id: "transaction-1",
              goalId: "goal-1",
              kind: "opening",
              amountMinorUnits: 0,
              occurredAt: "2026-08-09T12:00:00.000Z",
            },
          ],
        },
      }),
    );
    const storage: SavingsStorage = {
      getItem,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    const getStorage = vi.fn(() => storage);

    const { result, rerender } = renderHook(() =>
      useSavings({ getStorage, providers: providers() }),
    );
    rerender();

    expect(result.current.state.savings.goals[0].name).toBe("Travel");
    expect(result.current.state.storageStatus).toEqual({ kind: "ready" });
    expect(getStorage).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledTimes(1);
  });

  it("persists after a successful savings change", async () => {
    const setItem = vi.fn();
    const storage: SavingsStorage = {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
    };
    const { result } = renderHook(() =>
      useSavings({ getStorage: () => storage, providers: providers() }),
    );

    expect(setItem).not.toHaveBeenCalled();
    act(() => result.current.dispatch(createGoalAction));

    await waitFor(() => expect(setItem).toHaveBeenCalledTimes(1));
    expect(JSON.parse(setItem.mock.calls[0][1])).toMatchObject({
      version: 1,
      state: { goals: [{ name: "Emergency fund" }] },
    });
  });

  it("continues in session-only mode when storage is unavailable", async () => {
    const setItem = vi.fn();
    const storage: SavingsStorage = {
      getItem: () => {
        throw new DOMException("Access denied", "SecurityError");
      },
      setItem,
      removeItem: vi.fn(),
    };
    const { result } = renderHook(() =>
      useSavings({ getStorage: () => storage, providers: providers() }),
    );

    expect(result.current.state.storageStatus.kind).toBe("unavailable");
    act(() => result.current.continueInSession());
    act(() => result.current.dispatch(createGoalAction));

    await waitFor(() =>
      expect(result.current.state.savings.goals).toHaveLength(1),
    );
    expect(result.current.state.storageStatus.kind).toBe("session-only");
    expect(setItem).not.toHaveBeenCalled();
  });

  it("surfaces quota errors without discarding the in-memory change", async () => {
    const storage: SavingsStorage = {
      getItem: vi.fn(() => null),
      setItem: () => {
        throw new DOMException("Storage is full", "QuotaExceededError");
      },
      removeItem: vi.fn(),
    };
    const { result } = renderHook(() =>
      useSavings({ getStorage: () => storage, providers: providers() }),
    );

    act(() => result.current.dispatch(createGoalAction));

    await waitFor(() =>
      expect(result.current.state.storageStatus).toEqual({
        kind: "save-error",
        reason: "quota-exceeded",
        message: "Changes could not be saved because storage is full.",
      }),
    );
    expect(result.current.state.savings.goals).toHaveLength(1);
  });
});
