import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { currencyCode } from "../domain/money";
import type { Goal, GoalId, Transaction, TransactionId } from "../domain/types";
import { GoalCard } from "./GoalCard";

const goalId = "goal-1" as GoalId;
const goal: Goal = {
  id: goalId,
  name: "Emergency fund",
  targetMinorUnits: 100_000,
  currency: currencyCode("USD"),
  withdrawalWarningPercent: 20,
  createdAt: "2026-08-09T10:00:00.000Z",
};
const transactions: readonly Transaction[] = [
  {
    id: "transaction-1" as TransactionId,
    goalId,
    kind: "opening",
    amountMinorUnits: 40_000,
    occurredAt: "2026-08-09T10:00:00.000Z",
  },
  {
    id: "transaction-2" as TransactionId,
    goalId,
    kind: "deposit",
    amountMinorUnits: 10_000,
    occurredAt: "2026-08-09T11:00:00.000Z",
  },
];

const callbacks = {
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onRecordTransaction: vi.fn(),
  onTransactionOpen: vi.fn(),
};

describe("GoalCard", () => {
  it("renders artwork decoratively in a dedicated heading region", () => {
    const { container } = render(
      <GoalCard
        goal={{ ...goal, iconDataUrl: "data:image/png;base64,AAAA" }}
        transactions={transactions}
        {...callbacks}
      />,
    );

    const artworkRegion = container.querySelector(".goal-card__artwork");
    const artwork = artworkRegion?.querySelector("img");
    expect(artworkRegion).toBeInTheDocument();
    expect(artwork).toHaveAttribute("alt", "");
    expect(artwork).toHaveAttribute("src", "data:image/png;base64,AAAA");
    expect(
      screen.getByRole("heading", { name: "Emergency fund" }),
    ).toBeInTheDocument();
  });

  it("shows no artwork region or placeholder when artwork is absent", () => {
    const { container } = render(
      <GoalCard goal={goal} transactions={transactions} {...callbacks} />,
    );

    expect(
      container.querySelector(".goal-card__artwork"),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("formats the balance and target and presents collapsed activity", () => {
    render(<GoalCard goal={goal} transactions={transactions} {...callbacks} />);

    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("of $1,000.00")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Progress for Emergency fund",
      }),
    ).toHaveAttribute("aria-valuetext", "50% funded");
    expect(
      screen.getByRole("heading", { name: "Recent activity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show 2 activities" }),
    ).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("list", { name: "Activity for Emergency fund" }),
    ).not.toBeInTheDocument();
  });

  it("makes Add transaction visible while preserving compact goal actions", () => {
    const longName =
      "A deliberately long multigenerational family sabbatical and learning fund";
    render(
      <GoalCard
        goal={{ ...goal, name: longName }}
        transactions={transactions}
        {...callbacks}
      />,
    );

    expect(screen.getByRole("heading", { name: longName })).toHaveTextContent(
      longName,
    );
    const transactionAction = screen.getByRole("button", {
      name: `Add transaction for ${longName}`,
    });
    expect(transactionAction).toHaveTextContent("Add transaction");
    expect(
      within(transactionAction).getByText("Add transaction"),
    ).not.toHaveAttribute("aria-hidden");
    expect(transactionAction.querySelector("svg")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Edit ${longName}` }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: `Delete ${longName}` }),
    ).toBeInTheDocument();
    expect(screen.getByText("Edit goal")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    expect(screen.getByText("Delete goal")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("marks a completed goal without hiding overfunded progress", () => {
    render(
      <GoalCard
        goal={{
          ...goal,
          completedAt: "2026-08-09T12:00:00.000Z",
          targetMinorUnits: 40_000,
        }}
        transactions={transactions}
        {...callbacks}
      />,
    );

    expect(screen.getByRole("article")).toHaveAttribute(
      "data-goal-state",
      "complete",
    );
    expect(screen.getByText("Goal complete")).toBeInTheDocument();
    expect(screen.getByText("125%")).toBeInTheDocument();
  });
});
