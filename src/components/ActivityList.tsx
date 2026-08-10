import { formatMinorUnits } from "../domain/money";
import { transactionsForGoal } from "../domain/transactions";
import type { Goal, Transaction, TransactionKind } from "../domain/types";

interface ActivityListProps {
  readonly goal: Goal;
  readonly transactions: readonly Transaction[];
  readonly locale?: string;
}

export function ActivityList({
  goal,
  transactions,
  locale,
}: ActivityListProps) {
  const activity = transactionsForGoal(transactions, goal.id);

  if (activity.length === 0) {
    return <p className="activity-empty">No activity yet.</p>;
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <ol className="activity-list" aria-label={`Activity for ${goal.name}`}>
      {activity.map((transaction) => (
        <li key={transaction.id}>
          <div>
            <span className="activity-list__kind">
              {transactionLabel(transaction.kind)}
            </span>
            <time dateTime={transaction.occurredAt}>
              {dateFormatter.format(new Date(transaction.occurredAt))}
            </time>
            {transaction.kind === "withdrawal" &&
            transaction.reason !== undefined ? (
              <p
                className="activity-list__reason"
                data-testid="withdrawal-reason"
              >
                {transaction.reason}
              </p>
            ) : null}
          </div>
          <span className="activity-list__amount">
            {formatMinorUnits(
              transaction.kind === "withdrawal"
                ? -transaction.amountMinorUnits
                : transaction.amountMinorUnits,
              goal.currency,
              locale,
            )}
          </span>
        </li>
      ))}
    </ol>
  );
}

function transactionLabel(kind: TransactionKind): string {
  switch (kind) {
    case "opening":
      return "Opening balance";
    case "deposit":
      return "Deposit";
    case "withdrawal":
      return "Withdrawal";
  }
}
