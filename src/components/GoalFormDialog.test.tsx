import {
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeGoalIcon } from "../browser/goal-icon-upload";
import { createGoal } from "../domain/goals";
import { GoalFormDialog } from "./GoalFormDialog";

vi.mock("../browser/goal-icon-upload", () => ({
  normalizeGoalIcon: vi.fn(),
}));

const firstIconDataUrl = "data:image/png;base64,AAAA";
const replacementIconDataUrl = "data:image/png;base64,AQID";

describe("GoalFormDialog", () => {
  beforeEach(() => {
    vi.mocked(normalizeGoalIcon).mockReset();
    vi.mocked(normalizeGoalIcon).mockResolvedValue(firstIconDataUrl);
  });

  it("opens, cancels, and restores focus to its trigger", async () => {
    const user = userEvent.setup();
    render(<GoalFormDialog mode="create" onSubmit={vi.fn()} />);

    const trigger = screen.getByRole("button", { name: "Add goal" });
    await user.click(trigger);

    expect(
      screen.getByRole("dialog", { name: "Create a saving goal" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Goal name" })).toHaveFocus();

    const dialog = screen.getByRole("dialog", {
      name: "Create a saving goal",
    });
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(dialog).toBeInTheDocument();
    expect(trigger).not.toHaveFocus();
    await waitForElementToBeRemoved(dialog);
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
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Rainy day fund",
      targetAmount: "125.00",
      withdrawalWarningPercent: 15,
      artwork: { type: "preserve" },
    });
    await waitForElementToBeRemoved(dialog);
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

  it("previews normalized artwork and includes it in goal creation", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GoalFormDialog mode="create" onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    const artworkInput = screen.getByLabelText("Goal artwork (optional)");
    const file = new File(["image"], "camera.webp", { type: "image/webp" });
    await user.upload(artworkInput, file);

    const preview = await screen.findByRole("img", {
      name: "Goal artwork preview",
    });
    expect(preview).toHaveAttribute("src", firstIconDataUrl);
    expect(artworkInput).toHaveAttribute(
      "accept",
      "image/png,image/jpeg,image/webp",
    );

    await user.type(
      screen.getByRole("textbox", { name: "Goal name" }),
      "Camera",
    );
    await user.type(
      screen.getByRole("textbox", { name: "Target amount" }),
      "1200",
    );
    await user.click(screen.getByRole("button", { name: "Create goal" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Camera",
      targetAmount: "1200",
      openingBalanceAmount: "0",
      currency: "USD",
      withdrawalWarningPercent: 20,
      iconDataUrl: firstIconDataUrl,
    });
  });

  it("links upload failures to the file input without disabling submission", async () => {
    const user = userEvent.setup();
    vi.mocked(normalizeGoalIcon).mockRejectedValueOnce(
      new Error("Choose a PNG, JPEG, or WebP image."),
    );
    render(<GoalFormDialog mode="create" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    const artworkInput = screen.getByLabelText("Goal artwork (optional)");
    await user.upload(
      artworkInput,
      new File(["image"], "unreadable.png", { type: "image/png" }),
    );

    const error = await screen.findByText("Choose a PNG, JPEG, or WebP image.");
    expect(artworkInput).toHaveAttribute("aria-describedby", error.id);
    expect(artworkInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Create goal" })).toBeEnabled();
  });

  it("keeps submission disabled until the newest selection finishes", async () => {
    const user = userEvent.setup();
    let resolveFirst!: (value: string) => void;
    let resolveSecond!: (value: string) => void;
    vi.mocked(normalizeGoalIcon)
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveSecond = resolve;
        }),
      );
    render(<GoalFormDialog mode="create" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    const artworkInput = screen.getByLabelText("Goal artwork (optional)");
    await user.upload(
      artworkInput,
      new File(["first"], "first.png", { type: "image/png" }),
    );
    expect(screen.getByRole("status")).toHaveTextContent("Processing artwork");
    expect(screen.getByRole("button", { name: "Create goal" })).toBeDisabled();

    await user.upload(
      artworkInput,
      new File(["second"], "second.png", { type: "image/png" }),
    );
    resolveSecond(replacementIconDataUrl);
    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: "Goal artwork preview" }),
      ).toHaveAttribute("src", replacementIconDataUrl);
    });
    expect(screen.getByRole("button", { name: "Create goal" })).toBeEnabled();

    resolveFirst(firstIconDataUrl);
    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: "Goal artwork preview" }),
      ).toHaveAttribute("src", replacementIconDataUrl);
    });
  });

  it("submits explicit artwork replacement and removal actions while editing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const created = createGoal(
      {
        name: "Camera",
        targetAmount: "1200",
        openingBalanceAmount: "0",
        currency: "USD",
        iconDataUrl: firstIconDataUrl,
      },
      {
        createId: () => "id-1",
        now: () => "2026-08-09T12:00:00.000Z",
      },
    );
    vi.mocked(normalizeGoalIcon).mockResolvedValueOnce(replacementIconDataUrl);
    render(
      <GoalFormDialog
        mode="edit"
        goal={created.goal}
        openingBalanceMinorUnits={0}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Edit Camera" }));
    expect(
      screen.getByRole("img", { name: "Goal artwork preview" }),
    ).toHaveAttribute("src", firstIconDataUrl);
    await user.upload(
      screen.getByLabelText("Replace artwork"),
      new File(["replacement"], "replacement.jpg", { type: "image/jpeg" }),
    );
    await waitFor(() => {
      expect(
        screen.getByRole("img", { name: "Goal artwork preview" }),
      ).toHaveAttribute("src", replacementIconDataUrl);
    });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({
        artwork: { type: "replace", iconDataUrl: replacementIconDataUrl },
      }),
    );

    await user.click(screen.getByRole("button", { name: "Edit Camera" }));
    await user.click(screen.getByRole("button", { name: "Remove artwork" }));
    expect(
      screen.queryByRole("img", { name: "Goal artwork preview" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenLastCalledWith(
      expect.objectContaining({ artwork: { type: "remove" } }),
    );
  });

  it("discards canceled artwork changes and reinitializes the next open", async () => {
    const user = userEvent.setup();
    render(<GoalFormDialog mode="create" onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add goal" }));
    await user.upload(
      screen.getByLabelText("Goal artwork (optional)"),
      new File(["image"], "goal.png", { type: "image/png" }),
    );
    await screen.findByRole("img", { name: "Goal artwork preview" });
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitForElementToBeRemoved(dialog);
    await user.click(screen.getByRole("button", { name: "Add goal" }));

    expect(
      screen.queryByRole("img", { name: "Goal artwork preview" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Goal artwork (optional)")).toHaveValue("");
  });
});
