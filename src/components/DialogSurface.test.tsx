import { createRef, type KeyboardEventHandler, type RefObject } from "react";
import {
  render,
  screen,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DialogSurface } from "./DialogSurface";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();

  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduced,
  };
});

const panelRef = createRef<HTMLElement>();
const onKeyDown: KeyboardEventHandler<HTMLElement> = vi.fn();

function surface(
  isOpen: boolean,
  onExitComplete = vi.fn(),
  ref: RefObject<HTMLElement | null> = panelRef,
) {
  return (
    <DialogSurface
      isOpen={isOpen}
      labelledBy="dialog-title"
      panelRef={ref}
      onExitComplete={onExitComplete}
      onKeyDown={onKeyDown}
    >
      <h2 id="dialog-title">Shared dialog</h2>
    </DialogSurface>
  );
}

describe("DialogSurface", () => {
  beforeEach(() => {
    motionPreference.reduced = false;
  });

  it("renders only while open with an accessible modal name", () => {
    const { rerender } = render(surface(false));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(surface(true));

    const dialog = screen.getByRole("dialog", { name: "Shared dialog" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-labelledby", "dialog-title");
  });

  it("keeps the dialog mounted through exit and reports completion", async () => {
    const onExitComplete = vi.fn();
    const { rerender } = render(surface(true, onExitComplete));
    const dialog = screen.getByRole("dialog");

    rerender(surface(false, onExitComplete));

    expect(dialog).toBeInTheDocument();
    expect(onExitComplete).not.toHaveBeenCalled();
    await waitForElementToBeRemoved(dialog);
    expect(onExitComplete).toHaveBeenCalledOnce();
  });

  it("marks immediate final states when reduced motion is preferred", () => {
    motionPreference.reduced = true;

    render(surface(true));

    expect(screen.getByRole("dialog").parentElement).toHaveAttribute(
      "data-motion",
      "reduced",
    );
  });
});
