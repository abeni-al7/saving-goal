import { Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Goal, GoalId } from "../domain/types";
import { containDialogFocus } from "./dialog-focus";

interface DeleteGoalDialogProps {
  readonly goal: Goal;
  readonly onConfirm: (goalId: GoalId) => void;
}

export function DeleteGoalDialog({ goal, onConfirm }: DeleteGoalDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  function closeDialog(): void {
    setIsOpen(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function confirmDeletion(): void {
    onConfirm(goal.id);
    setIsOpen(false);
  }

  return (
    <>
      <button
        aria-label={`Delete ${goal.name}`}
        className="button button--icon button--danger-text tooltip-control"
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <Trash2 aria-hidden="true" size={18} strokeWidth={1.8} />
        <span aria-hidden="true" className="tooltip">
          Delete goal
        </span>
      </button>

      {isOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-describedby={descriptionId}
            aria-labelledby={titleId}
            aria-modal="true"
            className="dialog-panel dialog-panel--danger"
            ref={panelRef}
            role="dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                closeDialog();
                return;
              }

              containDialogFocus(event, panelRef.current);
            }}
          >
            <h2 id={titleId}>Delete {goal.name}?</h2>
            <p id={descriptionId}>
              This permanently deletes the goal and all of its transaction
              history. This action cannot be undone.
            </p>
            <div className="dialog-actions">
              <button
                className="button button--quiet"
                ref={cancelRef}
                type="button"
                onClick={closeDialog}
              >
                Cancel
              </button>
              <button
                className="button button--danger"
                type="button"
                onClick={confirmDeletion}
              >
                Delete permanently
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
