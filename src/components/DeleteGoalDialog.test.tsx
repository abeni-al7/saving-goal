import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createGoal } from "../domain/goals";
import {
  createInitialSavingsReducerState,
  createSavingsReducer,
} from "../state/savings-reducer";
import { DeleteGoalDialog } from "./DeleteGoalDialog";

const goal = createGoal(
  {
    name: "Emergency fund",
    targetAmount: "100.00",
    openingBalanceAmount: "50.00",
    currency: "USD",
  },
  {
    createId: () => "id-1",
    now: () => "2026-08-09T12:00:00.000Z",
  },
).goal;

describe("DeleteGoalDialog", () => {
  it("warns about history loss and cancels without deleting", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteGoalDialog goal={goal} onConfirm={onConfirm} />);

    const trigger = screen.getByRole("button", {
      name: "Delete Emergency fund",
    });
    await user.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Delete Emergency fund?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/permanently deletes.*transaction history/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();

    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
    expect(trigger).toHaveFocus();
  });

  it("confirms permanent deletion and cascades transaction history", async () => {
    const user = userEvent.setup();
    const reducer = createSavingsReducer({
      createId: () => "id-1",
      now: () => "2026-08-09T12:00:00.000Z",
    });
    let state = reducer(createInitialSavingsReducerState(), {
      type: "goal/create",
      input: {
        name: "Emergency fund",
        targetAmount: "100.00",
        openingBalanceAmount: "50.00",
        currency: "USD",
      },
    });
    const storedGoal = state.savings.goals[0];

    render(
      <DeleteGoalDialog
        goal={storedGoal}
        onConfirm={(goalId) => {
          state = reducer(state, { type: "goal/delete", goalId });
        }}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Delete Emergency fund" }),
    );
    await user.click(
      screen.getByRole("button", { name: "Delete permanently" }),
    );

    const dialog = screen.getByRole("dialog");
    expect(state.savings.goals).toHaveLength(1);
    await waitForElementToBeRemoved(dialog);
    expect(state.savings).toEqual({ goals: [], transactions: [] });
  });
});
