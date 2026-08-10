import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
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
  it("shows projected impact and completes cancellation after exit", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(
      <WithdrawalWarningDialog
        amountMinorUnits={20_000}
        goal={emergencyFundGoal()}
        impactPercent={40}
        projectedBalanceMinorUnits={30_000}
        reason="Urgent boiler repair"
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
    expect(screen.getByText("Urgent boiler repair")).toBeInTheDocument();

    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Keep savings" }));
    expect(dialog).toBeInTheDocument();
    await waitForElementToBeRemoved(dialog);
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("completes confirmation after exit", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <WithdrawalWarningDialog
        amountMinorUnits={20_000}
        goal={emergencyFundGoal()}
        impactPercent={40}
        projectedBalanceMinorUnits={30_000}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    const dialog = screen.getByRole("dialog");
    await user.click(
      screen.getByRole("button", { name: "Confirm withdrawal" }),
    );
    expect(onConfirm).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("completes cancellation only after its surface exits", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [isVisible, setIsVisible] = useState(true);
      return isVisible ? (
        <WithdrawalWarningDialog
          amountMinorUnits={20_000}
          goal={emergencyFundGoal()}
          impactPercent={40}
          projectedBalanceMinorUnits={30_000}
          onCancel={() => setIsVisible(false)}
          onConfirm={vi.fn()}
        />
      ) : null;
    }

    render(<Harness />);
    const dialog = screen.getByRole("dialog");

    await user.click(screen.getByRole("button", { name: "Keep savings" }));

    expect(dialog).toBeInTheDocument();
    await waitForElementToBeRemoved(dialog);
  });
});
