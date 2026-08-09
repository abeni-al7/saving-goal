import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createGoal } from "../domain/goals";
import { WithdrawalWarningDialog } from "./WithdrawalWarningDialog";

function emergencyFundGoal() {
  return createGoal(
    {
      name: "Emergency fund",
      targetAmount: "1000.00",
      openingBalanceAmount: "500.00",
      currency: "USD",
    },
    {
      createId: () => "seed-id",
      now: () => "2026-08-09T12:00:00.000Z",
    },
  ).goal;
}

describe("WithdrawalWarningDialog", () => {
  it("shows projected impact and exposes separate cancel and confirm actions", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <WithdrawalWarningDialog
        amountMinorUnits={20_000}
        goal={emergencyFundGoal()}
        impactPercent={40}
        projectedBalanceMinorUnits={30_000}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    expect(
      screen.getByRole("dialog", { name: "Confirm large withdrawal" }),
    ).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("$300.00")).toBeInTheDocument();
    expect(screen.getByText("40% of the current balance")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Keep savings" }));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
