import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createGoal } from "../domain/goals";
import { GoalFormDialog } from "./GoalFormDialog";

describe("GoalFormDialog", () => {
  it("opens, cancels, and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(<GoalFormDialog mode="create" onSubmit={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Add goal" });
    await user.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Create a saving goal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Goal name" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("keeps invalid input open and links the error to its field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GoalFormDialog mode="create" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.click(screen.getByRole("button", { name: "Create goal" }));

    const nameInput = screen.getByRole("textbox", { name: "Goal name" });
    const error = screen.getByText("Goal name is required.");

    expect(nameInput).toHaveAttribute("aria-describedby", error.id);
    expect(nameInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("locks immutable values and submits editable values in edit mode", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const created = createGoal(
      {
        name: "Emergency fund",
        targetAmount: "100.00",
        openingBalanceAmount: "50.00",
        currency: "USD",
        withdrawalWarningPercent: 20,
      },
      {
        createId: () => "id-1",
        now: () => "2026-08-09T12:00:00.000Z",
      },
    );

    render(
      <GoalFormDialog
        mode="edit"
        goal={created.goal}
        openingBalanceMinorUnits={created.openingTransaction.amountMinorUnits}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: "Edit Emergency fund" }),
    );

    expect(screen.getByRole("textbox", { name: "Currency" })).toBeDisabled();
    expect(
      screen.getByRole("textbox", { name: "Opening balance" }),
    ).toBeDisabled();

    const name = screen.getByRole("textbox", { name: "Goal name" });
    const target = screen.getByRole("textbox", { name: "Target amount" });
    const threshold = screen.getByRole("spinbutton", {
      name: "Withdrawal warning threshold (%)",
    });
    await user.clear(name);
    await user.type(name, "Rainy day fund");
    await user.clear(target);
    await user.type(target, "125.00");
    await user.clear(threshold);
    await user.type(threshold, "15");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Rainy day fund",
      targetAmount: "125.00",
      withdrawalWarningPercent: 15,
    });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("contains keyboard focus within the open dialog", async () => {
    const user = userEvent.setup();
    render(<GoalFormDialog mode="create" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    const firstControl = screen.getByRole("textbox", { name: "Goal name" });
    const lastControl = screen.getByRole("button", { name: "Create goal" });

    expect(firstControl).toHaveFocus();
    await user.tab({ shift: true });
    expect(lastControl).toHaveFocus();

    await user.tab();
    expect(firstControl).toHaveFocus();
  });
});
