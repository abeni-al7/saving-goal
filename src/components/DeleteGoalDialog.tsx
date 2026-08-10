import { Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Goal, GoalId } from "../domain/types";
import { DialogSurface } from "./DialogSurface";
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
  const exitActionRef = useRef<"cancel" | "confirm" | null>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
    }
  }, [isOpen]);

  function closeDialog(): void {
    exitActionRef.current = "cancel";
    setIsOpen(false);
  }

  function confirmDeletion(): void {
    exitActionRef.current = "confirm";
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

      <DialogSurface
        describedBy={descriptionId}
        isOpen={isOpen}
        labelledBy={titleId}
        panelClassName="dialog-panel--danger"
        panelRef={panelRef}
        onExitComplete={() => {
          const action = exitActionRef.current;
          exitActionRef.current = null;
          if (action === "confirm") {
            onConfirm(goal.id);
          } else if (action === "cancel") {
            triggerRef.current?.focus();
          }
        }}
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
          This permanently deletes the goal and all of its transaction history.
          This action cannot be undone.
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
      </DialogSurface>
    </>
  );
}
