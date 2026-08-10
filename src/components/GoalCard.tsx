import { CircleCheck } from "lucide-react";
import { useId } from "react";
import type { EditGoalInput } from "../domain/goals";
import { formatMinorUnits } from "../domain/money";
import { deriveBalance } from "../domain/transactions";
import type { Goal, GoalId, Transaction } from "../domain/types";
import { ActivityList } from "./ActivityList";
import { DeleteGoalDialog } from "./DeleteGoalDialog";
import { GoalFormDialog } from "./GoalFormDialog";
import { ProgressMeter } from "./ProgressMeter";
import { TransactionDialog, type TransactionMode } from "./TransactionDialog";

interface GoalCardProps {
  readonly goal: Goal;
  readonly transactions: readonly Transaction[];
  readonly onDelete: (goalId: GoalId) => void;
  readonly onEdit: (input: EditGoalInput) => void;
  readonly onRecordTransaction: (
    mode: TransactionMode,
    amountMinorUnits: number,
    reason?: string,
  ) => "confirmation-required" | void;
  readonly onTransactionOpen: (trigger: HTMLButtonElement) => void;
}

export function GoalCard({
  goal,
  transactions,
  onDelete,
  onEdit,
  onRecordTransaction,
  onTransactionOpen,
}: GoalCardProps) {
  const titleId = useId();
  const activityTitleId = useId();
  const balanceMinorUnits = deriveBalance(goal.id, transactions);
  const openingBalanceMinorUnits =
    transactions.find(
      (transaction) =>
        transaction.goalId === goal.id && transaction.kind === "opening",
    )?.amountMinorUnits ?? 0;

  return (
    <article
      aria-labelledby={titleId}
      className="goal-card"
      data-goal-state={goal.completedAt === undefined ? "active" : "complete"}
    >
      <header className="goal-card__header">
        <div className="goal-card__identity">
          {goal.iconDataUrl === undefined ? null : (
            <span aria-hidden="true" className="goal-card__artwork">
              <img alt="" src={goal.iconDataUrl} />
            </span>
          )}
          <div className="goal-card__heading">
            <h3 id={titleId}>{goal.name}</h3>
            {goal.completedAt === undefined ? null : (
              <span className="goal-card__complete">
                <CircleCheck aria-hidden="true" size={17} strokeWidth={2} />
                Goal complete
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="goal-card__balance">
        <span>Saved</span>
        <strong>{formatMinorUnits(balanceMinorUnits, goal.currency)}</strong>
        <span>of {formatMinorUnits(goal.targetMinorUnits, goal.currency)}</span>
      </div>

      <ProgressMeter
        balanceMinorUnits={balanceMinorUnits}
        completedAt={goal.completedAt}
        goalName={goal.name}
        targetMinorUnits={goal.targetMinorUnits}
      />

      <div
        aria-label={`Actions for ${goal.name}`}
        className="goal-card__actions"
      >
        <TransactionDialog
          currentBalanceMinorUnits={balanceMinorUnits}
          goal={goal}
          onOpen={onTransactionOpen}
          onSubmit={onRecordTransaction}
        />
        <GoalFormDialog
          mode="edit"
          goal={goal}
          openingBalanceMinorUnits={openingBalanceMinorUnits}
          onSubmit={onEdit}
        />
        <DeleteGoalDialog goal={goal} onConfirm={onDelete} />
      </div>

      <section
        aria-labelledby={activityTitleId}
        className="goal-card__activity"
      >
        <h4 id={activityTitleId}>Recent activity</h4>
        <ActivityList goal={goal} transactions={transactions} />
      </section>
    </article>
  );
}
