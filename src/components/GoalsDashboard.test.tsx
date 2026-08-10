import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useReducer, useState } from "react";
import { describe, expect, it } from "vitest";
import type { SavingsState } from "../domain/types";
import {
  createInitialSavingsReducerState,
  createSavingsReducer,
} from "../state/savings-reducer";
import { GoalsDashboard } from "./GoalsDashboard";

const emptySavings: SavingsState = { goals: [], transactions: [] };

function savingsWithGoals(): SavingsState {
  let id = 0;
  const reducer = createSavingsReducer({
    createId: () => `seed-${++id}`,
    now: () => "2026-08-09T12:00:00.000Z",
  });
  let state = createInitialSavingsReducerState();

  state = reducer(state, {
    type: "goal/create",
    input: {
      name: "Emergency fund",
      targetAmount: "100.00",
      openingBalanceAmount: "50.00",
      currency: "USD",
    },
  });
  state = reducer(state, {
    type: "goal/create",
    input: {
      name: "Tokyo trip",
      targetAmount: "10000",
      openingBalanceAmount: "10000",
      currency: "JPY",
    },
  });

  return state.savings;
}

function DashboardHarness({ initialSavings = emptySavings }) {
  const [reducer] = useState(() => {
    let id = 0;
    return createSavingsReducer({
      createId: () => `id-${++id}`,
      now: () => "2026-08-09T12:00:00.000Z",
    });
  });
  const [state, dispatch] = useReducer(
    reducer,
    createInitialSavingsReducerState(initialSavings),
  );

  return (
    <GoalsDashboard
      dispatch={dispatch}
      pendingWithdrawal={state.pendingWithdrawal}
      savings={state.savings}
    />
  );
}

describe("GoalsDashboard", () => {
  it("creates the first goal from the empty state and announces success", async () => {
    const user = userEvent.setup();
    render(<DashboardHarness />);

    expect(
      screen.getByRole("heading", { name: "Start your first goal" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.type(
      screen.getByRole("textbox", { name: "Goal name" }),
      "Emergency fund",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Target amount" }),
      "1000.00",
    );
    await user.click(screen.getByRole("button", { name: "Create goal" }));

    expect(
      screen.getByRole("heading", { name: "Emergency fund" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Emergency fund created.",
    );
  });

  it("renders every goal and summarizes completed goals", () => {
    render(<DashboardHarness initialSavings={savingsWithGoals()} />);

    expect(
      screen.getByRole("heading", { name: "Emergency fund" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tokyo trip" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Goal summary")).toHaveTextContent(
      "2 goals, 1 completed",
    );
  });

  it("keeps mixed currencies per goal without presenting a combined total", () => {
    render(<DashboardHarness initialSavings={savingsWithGoals()} />);

    expect(screen.getByRole("button", { name: "Add goal" })).toBeVisible();
    expect(screen.getByText("$50.00")).toBeInTheDocument();
    expect(screen.getByText("¥10,000")).toBeInTheDocument();
    expect(screen.queryByText(/total savings/i)).not.toBeInTheDocument();
  });

  it("edits and deletes a goal with success announcements", async () => {
    const user = userEvent.setup();
    render(<DashboardHarness initialSavings={savingsWithGoals()} />);

    await user.click(
      screen.getByRole("button", { name: "Edit Emergency fund" }),
    );
    const name = screen.getByRole("textbox", { name: "Goal name" });
    await user.clear(name);
    await user.type(name, "Safety net");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      screen.getByRole("heading", { name: "Safety net" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Safety net updated.");

    await user.click(screen.getByRole("button", { name: "Delete Safety net" }));
    await user.click(
      screen.getByRole("button", { name: "Delete permanently" }),
    );

    expect(
      screen.queryByRole("heading", { name: "Safety net" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tokyo trip" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Safety net deleted.");
  });

  it("records an ordinary withdrawal directly and announces it", async () => {
    const user = userEvent.setup();
    render(<DashboardHarness initialSavings={savingsWithGoals()} />);

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "10");
    await user.type(
      screen.getByRole("textbox", { name: "Reason (optional)" }),
      "  Prescription refill  ",
    );
    await user.click(screen.getByRole("button", { name: "Record withdrawal" }));

    expect(
      screen.queryByRole("dialog", { name: "Confirm large withdrawal" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "$10.00 withdrawn from Emergency fund.",
    );
    await user.click(screen.getByRole("button", { name: "Show 2 activities" }));
    expect(
      screen.getByRole("list", { name: "Activity for Emergency fund" }),
    ).toHaveTextContent("-$10.00");
    expect(screen.getByText("Prescription refill")).toBeInTheDocument();
  });

  it("preserves activity on warning cancellation and records once on confirmation", async () => {
    const user = userEvent.setup();
    render(<DashboardHarness initialSavings={savingsWithGoals()} />);
    const activity = () =>
      screen.getByRole("list", { name: "Activity for Emergency fund" });
    const transactionTrigger = screen.getByRole("button", {
      name: "Add transaction for Emergency fund",
    });

    await user.click(
      screen.getAllByRole("button", { name: "Show 1 activities" })[0],
    );

    await user.click(transactionTrigger);
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "20");
    await user.type(
      screen.getByRole("textbox", { name: "Reason (optional)" }),
      "Roof repair",
    );
    await user.click(screen.getByRole("button", { name: "Record withdrawal" }));

    expect(
      screen.getByRole("dialog", { name: "Confirm large withdrawal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep savings" })).toHaveFocus();
    expect(screen.getByText("Roof repair")).toBeInTheDocument();
    expect(within(activity()).getAllByRole("listitem")).toHaveLength(1);
    expect(
      within(activity()).queryByText("Roof repair"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep savings" }));
    expect(
      screen.queryByRole("dialog", { name: "Confirm large withdrawal" }),
    ).not.toBeInTheDocument();
    expect(within(activity()).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(transactionTrigger).toHaveFocus();

    await user.click(transactionTrigger);
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "20");
    await user.type(
      screen.getByRole("textbox", { name: "Reason (optional)" }),
      "Roof repair",
    );
    await user.click(screen.getByRole("button", { name: "Record withdrawal" }));
    await user.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );

    expect(within(activity()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(activity()).getByText("-$20.00")).toBeInTheDocument();
    expect(within(activity()).getAllByText("Roof repair")).toHaveLength(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "$20.00 withdrawn from Emergency fund.",
    );
    expect(transactionTrigger).toHaveFocus();
  });

  it("cancels a warned withdrawal with Escape and restores focus", async () => {
    const user = userEvent.setup();
    render(<DashboardHarness initialSavings={savingsWithGoals()} />);
    const transactionTrigger = screen.getByRole("button", {
      name: "Add transaction for Emergency fund",
    });

    await user.click(
      screen.getAllByRole("button", { name: "Show 1 activities" })[0],
    );

    await user.click(transactionTrigger);
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "20");
    await user.click(screen.getByRole("button", { name: "Record withdrawal" }));
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("dialog", { name: "Confirm large withdrawal" }),
    ).not.toBeInTheDocument();
    expect(transactionTrigger).toHaveFocus();
    expect(
      within(
        screen.getByRole("list", { name: "Activity for Emergency fund" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(1);
  });
});
