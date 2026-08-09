import { CirclePlus } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { formatMinorUnits, parseAmountToMinorUnits } from "../domain/money";
import { calculateProgress } from "../domain/progress";
import { projectTransactionBalance } from "../domain/transactions";
import type { Goal } from "../domain/types";
import { containDialogFocus } from "./dialog-focus";

export type TransactionMode = "deposit" | "withdrawal";

interface TransactionDialogProps {
  readonly goal: Goal;
  readonly currentBalanceMinorUnits: number;
  readonly onOpen?: (trigger: HTMLButtonElement) => void;
  readonly onSubmit: (
    mode: TransactionMode,
    amountMinorUnits: number,
  ) => "confirmation-required" | void;
}

export function TransactionDialog({
  goal,
  currentBalanceMinorUnits,
  onOpen,
  onSubmit,
}: TransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TransactionMode>("deposit");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();
  const titleId = useId();
  const amountId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (isOpen) {
      amountRef.current?.focus();
    }
  }, [isOpen]);

  const parsedAmount = parseTransactionAmount(
    amount,
    goal,
    mode,
    currentBalanceMinorUnits,
  );
  const projectedBalanceMinorUnits = parsedAmount.projectedBalanceMinorUnits;
  const projectedProgress =
    projectedBalanceMinorUnits === undefined
      ? undefined
      : calculateProgress(projectedBalanceMinorUnits, goal.targetMinorUnits);
  const displayedError =
    error ??
    (mode === "withdrawal" &&
    parsedAmount.error === "Withdrawal cannot exceed the current balance."
      ? parsedAmount.error
      : parsedAmount.error ===
          "Projected balance is outside the safe integer range."
        ? parsedAmount.error
        : undefined);

  function closeDialog(restoreFocus = true): void {
    setIsOpen(false);
    if (restoreFocus) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (parsedAmount.value === undefined) {
      setError(parsedAmount.error);
      amountRef.current?.focus();
      return;
    }

    const result = onSubmit(mode, parsedAmount.value);
    closeDialog(result !== "confirmation-required");
  }

  return (
    <>
      <button
        aria-label={`Add transaction for ${goal.name}`}
        className="button button--icon button--icon-primary tooltip-control"
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (triggerRef.current !== null) {
            onOpen?.(triggerRef.current);
          }
          setMode("deposit");
          setAmount("");
          setError(undefined);
          setIsOpen(true);
        }}
      >
        <CirclePlus aria-hidden="true" size={19} strokeWidth={1.8} />
        <span aria-hidden="true" className="tooltip">
          Add transaction
        </span>
      </button>

      {isOpen ? (
        <div className="dialog-backdrop" role="presentation">
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="dialog-panel"
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
            <h2 id={titleId}>Add transaction</h2>
            <form noValidate onSubmit={handleSubmit}>
              <div aria-label="Transaction type" className="segmented-control">
                <button
                  aria-pressed={mode === "deposit"}
                  className="button"
                  type="button"
                  onClick={() => {
                    setMode("deposit");
                    setError(undefined);
                  }}
                >
                  Deposit
                </button>
                <button
                  aria-pressed={mode === "withdrawal"}
                  className="button"
                  type="button"
                  onClick={() => {
                    setMode("withdrawal");
                    setError(undefined);
                  }}
                >
                  Withdrawal
                </button>
              </div>

              <label htmlFor={amountId}>Amount</label>
              <input
                aria-describedby={
                  displayedError === undefined ? undefined : `${amountId}-error`
                }
                aria-invalid={displayedError === undefined ? undefined : true}
                id={amountId}
                inputMode="decimal"
                name="amount"
                ref={amountRef}
                type="text"
                value={amount}
                onChange={(event) => {
                  setAmount(event.currentTarget.value);
                  setError(undefined);
                }}
              />
              {displayedError === undefined ? null : (
                <p className="field-error" id={`${amountId}-error`}>
                  {displayedError}
                </p>
              )}

              {projectedBalanceMinorUnits === undefined ||
              projectedProgress === undefined ? null : (
                <dl className="transaction-preview" aria-live="polite">
                  <div>
                    <dt>Projected balance</dt>
                    <dd>
                      {formatMinorUnits(
                        projectedBalanceMinorUnits,
                        goal.currency,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Projected progress</dt>
                    <dd>{projectedProgress.percentage}%</dd>
                  </div>
                </dl>
              )}

              <div className="dialog-actions">
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={() => closeDialog()}
                >
                  Cancel
                </button>
                <button className="button button--primary" type="submit">
                  Record {mode}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function parseTransactionAmount(
  amount: string,
  goal: Goal,
  mode: TransactionMode,
  currentBalanceMinorUnits: number,
): {
  readonly value?: number;
  readonly projectedBalanceMinorUnits?: number;
  readonly error?: string;
} {
  try {
    const value = parseAmountToMinorUnits(amount, goal.currency);
    if (mode === "withdrawal" && value > currentBalanceMinorUnits) {
      return { error: "Withdrawal cannot exceed the current balance." };
    }

    return {
      value,
      projectedBalanceMinorUnits: projectTransactionBalance(
        currentBalanceMinorUnits,
        mode,
        value,
      ),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Enter a valid amount.",
    };
  }
}
