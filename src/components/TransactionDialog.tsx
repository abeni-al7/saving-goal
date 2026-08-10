import { CirclePlus } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useIsPresent,
  useReducedMotion,
} from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { formatMinorUnits, parseAmountToMinorUnits } from "../domain/money";
import { calculateProgress } from "../domain/progress";
import {
  MAX_WITHDRAWAL_REASON_LENGTH,
  projectTransactionBalance,
} from "../domain/transactions";
import type { Goal } from "../domain/types";
import { DialogSurface } from "./DialogSurface";
import { containDialogFocus } from "./dialog-focus";

export type TransactionMode = "deposit" | "withdrawal";

interface ConditionalRegionProps {
  readonly ariaLive?: "polite";
  readonly children: React.ReactNode;
  readonly className: string;
  readonly region: "transaction-preview" | "withdrawal-reason";
}

interface TransactionDialogProps {
  readonly goal: Goal;
  readonly currentBalanceMinorUnits: number;
  readonly onOpen?: (trigger: HTMLButtonElement) => void;
  readonly onConfirmationReady?: () => void;
  readonly onSubmit: (
    mode: TransactionMode,
    amountMinorUnits: number,
    reason?: string,
  ) => "confirmation-required" | void;
}

export function TransactionDialog({
  goal,
  currentBalanceMinorUnits,
  onOpen,
  onConfirmationReady,
  onSubmit,
}: TransactionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<TransactionMode>("deposit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string>();
  const titleId = useId();
  const amountId = useId();
  const reasonId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const restoreFocusAfterExitRef = useRef(true);
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
    restoreFocusAfterExitRef.current = restoreFocus;
    setIsOpen(false);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (parsedAmount.value === undefined) {
      setError(parsedAmount.error);
      amountRef.current?.focus();
      return;
    }

    const normalizedReason = reason.trim() || undefined;
    const result =
      mode === "withdrawal"
        ? onSubmit(mode, parsedAmount.value, normalizedReason)
        : onSubmit(mode, parsedAmount.value);
    closeDialog(result !== "confirmation-required");
  }

  return (
    <>
      <button
        aria-label={`Add transaction for ${goal.name}`}
        className="button button--transaction"
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (triggerRef.current !== null) {
            onOpen?.(triggerRef.current);
          }
          setMode("deposit");
          setAmount("");
          setReason("");
          setError(undefined);
          setIsOpen(true);
        }}
      >
        <CirclePlus aria-hidden="true" size={19} strokeWidth={1.8} />
        <span>Add transaction</span>
      </button>

      <DialogSurface
        isOpen={isOpen}
        labelledBy={titleId}
        panelRef={panelRef}
        onExitComplete={() => {
          if (restoreFocusAfterExitRef.current) {
            triggerRef.current?.focus();
          } else {
            onConfirmationReady?.();
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
        <h2 id={titleId}>Add transaction</h2>
        <form noValidate onSubmit={handleSubmit}>
          <div
            aria-label="Transaction type"
            className="segmented-control"
            data-mode={mode}
          >
            <button
              aria-pressed={mode === "deposit"}
              className="button"
              type="button"
              onClick={() => {
                setMode("deposit");
                setError(undefined);
              }}
            >
              <span
                aria-hidden="true"
                className="segmented-control__indicator"
              />
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
              <span
                aria-hidden="true"
                className="segmented-control__indicator"
              />
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

          <AnimatePresence initial={false}>
            {mode === "withdrawal" ? (
              <ConditionalRegion
                className="transaction-reason"
                region="withdrawal-reason"
              >
                <label htmlFor={reasonId}>Reason (optional)</label>
                <textarea
                  id={reasonId}
                  maxLength={MAX_WITHDRAWAL_REASON_LENGTH}
                  name="reason"
                  rows={3}
                  value={reason}
                  onChange={(event) => setReason(event.currentTarget.value)}
                />
              </ConditionalRegion>
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {projectedBalanceMinorUnits === undefined ||
            projectedProgress === undefined ? null : (
              <ConditionalRegion
                ariaLive="polite"
                className="transaction-preview"
                region="transaction-preview"
              >
                <dl>
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
              </ConditionalRegion>
            )}
          </AnimatePresence>

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
      </DialogSurface>
    </>
  );
}

function ConditionalRegion({
  ariaLive,
  children,
  className,
  region,
}: ConditionalRegionProps) {
  const isPresent = useIsPresent();
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      aria-hidden={isPresent ? undefined : true}
      aria-live={ariaLive}
      className={className}
      data-motion={shouldReduceMotion ? "reduced" : "animated"}
      data-motion-region={region}
      exit={{ opacity: 0, y: -6 }}
      initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
    >
      {children}
    </motion.div>
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
