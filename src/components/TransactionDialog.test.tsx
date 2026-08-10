import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoal } from "../domain/goals";
import { TransactionDialog } from "./TransactionDialog";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();

  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduced,
  };
});

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

describe("TransactionDialog", () => {
  beforeEach(() => {
    motionPreference.reduced = false;
  });

  it("marks mode changes and conditional regions for local motion", async () => {
    const user = userEvent.setup();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    const deposit = screen.getByRole("button", { name: "Deposit" });
    const withdrawal = screen.getByRole("button", { name: "Withdrawal" });
    expect(deposit).toHaveAttribute("aria-pressed", "true");
    expect(withdrawal).toHaveAttribute("aria-pressed", "false");

    await user.click(withdrawal);
    expect(deposit).toHaveAttribute("aria-pressed", "false");
    expect(withdrawal).toHaveAttribute("aria-pressed", "true");
    expect(
      screen
        .getByRole("textbox", { name: "Reason (optional)" })
        .closest('[data-motion-region="withdrawal-reason"]'),
    ).toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: "Amount" }), "25");
    expect(
      screen
        .getByText("Projected balance")
        .closest('[data-motion-region="transaction-preview"]'),
    ).toHaveAttribute("aria-live", "polite");

    await user.click(deposit);
    expect(
      screen.queryByRole("textbox", { name: "Reason (optional)" }),
    ).not.toBeInTheDocument();
  });

  it("uses immediate conditional states when reduced motion is preferred", async () => {
    motionPreference.reduced = true;
    const user = userEvent.setup();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={vi.fn()}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "25");

    expect(
      screen
        .getByRole("textbox", { name: "Reason (optional)" })
        .closest('[data-motion-region="withdrawal-reason"]'),
    ).toHaveAttribute("data-motion", "reduced");
    expect(
      screen
        .getByText("Projected balance")
        .closest('[data-motion-region="transaction-preview"]'),
    ).toHaveAttribute("data-motion", "reduced");
  });

  it("previews and submits a withdrawal in currency minor units", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "200");
    const reason = screen.getByRole("textbox", { name: "Reason (optional)" });
    expect(reason).toHaveAttribute("maxlength", "160");
    await user.type(reason, "  Planned car repair  ");

    expect(screen.getByText("Projected balance")).toBeInTheDocument();
    expect(screen.getByText("$300.00")).toBeInTheDocument();
    expect(screen.getByText("Projected progress")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Record withdrawal" }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit).toHaveBeenCalledWith(
      "withdrawal",
      20_000,
      "Planned car repair",
    );
  });

  it("previews and submits a deposit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    expect(
      screen.queryByRole("textbox", { name: "Reason (optional)" }),
    ).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "100");

    expect(screen.getByText("$600.00")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record deposit" }));

    expect(onSubmit).toHaveBeenCalledWith("deposit", 10_000);
  });

  it("omits a withdrawal reason after switching to deposit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(
      screen.getByRole("textbox", { name: "Reason (optional)" }),
      "Should not leak",
    );
    await user.click(screen.getByRole("button", { name: "Deposit" }));
    await user.type(screen.getByRole("textbox", { name: "Amount" }), "25");
    await user.click(screen.getByRole("button", { name: "Record deposit" }));

    expect(onSubmit).toHaveBeenCalledWith("deposit", 2500);
  });

  it("resets the reason each time the dialog opens", async () => {
    const user = userEvent.setup();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={vi.fn()}
      />,
    );
    const trigger = screen.getByRole("button", {
      name: "Add transaction for Emergency fund",
    });

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    await user.type(
      screen.getByRole("textbox", { name: "Reason (optional)" }),
      "Temporary reason",
    );
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitForElementToBeRemoved(dialog);
    await user.click(trigger);
    expect(screen.getByRole("textbox", { name: "Amount" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));

    expect(
      screen.getByRole("textbox", { name: "Reason (optional)" }),
    ).toHaveValue("");
  });

  it("links malformed amount errors to the field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    const amount = screen.getByRole("textbox", { name: "Amount" });
    await user.type(amount, "12.345");
    await user.click(screen.getByRole("button", { name: "Record deposit" }));

    expect(amount).toHaveAccessibleDescription(
      "Enter a valid amount with no more than 2 decimal places.",
    );
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows an overdraft as a blocking field error before submission", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={50_000}
        goal={emergencyFundGoal()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Withdrawal" }));
    const amount = screen.getByRole("textbox", { name: "Amount" });
    await user.type(amount, "600");

    expect(amount).toHaveAccessibleDescription(
      "Withdrawal cannot exceed the current balance.",
    );
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("blocks a deposit that would make the projected balance unsafe", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <TransactionDialog
        currentBalanceMinorUnits={Number.MAX_SAFE_INTEGER - 1}
        goal={emergencyFundGoal()}
        onSubmit={onSubmit}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "Add transaction for Emergency fund",
      }),
    );
    const amount = screen.getByRole("textbox", { name: "Amount" });
    await user.type(amount, "0.02");

    expect(amount).toHaveAccessibleDescription(
      "Projected balance is outside the safe integer range.",
    );
    expect(amount).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
