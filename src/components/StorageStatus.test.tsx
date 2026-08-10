import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { StorageStatus as StorageStatusValue } from "../state/savings-reducer";
import { StorageStatus } from "./StorageStatus";

describe("StorageStatus", () => {
  it("offers session-only continuation when storage is unavailable", async () => {
    const user = userEvent.setup();
    const onContinueInSession = vi.fn();

    render(
      <StorageStatus
        status={{
          kind: "unavailable",
          message: "Saved data could not be accessed.",
        }}
        onContinueInSession={onContinueInSession}
        onResetSavedData={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saved data could not be accessed.",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue this session" }),
    );

    expect(onContinueInSession).toHaveBeenCalledOnce();
  });

  it("explains quota failures without discarding the current session", async () => {
    const user = userEvent.setup();
    const onContinueInSession = vi.fn();

    render(
      <StorageStatus
        status={{
          kind: "save-error",
          reason: "quota-exceeded",
          message: "Changes could not be saved because storage is full.",
        }}
        onContinueInSession={onContinueInSession}
        onResetSavedData={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your current changes are still available in this session.",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue this session" }),
    );

    expect(onContinueInSession).toHaveBeenCalledOnce();
  });

  it("keeps corrupt saved data when reset is cancelled", async () => {
    const user = userEvent.setup();
    const onResetSavedData = vi.fn();

    render(
      <StorageStatus
        status={{
          kind: "recovery-required",
          reason: "malformed-json",
          message: "Saved data could not be loaded and has been preserved.",
        }}
        onContinueInSession={vi.fn()}
        onResetSavedData={onResetSavedData}
      />,
    );

    const resetTrigger = screen.getByRole("button", {
      name: "Reset saved data",
    });
    await user.click(resetTrigger);

    expect(
      screen.getByRole("dialog", { name: "Reset saved data?" }),
    ).toBeInTheDocument();
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(cancelButton).toHaveFocus();

    const dialog = screen.getByRole("dialog");
    await user.click(cancelButton);

    expect(onResetSavedData).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
    expect(resetTrigger).toHaveFocus();
  });

  it("resets corrupt saved data only after explicit confirmation", async () => {
    const user = userEvent.setup();
    const onResetSavedData = vi.fn(() => true);

    render(
      <StorageStatus
        status={{
          kind: "recovery-required",
          reason: "invalid-data",
          message: "Saved data could not be loaded and has been preserved.",
        }}
        onContinueInSession={vi.fn()}
        onResetSavedData={onResetSavedData}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Reset saved data" }));
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Reset permanently" }));

    expect(dialog).toBeInTheDocument();
    expect(onResetSavedData).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
    expect(onResetSavedData).toHaveBeenCalledOnce();
  });

  it("closes the dialog and focuses the updated status when reset fails", async () => {
    const user = userEvent.setup();

    function ResetFailureHarness() {
      const [status, setStatus] = useState<StorageStatusValue>({
        kind: "recovery-required",
        reason: "invalid-data",
        message: "Saved data could not be loaded and has been preserved.",
      });

      return (
        <StorageStatus
          status={status}
          onContinueInSession={vi.fn()}
          onResetSavedData={() => {
            setStatus({
              kind: "unavailable",
              message: "Saved data could not be reset.",
            });
            return false;
          }}
        />
      );
    }

    render(<ResetFailureHarness />);
    await user.click(screen.getByRole("button", { name: "Reset saved data" }));
    const dialog = screen.getByRole("dialog");
    await user.click(screen.getByRole("button", { name: "Reset permanently" }));

    await waitForElementToBeRemoved(dialog);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Saved data could not be reset.",
    );
    expect(screen.getByRole("alert")).toHaveFocus();
  });

  it("shows when changes are intentionally limited to the session", () => {
    render(
      <StorageStatus
        status={{
          kind: "session-only",
          message: "Changes will be kept only for this browser session.",
        }}
        onContinueInSession={vi.fn()}
        onResetSavedData={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "Changes will be kept only for this browser session.",
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
