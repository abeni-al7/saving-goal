import { useEffect, useId, useRef } from "react";
import { formatMinorUnits } from "../domain/money";
import type { Goal } from "../domain/types";
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
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="dialog-panel dialog-panel--warning"
        ref={panelRef}
        role="dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            onCancel();
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
            <dd>
              {formatMinorUnits(projectedBalanceMinorUnits, goal.currency)}
            </dd>
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
            onClick={onCancel}
          >
            Keep savings
          </button>
          <button
            className="button button--danger"
            type="button"
            onClick={onConfirm}
          >
            Confirm withdrawal
          </button>
        </div>
      </section>
    </div>
  );
}
