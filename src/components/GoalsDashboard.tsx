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
import { ActivityList } from "./ActivityList";
import { DeleteGoalDialog } from "./DeleteGoalDialog";
import { EmptyState } from "./EmptyState";
import { GoalFormDialog } from "./GoalFormDialog";
import { TransactionDialog, type TransactionMode } from "./TransactionDialog";
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
              <article className="goal-item" key={goal.id}>
                <h3>{goal.name}</h3>
                <div className="goal-item__actions">
                  <TransactionDialog
                    currentBalanceMinorUnits={deriveBalance(
                      goal.id,
                      savings.transactions,
                    )}
                    goal={goal}
                    onOpen={(trigger) => {
                      transactionReturnFocusRef.current = trigger;
                    }}
                    onSubmit={(mode, amountMinorUnits) =>
                      recordTransaction(goal, mode, amountMinorUnits)
                    }
                  />
                  <GoalFormDialog
                    mode="edit"
                    goal={goal}
                    openingBalanceMinorUnits={
                      savings.transactions.find(
                        (transaction) =>
                          transaction.goalId === goal.id &&
                          transaction.kind === "opening",
                      )?.amountMinorUnits ?? 0
                    }
                    onSubmit={(input) => {
                      dispatch({ type: "goal/edit", goalId: goal.id, input });
                      setAnnouncement(`${input.name.trim()} updated.`);
                    }}
                  />
                  <DeleteGoalDialog
                    goal={goal}
                    onConfirm={(goalId) => {
                      dispatch({ type: "goal/delete", goalId });
                      setAnnouncement(`${goal.name} deleted.`);
                    }}
                  />
                </div>
                <ActivityList goal={goal} transactions={savings.transactions} />
              </article>
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
