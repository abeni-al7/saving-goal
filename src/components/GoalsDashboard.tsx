import { useRef, useState } from "react";
import type { CreateGoalInput } from "../domain/goals";
import { formatMinorUnits } from "../domain/money";
import { deriveBalance } from "../domain/transactions";
import type { SavingsState } from "../domain/types";
import { evaluateWithdrawal } from "../domain/withdrawals";
import type {
  PendingWithdrawal,
  SavingsAction,
} from "../state/savings-reducer";
import { EmptyState } from "./EmptyState";
import { GoalCard } from "./GoalCard";
import { GoalFormDialog } from "./GoalFormDialog";
import type { TransactionMode } from "./TransactionDialog";
import { WithdrawalWarningDialog } from "./WithdrawalWarningDialog";

interface GoalsDashboardProps {
  readonly savings: SavingsState;
  readonly pendingWithdrawal: PendingWithdrawal | null;
  readonly dispatch: React.Dispatch<SavingsAction>;
}

export function GoalsDashboard({
  savings,
  pendingWithdrawal,
  dispatch,
}: GoalsDashboardProps) {
  const [announcement, setAnnouncement] = useState("");
  const transactionReturnFocusRef = useRef<HTMLButtonElement>(null);
  const completedCount = savings.goals.filter(
    (goal) => goal.completedAt !== undefined,
  ).length;

  const addGoal = (input: CreateGoalInput): void => {
    dispatch({ type: "goal/create", input });
    setAnnouncement(`${input.name.trim()} created.`);
  };

  const recordTransaction = (
    goal: SavingsState["goals"][number],
    mode: TransactionMode,
    amountMinorUnits: number,
  ): "confirmation-required" | void => {
    if (mode === "deposit") {
      dispatch({
        type: "transaction/deposit",
        goalId: goal.id,
        amountMinorUnits,
      });
      setAnnouncement(
        `${formatMinorUnits(amountMinorUnits, goal.currency)} deposited to ${goal.name}.`,
      );
      return;
    }

    const evaluation = evaluateWithdrawal({
      amountMinorUnits,
      currentBalanceMinorUnits: deriveBalance(goal.id, savings.transactions),
      warningThresholdPercent: goal.withdrawalWarningPercent,
    });
    dispatch({
      type: "withdrawal/request",
      goalId: goal.id,
      amountMinorUnits,
    });
    if (!evaluation.requiresConfirmation) {
      setAnnouncement(withdrawalAnnouncement(goal, amountMinorUnits));
      return;
    }

    return "confirmation-required";
  };

  const restoreTransactionFocus = (): void => {
    queueMicrotask(() => transactionReturnFocusRef.current?.focus());
  };

  const pendingGoal =
    pendingWithdrawal === null
      ? undefined
      : savings.goals.find((goal) => goal.id === pendingWithdrawal.goalId);

  return (
    <>
      {savings.goals.length === 0 ? (
        <EmptyState
          action={<GoalFormDialog mode="create" onSubmit={addGoal} />}
        />
      ) : (
        <section className="goals-dashboard" aria-labelledby="goals-title">
          <div className="goals-dashboard__heading">
            <div>
              <h2 id="goals-title">Your goals</h2>
              <p aria-label="Goal summary">
                {savings.goals.length}{" "}
                {savings.goals.length === 1 ? "goal" : "goals"},{" "}
                {completedCount} completed
              </p>
            </div>
            <GoalFormDialog mode="create" onSubmit={addGoal} />
          </div>
          <div className="goals-list">
            {savings.goals.map((goal) => (
              <GoalCard
                goal={goal}
                key={goal.id}
                transactions={savings.transactions}
                onDelete={(goalId) => {
                  dispatch({ type: "goal/delete", goalId });
                  setAnnouncement(`${goal.name} deleted.`);
                }}
                onEdit={(input) => {
                  dispatch({ type: "goal/edit", goalId: goal.id, input });
                  setAnnouncement(`${input.name.trim()} updated.`);
                }}
                onRecordTransaction={(mode, amountMinorUnits) =>
                  recordTransaction(goal, mode, amountMinorUnits)
                }
                onTransactionOpen={(trigger) => {
                  transactionReturnFocusRef.current = trigger;
                }}
              />
            ))}
          </div>
        </section>
      )}

      <p
        aria-atomic="true"
        aria-live="polite"
        className="visually-hidden"
        role="status"
      >
        {announcement}
      </p>

      {pendingWithdrawal === null || pendingGoal === undefined ? null : (
        <WithdrawalWarningDialog
          amountMinorUnits={pendingWithdrawal.amountMinorUnits}
          goal={pendingGoal}
          impactPercent={pendingWithdrawal.impactPercent}
          projectedBalanceMinorUnits={
            pendingWithdrawal.projectedBalanceMinorUnits
          }
          onCancel={() => {
            dispatch({ type: "withdrawal/cancel" });
            restoreTransactionFocus();
          }}
          onConfirm={() => {
            dispatch({ type: "withdrawal/confirm" });
            setAnnouncement(
              withdrawalAnnouncement(
                pendingGoal,
                pendingWithdrawal.amountMinorUnits,
              ),
            );
            restoreTransactionFocus();
          }}
        />
      )}
    </>
  );
}

function withdrawalAnnouncement(
  goal: SavingsState["goals"][number],
  amountMinorUnits: number,
): string {
  return `${formatMinorUnits(amountMinorUnits, goal.currency)} withdrawn from ${goal.name}.`;
}
