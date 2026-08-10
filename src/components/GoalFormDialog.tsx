import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { normalizeGoalIcon } from "../browser/goal-icon-upload";
import type { CreateGoalInput, EditGoalInput } from "../domain/goals";
import {
  currencyCode,
  currencyFractionDigits,
  parseAmountToMinorUnits,
} from "../domain/money";
import type { Goal } from "../domain/types";
import { containDialogFocus } from "./dialog-focus";

interface FieldErrors {
  readonly name?: string;
  readonly targetAmount?: string;
  readonly openingBalanceAmount?: string;
  readonly currency?: string;
  readonly withdrawalWarningPercent?: string;
}

interface CreateGoalFormDialogProps {
  readonly mode: "create";
  readonly onSubmit: (input: CreateGoalInput) => void;
}

interface EditGoalFormDialogProps {
  readonly mode: "edit";
  readonly goal: Goal;
  readonly openingBalanceMinorUnits: number;
  readonly onSubmit: (input: EditGoalInput) => void;
}

type GoalFormDialogProps = CreateGoalFormDialogProps | EditGoalFormDialogProps;

type CompleteCreateGoalInput = CreateGoalInput & {
  readonly withdrawalWarningPercent: number;
};

export function GoalFormDialog(props: GoalFormDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [iconDataUrl, setIconDataUrl] = useState<string>();
  const [iconError, setIconError] = useState<string>();
  const [isProcessingArtwork, setIsProcessingArtwork] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const uploadControllerRef = useRef<AbortController>(null);
  const uploadSequenceRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      nameRef.current?.focus();
    }
  }, [isOpen]);

  function closeDialog(): void {
    cancelPendingUpload();
    setIsOpen(false);
    setIsProcessingArtwork(false);
    queueMicrotask(() => triggerRef.current?.focus());
  }

  function openDialog(): void {
    cancelPendingUpload();
    setErrors({});
    setIconError(undefined);
    setIconDataUrl(props.mode === "edit" ? props.goal.iconDataUrl : undefined);
    setIsProcessingArtwork(false);
    setIsOpen(true);
  }

  function cancelPendingUpload(): void {
    uploadSequenceRef.current += 1;
    uploadControllerRef.current?.abort();
    uploadControllerRef.current = null;
  }

  async function handleArtworkSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.currentTarget.files?.[0];
    if (file === undefined) {
      return;
    }

    cancelPendingUpload();
    const sequence = uploadSequenceRef.current;
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setIconError(undefined);
    setIsProcessingArtwork(true);

    try {
      const normalizedIcon = await normalizeGoalIcon(file, {
        signal: controller.signal,
      });
      if (sequence === uploadSequenceRef.current) {
        setIconDataUrl(normalizedIcon);
      }
    } catch (error) {
      if (
        sequence === uploadSequenceRef.current &&
        !(error instanceof DOMException && error.name === "AbortError")
      ) {
        setIconError(errorMessage(error));
      }
    } finally {
      if (sequence === uploadSequenceRef.current) {
        uploadControllerRef.current = null;
        setIsProcessingArtwork(false);
      }
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const editableFields = {
      name: String(formData.get("name") ?? ""),
      targetAmount: String(formData.get("targetAmount") ?? ""),
      withdrawalWarningPercent: Number(
        formData.get("withdrawalWarningPercent"),
      ),
    };

    if (props.mode === "edit") {
      const editableInput: EditGoalInput = {
        ...editableFields,
        artwork:
          iconDataUrl === props.goal.iconDataUrl
            ? { type: "preserve" }
            : iconDataUrl === undefined
              ? { type: "remove" }
              : { type: "replace", iconDataUrl },
      };
      const nextErrors = validateEditInput(editableInput, props.goal);
      if (showErrors(nextErrors)) {
        return;
      }

      props.onSubmit(editableInput);
      closeDialog();
      return;
    }

    const input: CompleteCreateGoalInput = {
      ...editableFields,
      openingBalanceAmount: String(formData.get("openingBalanceAmount") ?? ""),
      currency: String(formData.get("currency") ?? "")
        .trim()
        .toUpperCase(),
      ...(iconDataUrl === undefined ? {} : { iconDataUrl }),
    };
    const nextErrors = validateCreateInput(input);

    if (showErrors(nextErrors)) {
      return;
    }

    props.onSubmit(input);
    closeDialog();
  }

  function showErrors(nextErrors: FieldErrors): boolean {
    if (Object.keys(nextErrors).length === 0) {
      return false;
    }

    setErrors(nextErrors);
    if (nextErrors.name !== undefined) {
      nameRef.current?.focus();
    }
    return true;
  }

  const isEdit = props.mode === "edit";
  const goal = props.mode === "edit" ? props.goal : null;

  return (
    <>
      <button
        aria-label={goal === null ? undefined : `Edit ${goal.name}`}
        className={
          isEdit
            ? "button button--icon tooltip-control"
            : "button button--primary"
        }
        ref={triggerRef}
        type="button"
        onClick={openDialog}
      >
        {goal === null ? (
          "Add goal"
        ) : (
          <>
            <Pencil aria-hidden="true" size={18} strokeWidth={1.8} />
            <span aria-hidden="true" className="tooltip">
              Edit goal
            </span>
          </>
        )}
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
            <h2 id={titleId}>
              {isEdit ? "Edit saving goal" : "Create a saving goal"}
            </h2>
            <form noValidate onSubmit={handleSubmit}>
              <label htmlFor={`${titleId}-name`}>Goal name</label>
              <input
                aria-describedby={
                  errors.name === undefined
                    ? undefined
                    : `${titleId}-name-error`
                }
                aria-invalid={errors.name === undefined ? undefined : true}
                id={`${titleId}-name`}
                ref={nameRef}
                defaultValue={goal?.name}
                name="name"
                type="text"
              />
              {errors.name === undefined ? null : (
                <p className="field-error" id={`${titleId}-name-error`}>
                  {errors.name}
                </p>
              )}

              <label htmlFor={`${titleId}-target`}>Target amount</label>
              <input
                aria-describedby={
                  errors.targetAmount === undefined
                    ? undefined
                    : `${titleId}-target-error`
                }
                aria-invalid={
                  errors.targetAmount === undefined ? undefined : true
                }
                id={`${titleId}-target`}
                defaultValue={
                  goal === null
                    ? undefined
                    : minorUnitsToInputValue(
                        goal.targetMinorUnits,
                        goal.currency,
                      )
                }
                inputMode="decimal"
                name="targetAmount"
                type="text"
              />
              {errors.targetAmount === undefined ? null : (
                <p className="field-error" id={`${titleId}-target-error`}>
                  {errors.targetAmount}
                </p>
              )}

              <label htmlFor={`${titleId}-opening`}>Opening balance</label>
              <input
                aria-describedby={
                  errors.openingBalanceAmount === undefined
                    ? undefined
                    : `${titleId}-opening-error`
                }
                aria-invalid={
                  errors.openingBalanceAmount === undefined ? undefined : true
                }
                id={`${titleId}-opening`}
                defaultValue={
                  props.mode === "edit"
                    ? minorUnitsToInputValue(
                        props.openingBalanceMinorUnits,
                        props.goal.currency,
                      )
                    : "0"
                }
                disabled={isEdit}
                inputMode="decimal"
                name="openingBalanceAmount"
                type="text"
              />
              {errors.openingBalanceAmount === undefined ? null : (
                <p className="field-error" id={`${titleId}-opening-error`}>
                  {errors.openingBalanceAmount}
                </p>
              )}

              <label htmlFor={`${titleId}-currency`}>Currency</label>
              <input
                aria-describedby={
                  errors.currency === undefined
                    ? undefined
                    : `${titleId}-currency-error`
                }
                aria-invalid={errors.currency === undefined ? undefined : true}
                id={`${titleId}-currency`}
                defaultValue={goal?.currency ?? "USD"}
                disabled={isEdit}
                maxLength={3}
                name="currency"
                type="text"
              />
              {errors.currency === undefined ? null : (
                <p className="field-error" id={`${titleId}-currency-error`}>
                  {errors.currency}
                </p>
              )}

              <label htmlFor={`${titleId}-threshold`}>
                Withdrawal warning threshold (%)
              </label>
              <input
                aria-describedby={
                  errors.withdrawalWarningPercent === undefined
                    ? undefined
                    : `${titleId}-threshold-error`
                }
                aria-invalid={
                  errors.withdrawalWarningPercent === undefined
                    ? undefined
                    : true
                }
                id={`${titleId}-threshold`}
                defaultValue={goal?.withdrawalWarningPercent ?? 20}
                max="100"
                min="0"
                name="withdrawalWarningPercent"
                step="1"
                type="number"
              />
              {errors.withdrawalWarningPercent === undefined ? null : (
                <p className="field-error" id={`${titleId}-threshold-error`}>
                  {errors.withdrawalWarningPercent}
                </p>
              )}

              <div className="goal-artwork-field">
                <label htmlFor={`${titleId}-artwork`}>
                  {iconDataUrl === undefined
                    ? "Goal artwork (optional)"
                    : "Replace artwork"}
                </label>
                <input
                  accept="image/png,image/jpeg,image/webp"
                  aria-describedby={
                    iconError === undefined
                      ? undefined
                      : `${titleId}-artwork-error`
                  }
                  aria-invalid={iconError === undefined ? undefined : true}
                  id={`${titleId}-artwork`}
                  name="artwork"
                  type="file"
                  onChange={(event) => void handleArtworkSelection(event)}
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                />
                {iconError === undefined ? null : (
                  <p className="field-error" id={`${titleId}-artwork-error`}>
                    {iconError}
                  </p>
                )}
                {isProcessingArtwork ? (
                  <p className="goal-artwork-field__status" role="status">
                    Processing artwork...
                  </p>
                ) : null}
                {iconDataUrl === undefined ? null : (
                  <div className="goal-artwork-preview">
                    <img alt="Goal artwork preview" src={iconDataUrl} />
                    <button
                      className="button button--quiet"
                      type="button"
                      onClick={() => {
                        cancelPendingUpload();
                        setIsProcessingArtwork(false);
                        setIconError(undefined);
                        setIconDataUrl(undefined);
                      }}
                    >
                      <Trash2 aria-hidden="true" size={17} strokeWidth={1.8} />
                      Remove artwork
                    </button>
                  </div>
                )}
              </div>

              <div className="dialog-actions">
                <button
                  className="button button--quiet"
                  type="button"
                  onClick={closeDialog}
                >
                  Cancel
                </button>
                <button
                  className="button button--primary"
                  disabled={isProcessingArtwork}
                  type="submit"
                >
                  {isEdit ? "Save changes" : "Create goal"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

function validateCreateInput(input: CompleteCreateGoalInput): FieldErrors {
  const errors: {
    name?: string;
    targetAmount?: string;
    openingBalanceAmount?: string;
    currency?: string;
    withdrawalWarningPercent?: string;
  } = {};

  if (input.name.trim().length === 0) {
    errors.name = "Goal name is required.";
  }

  let currency;
  try {
    currency = currencyCode(input.currency);
  } catch (error) {
    errors.currency = errorMessage(error);
  }

  if (currency !== undefined) {
    try {
      parseAmountToMinorUnits(input.targetAmount, currency);
    } catch (error) {
      errors.targetAmount = errorMessage(error);
    }

    try {
      parseAmountToMinorUnits(input.openingBalanceAmount, currency, {
        allowZero: true,
      });
    } catch (error) {
      errors.openingBalanceAmount = errorMessage(error);
    }
  }

  if (
    !Number.isInteger(input.withdrawalWarningPercent) ||
    input.withdrawalWarningPercent < 0 ||
    input.withdrawalWarningPercent > 100
  ) {
    errors.withdrawalWarningPercent =
      "Warning threshold must be a whole percentage from 0 to 100.";
  }

  return errors;
}

function validateEditInput(input: EditGoalInput, goal: Goal): FieldErrors {
  const errors: {
    name?: string;
    targetAmount?: string;
    withdrawalWarningPercent?: string;
  } = {};

  if (input.name.trim().length === 0) {
    errors.name = "Goal name is required.";
  }

  try {
    parseAmountToMinorUnits(input.targetAmount, goal.currency);
  } catch (error) {
    errors.targetAmount = errorMessage(error);
  }

  if (
    !Number.isInteger(input.withdrawalWarningPercent) ||
    input.withdrawalWarningPercent < 0 ||
    input.withdrawalWarningPercent > 100
  ) {
    errors.withdrawalWarningPercent =
      "Warning threshold must be a whole percentage from 0 to 100.";
  }

  return errors;
}

function minorUnitsToInputValue(
  amountMinorUnits: number,
  currency: Goal["currency"],
): string {
  const fractionDigits = currencyFractionDigits(currency);
  const scale = 10n ** BigInt(fractionDigits);
  const amount = BigInt(amountMinorUnits);
  const wholeUnits = amount / scale;

  if (fractionDigits === 0) {
    return wholeUnits.toString();
  }

  const fraction = (amount % scale).toString().padStart(fractionDigits, "0");
  return `${wholeUnits}.${fraction}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Enter a valid value.";
}
