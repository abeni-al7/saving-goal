import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useState } from "react";
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
  const [isExpanded, setIsExpanded] = useState(false);
  const activityId = useId();
  const shouldReduceMotion = useReducedMotion();
  const activity = transactionsForGoal(transactions, goal.id).reverse();

  if (activity.length === 0) {
    return <p className="activity-empty">No activity yet.</p>;
  }

  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div
      className="activity-disclosure"
      data-motion={shouldReduceMotion ? "reduced" : "animated"}
    >
      <button
        aria-controls={activityId}
        aria-expanded={isExpanded}
        className="activity-disclosure__trigger"
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
      >
        <span>
          {isExpanded ? "Hide activity" : `Show ${activity.length} activities`}
        </span>
        <motion.span
          aria-hidden="true"
          animate={{ rotate: isExpanded ? 180 : 0 }}
          className="activity-disclosure__chevron"
          transition={{ duration: shouldReduceMotion ? 0 : 0.16 }}
        >
          <ChevronDown size={17} strokeWidth={1.8} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.ol
            animate={{ opacity: 1, y: 0 }}
            aria-label={`Activity for ${goal.name}`}
            className="activity-list"
            exit={{ opacity: 0, y: -6 }}
            id={activityId}
            initial={shouldReduceMotion ? false : { opacity: 0, y: -6 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          >
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
                    <div className="activity-list__reason-note">
                      <span className="activity-list__reason-label">
                        Reason
                      </span>
                      <p
                        className="activity-list__reason"
                        data-testid="withdrawal-reason"
                      >
                        {transaction.reason}
                      </p>
                    </div>
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
          </motion.ol>
        ) : null}
      </AnimatePresence>
    </div>
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
