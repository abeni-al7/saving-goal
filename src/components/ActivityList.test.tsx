import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createGoal } from "../domain/goals";
import type { Transaction, TransactionId } from "../domain/types";
import { ActivityList } from "./ActivityList";

function activityFixture() {
  const created = createGoal(
    {
      name: "Emergency fund",
      targetAmount: "1000.00",
      openingBalanceAmount: "500.00",
      currency: "USD",
    },
    {
      createId: () => "opening-id",
      now: () => "2026-08-09T08:00:00.000Z",
    },
  );
  const deposit: Transaction = {
    id: "deposit-id" as TransactionId,
    goalId: created.goal.id,
    kind: "deposit",
    amountMinorUnits: 10_000,
    occurredAt: "2026-08-09T10:00:00.000Z",
  };
  const withdrawal: Transaction = {
    id: "withdrawal-id" as TransactionId,
    goalId: created.goal.id,
    kind: "withdrawal",
    amountMinorUnits: 5_000,
    occurredAt: "2026-08-09T09:00:00.000Z",
    reason: "Emergency dentist visit",
  };

  return {
    goal: created.goal,
    transactions: [deposit, created.openingTransaction, withdrawal],
  };
}

describe("ActivityList", () => {
  it("shows opening, withdrawal, and deposit activity chronologically", () => {
    const { goal, transactions } = activityFixture();
    render(
      <ActivityList goal={goal} locale="en-US" transactions={transactions} />,
    );

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("Opening balance")).toBeInTheDocument();
    expect(within(items[0]).getByText("$500.00")).toBeInTheDocument();
    expect(within(items[1]).getByText("Withdrawal")).toBeInTheDocument();
    expect(within(items[1]).getByText("-$50.00")).toBeInTheDocument();
    expect(
      within(items[1]).getByText("Emergency dentist visit"),
    ).toBeInTheDocument();
    expect(within(items[2]).getByText("Deposit")).toBeInTheDocument();
    expect(within(items[2]).getByText("$100.00")).toBeInTheDocument();
    expect(screen.getAllByText(/Aug 9, 2026/)).toHaveLength(3);
  });

  it("shows an empty activity message", () => {
    const { goal } = activityFixture();
    render(<ActivityList goal={goal} transactions={[]} />);

    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
  });

  it("omits reason markup when a withdrawal has no reason", () => {
    const { goal, transactions } = activityFixture();
    const withoutReason = transactions.map((transaction) =>
      transaction.kind === "withdrawal"
        ? { ...transaction, reason: undefined }
        : transaction,
    );

    render(
      <ActivityList goal={goal} locale="en-US" transactions={withoutReason} />,
    );

    expect(screen.queryByTestId("withdrawal-reason")).not.toBeInTheDocument();
  });

  it("keeps a long withdrawal reason with its matching activity metadata", () => {
    const { goal, transactions } = activityFixture();
    const longReason = "r".repeat(160);
    const withLongReason = transactions.map((transaction) =>
      transaction.kind === "withdrawal"
        ? { ...transaction, reason: longReason }
        : transaction,
    );

    render(
      <ActivityList goal={goal} locale="en-US" transactions={withLongReason} />,
    );

    expect(screen.getByTestId("withdrawal-reason")).toHaveTextContent(
      longReason,
    );
  });
});
