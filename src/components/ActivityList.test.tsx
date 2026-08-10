import {
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoal } from "../domain/goals";
import type { Transaction, TransactionId } from "../domain/types";
import { ActivityList } from "./ActivityList";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();

  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduced,
  };
});

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
  beforeEach(() => {
    motionPreference.reduced = false;
  });

  it("starts collapsed and toggles a goal-specific controlled ledger", async () => {
    const user = userEvent.setup();
    const { goal, transactions } = activityFixture();
    render(
      <ActivityList goal={goal} locale="en-US" transactions={transactions} />,
    );

    const disclosure = screen.getByRole("button", {
      name: "Show 3 activities",
    });
    const ledgerId = disclosure.getAttribute("aria-controls");
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(ledgerId).toBeTruthy();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();

    await user.click(disclosure);

    expect(disclosure).toHaveAccessibleName("Hide activity");
    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("list")).toHaveAttribute("id", ledgerId);

    const ledger = screen.getByRole("list");
    await user.click(disclosure);

    expect(disclosure).toHaveAccessibleName("Show 3 activities");
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    await waitForElementToBeRemoved(ledger);
  });

  it("shows every matching activity newest first with deterministic ties", async () => {
    const user = userEvent.setup();
    const { goal, transactions } = activityFixture();
    const laterTie: Transaction = {
      id: "withdrawal-z" as TransactionId,
      goalId: goal.id,
      kind: "withdrawal",
      amountMinorUnits: 2_500,
      occurredAt: "2026-08-09T10:00:00.000Z",
    };

    render(
      <ActivityList
        goal={goal}
        locale="en-US"
        transactions={[...transactions, laterTie]}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Show 4 activities" }));

    const items = screen.getAllByRole("listitem");
    expect(within(items[0]).getByText("-$25.00")).toBeInTheDocument();
    expect(within(items[1]).getByText("$100.00")).toBeInTheDocument();
    expect(within(items[2]).getByText("-$50.00")).toBeInTheDocument();
    expect(within(items[3]).getByText("$500.00")).toBeInTheDocument();
    expect(screen.getAllByText(/Aug 9, 2026/)).toHaveLength(4);
  });

  it("shows an empty activity message without a disclosure control", () => {
    const { goal } = activityFixture();
    render(<ActivityList goal={goal} transactions={[]} />);

    expect(screen.getByText("No activity yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("uses immediate disclosure states when reduced motion is preferred", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    const { goal, transactions } = activityFixture();
    render(<ActivityList goal={goal} transactions={transactions} />);

    const disclosure = screen.getByRole("button", {
      name: "Show 3 activities",
    });
    expect(disclosure.closest(".activity-disclosure")).toHaveAttribute(
      "data-motion",
      "reduced",
    );

    await user.click(disclosure);

    expect(screen.getByRole("list")).toBeInTheDocument();
  });

  it("omits reason markup when a withdrawal has no reason", async () => {
    const user = userEvent.setup();
    const { goal, transactions } = activityFixture();
    const withoutReason = transactions.map((transaction) =>
      transaction.kind === "withdrawal"
        ? { ...transaction, reason: undefined }
        : transaction,
    );

    render(
      <ActivityList goal={goal} locale="en-US" transactions={withoutReason} />,
    );

    await user.click(screen.getByRole("button", { name: "Show 3 activities" }));

    expect(screen.queryByText("Reason")).not.toBeInTheDocument();
    expect(screen.queryByTestId("withdrawal-reason")).not.toBeInTheDocument();
  });

  it("labels and shows a full long reason with its matching withdrawal", async () => {
    const user = userEvent.setup();
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

    await user.click(screen.getByRole("button", { name: "Show 3 activities" }));

    const withdrawal = screen
      .getByText("Withdrawal")
      .closest("li") as HTMLElement;
    expect(within(withdrawal).getByText("Reason")).toBeInTheDocument();
    expect(
      within(withdrawal).getByTestId("withdrawal-reason"),
    ).toHaveTextContent(longReason);
    expect(
      within(withdrawal).getByTestId("withdrawal-reason"),
    ).toHaveTextContent(longReason, { normalizeWhitespace: false });
  });
});
