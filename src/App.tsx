import { useRef } from "react";
import { GoalsDashboard } from "./components/GoalsDashboard";
import { StorageStatus } from "./components/StorageStatus";
import { useSavings } from "./state/useSavings";

export default function App() {
  const { state, dispatch, continueInSession, resetSavedData } = useSavings();
  const mainRef = useRef<HTMLElement>(null);
  const canUseWorkspace =
    state.storageStatus.kind === "ready" ||
    state.storageStatus.kind === "session-only" ||
    state.storageStatus.kind === "save-error";

  function resetSavedDataAndFocus(): boolean {
    const wasReset = resetSavedData();
    if (wasReset) {
      queueMicrotask(() => mainRef.current?.focus());
    }

    return wasReset;
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-kicker">Your plans, made visible</p>
        <h1>Saving goals</h1>
        <p className="app-intro">
          Build steady momentum toward the things that matter.
        </p>
      </header>

      <main aria-label="Saving goals workspace" ref={mainRef} tabIndex={-1}>
        <StorageStatus
          status={state.storageStatus}
          onContinueInSession={continueInSession}
          onResetSavedData={resetSavedDataAndFocus}
        />
        {canUseWorkspace ? (
          <GoalsDashboard
            dispatch={dispatch}
            pendingWithdrawal={state.pendingWithdrawal}
            savings={state.savings}
          />
        ) : null}
      </main>
    </div>
  );
}
