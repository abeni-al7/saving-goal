import { render, screen } from "@testing-library/react";
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

  return <GoalsDashboard savings={state.savings} dispatch={dispatch} />;
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
});
