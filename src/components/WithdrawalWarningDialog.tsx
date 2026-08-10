import { useEffect, useId, useRef, useState } from "react";
import { formatMinorUnits } from "../domain/money";
import type { Goal } from "../domain/types";
import { DialogSurface } from "./DialogSurface";
import { containDialogFocus } from "./dialog-focus";

interface WithdrawalWarningDialogProps {
  readonly goal: Goal;
  readonly amountMinorUnits: number;
  readonly projectedBalanceMinorUnits: number;
  readonly impactPercent: number;
  readonly reason?: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

export function WithdrawalWarningDialog({
  goal,
  amountMinorUnits,
  projectedBalanceMinorUnits,
  impactPercent,
  reason,
  onCancel,
  onConfirm,
}: WithdrawalWarningDialogProps) {
  const [isOpen, setIsOpen] = useState(true);
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const exitActionRef = useRef<"cancel" | "confirm" | null>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  function closeDialog(action: "cancel" | "confirm"): void {
    if (exitActionRef.current !== null) {
      return;
    }

    exitActionRef.current = action;
    setIsOpen(false);
  }

  return (
    <DialogSurface
      describedBy={descriptionId}
      isOpen={isOpen}
      labelledBy={titleId}
      panelClassName="dialog-panel--warning"
      panelRef={panelRef}
      onExitComplete={() => {
        const action = exitActionRef.current;
        exitActionRef.current = null;
        if (action === "confirm") {
          onConfirm();
        } else if (action === "cancel") {
          onCancel();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          closeDialog("cancel");
          return;
        }

        containDialogFocus(event, panelRef.current);
      }}
    >
      <h2 id={titleId}>Confirm large withdrawal</h2>
      <p id={descriptionId}>
        This withdrawal is larger than the warning threshold for {goal.name}.
        Review its effect before continuing.
      </p>
      <dl className="withdrawal-impact">
        <div>
          <dt>Withdrawal amount</dt>
          <dd>{formatMinorUnits(amountMinorUnits, goal.currency)}</dd>
        </div>
        <div>
          <dt>Projected balance</dt>
          <dd>{formatMinorUnits(projectedBalanceMinorUnits, goal.currency)}</dd>
        </div>
        <div>
          <dt>Impact</dt>
          <dd>{impactPercent}% of the current balance</dd>
        </div>
        {reason === undefined ? null : (
          <div>
            <dt>Reason</dt>
            <dd className="withdrawal-impact__reason">{reason}</dd>
          </div>
        )}
      </dl>
      <div className="dialog-actions">
        <button
          className="button button--quiet"
          ref={cancelRef}
          type="button"
          onClick={() => closeDialog("cancel")}
        >
          Keep savings
        </button>
        <button
          className="button button--danger"
          type="button"
          onClick={() => closeDialog("confirm")}
        >
          Confirm withdrawal
        </button>
      </div>
    </DialogSurface>
  );
}
