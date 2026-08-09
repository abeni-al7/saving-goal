import { AlertTriangle, DatabaseZap } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { StorageStatus as StorageStatusValue } from "../state/savings-reducer";
import { containDialogFocus } from "./dialog-focus";

interface StorageStatusProps {
  readonly status: StorageStatusValue;
  readonly onContinueInSession: () => void;
  readonly onResetSavedData: () => boolean;
}

export function StorageStatus({
  status,
  onContinueInSession,
  onResetSavedData,
}: StorageStatusProps) {
  const [isResetOpen, setIsResetOpen] = useState(false);
  const resetTitleId = useId();
  const resetDescriptionId = useId();
  const resetTriggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const statusRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isResetOpen) {
      cancelRef.current?.focus();
    }
  }, [isResetOpen]);

  if (status.kind === "ready") {
    return null;
  }

  function closeResetDialog(): void {
    setIsResetOpen(false);
    queueMicrotask(() => resetTriggerRef.current?.focus());
  }

  function confirmReset(): void {
    if (onResetSavedData()) {
      setIsResetOpen(false);
      return;
    }

    setIsResetOpen(false);
    queueMicrotask(() => statusRef.current?.focus());
  }

  if (status.kind === "session-only") {
    return (
      <aside className="storage-status storage-status--session" role="status">
        <DatabaseZap aria-hidden="true" size={20} strokeWidth={1.8} />
        <div>
          <h2>Session-only mode</h2>
          <p>{status.message}</p>
        </div>
      </aside>
    );
  }

  const isRecoveryRequired = status.kind === "recovery-required";
  const heading = isRecoveryRequired
    ? "Saved data needs attention"
    : status.kind === "save-error"
      ? "Changes are not being saved"
      : "Saving is unavailable";

  return (
    <>
      <aside
        className="storage-status"
        ref={statusRef}
        role="alert"
        tabIndex={-1}
      >
        <AlertTriangle aria-hidden="true" size={20} strokeWidth={1.8} />
        <div className="storage-status__content">
          <h2>{heading}</h2>
          <p>{status.message}</p>
          {status.kind === "save-error" ? (
            <p>Your current changes are still available in this session.</p>
          ) : null}
          {isRecoveryRequired ? (
            <p>The stored value will remain unchanged unless you reset it.</p>
          ) : null}
          <div className="storage-status__actions">
            <button
              className="button button--quiet"
              type="button"
              onClick={onContinueInSession}
            >
              Continue this session
            </button>
            {isRecoveryRequired ? (
              <button
                className="button button--danger-text"
                ref={resetTriggerRef}
                type="button"
                onClick={() => setIsResetOpen(true)}
              >
                Reset saved data
              </button>
            ) : null}
          </div>
        </div>
      </aside>

      {isResetOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-describedby={resetDescriptionId}
            aria-labelledby={resetTitleId}
            aria-modal="true"
            className="dialog-panel dialog-panel--danger"
            ref={panelRef}
            role="dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeResetDialog();
                return;
              }

              containDialogFocus(event, panelRef.current);
            }}
          >
            <h2 id={resetTitleId}>Reset saved data?</h2>
            <p id={resetDescriptionId}>
              This permanently removes the saved value from this browser. This
              action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button
                className="button button--quiet"
                ref={cancelRef}
                type="button"
                onClick={closeResetDialog}
              >
                Cancel
              </button>
              <button
                className="button button--danger"
                type="button"
                onClick={confirmReset}
              >
                Reset permanently
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
