import { useEffect, useReducer, useRef, useState } from "react";
import type { DomainProviders } from "../domain/goals";
import {
  loadSavings,
  resetSavings,
  saveSavings,
  type LoadSavingsResult,
  type SavingsStorage,
} from "../storage/savings-storage";
import {
  createInitialSavingsReducerState,
  createSavingsReducer,
  type SavingsAction,
  type SavingsReducerState,
  type StorageStatus,
} from "./savings-reducer";

export interface UseSavingsOptions {
  readonly getStorage?: () => SavingsStorage;
  readonly providers?: DomainProviders;
}

export interface UseSavingsResult {
  readonly state: SavingsReducerState;
  readonly dispatch: React.Dispatch<SavingsAction>;
  readonly continueInSession: () => void;
  readonly resetSavedData: () => boolean;
}

const defaultProviders: DomainProviders = {
  createId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

export function useSavings(options: UseSavingsOptions = {}): UseSavingsResult {
  const [storage] = useState<SavingsStorage | null>(() =>
    resolveStorage(options.getStorage ?? (() => window.localStorage)),
  );
  const [reducer] = useState(() =>
    createSavingsReducer(options.providers ?? defaultProviders),
  );
  const [state, dispatch] = useReducer(reducer, storage, hydrateSavingsState);
  const persistedRevision = useRef(state.revision);

  useEffect(() => {
    if (state.revision === persistedRevision.current) {
      return;
    }

    persistedRevision.current = state.revision;
    if (storage === null || !canPersist(state.storageStatus)) {
      return;
    }

    const result = saveSavings(storage, state.savings);
    if (!result.success) {
      dispatch({
        type: "storage/status",
        status: {
          kind: "save-error",
          reason: result.reason,
          message: result.message,
        },
      });
    } else if (state.storageStatus.kind === "save-error") {
      dispatch({ type: "storage/status", status: { kind: "ready" } });
    }
  }, [state.revision, state.savings, state.storageStatus, storage]);

  function continueInSession(): void {
    dispatch({
      type: "storage/status",
      status: {
        kind: "session-only",
        message: "Changes will be kept only for this browser session.",
      },
    });
  }

  function resetSavedData(): boolean {
    if (storage === null) {
      dispatch({
        type: "storage/status",
        status: {
          kind: "unavailable",
          message: "Saved data could not be reset.",
        },
      });
      return false;
    }

    const result = resetSavings(storage);
    if (!result.success) {
      dispatch({
        type: "storage/status",
        status: { kind: "unavailable", message: result.message },
      });
      return false;
    }

    dispatch({ type: "savings/reset" });
    dispatch({ type: "storage/status", status: { kind: "ready" } });
    return true;
  }

  return { state, dispatch, continueInSession, resetSavedData };
}

function resolveStorage(
  getStorage: () => SavingsStorage,
): SavingsStorage | null {
  try {
    return getStorage();
  } catch {
    return null;
  }
}

function hydrateSavingsState(
  storage: SavingsStorage | null,
): SavingsReducerState {
  if (storage === null) {
    return createInitialSavingsReducerState(undefined, {
      kind: "unavailable",
      message: "Saved data could not be accessed.",
    });
  }

  const loaded = loadSavings(storage);
  if (loaded.status === "empty" || loaded.status === "loaded") {
    return createInitialSavingsReducerState(loaded.state);
  }

  return createInitialSavingsReducerState(
    undefined,
    storageStatusFromLoadFailure(loaded),
  );
}

function storageStatusFromLoadFailure(
  result: Exclude<LoadSavingsResult, { status: "empty" | "loaded" }>,
): StorageStatus {
  if (result.status === "unavailable") {
    return { kind: "unavailable", message: result.message };
  }

  return {
    kind: "recovery-required",
    reason: result.reason,
    message: "Saved data could not be loaded and has been preserved.",
  };
}

function canPersist(status: StorageStatus): boolean {
  return status.kind === "ready" || status.kind === "save-error";
}
