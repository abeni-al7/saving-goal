import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressMeter } from "./ProgressMeter";

const motionPreference = vi.hoisted(() => ({ reduced: false }));

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();

  return {
    ...actual,
    useReducedMotion: () => motionPreference.reduced,
  };
});

describe("ProgressMeter", () => {
  beforeEach(() => {
    motionPreference.reduced = false;
  });

  it("exposes zero progress with an exact visible percentage", () => {
    render(
      <ProgressMeter
        balanceMinorUnits={0}
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    const meter = screen.getByRole("progressbar", {
      name: "Progress for Emergency fund",
    });
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
    expect(meter).toHaveAttribute("aria-valuenow", "0");
    expect(meter).toHaveAttribute("aria-valuetext", "0% funded");
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("caps the visual and accessible range while showing overfunding", () => {
    render(
      <ProgressMeter
        balanceMinorUnits={12_500}
        completedAt="2026-08-09T12:00:00.000Z"
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    const meter = screen.getByRole("progressbar");
    expect(meter).toHaveAttribute("aria-valuenow", "100");
    expect(meter).toHaveAttribute("aria-valuetext", "125% funded");
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(screen.getByTestId("progress-fill")).toHaveStyle({
      transformOrigin: "left center",
    });
  });

  it("plays the completion accent when completion occurs after mount", () => {
    const { rerender } = render(
      <ProgressMeter
        balanceMinorUnits={9_000}
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    rerender(
      <ProgressMeter
        balanceMinorUnits={10_000}
        completedAt="2026-08-09T12:00:00.000Z"
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-completion-accent",
      "playing",
    );
  });

  it("renders a completed goal immediately without replaying its accent", () => {
    render(
      <ProgressMeter
        balanceMinorUnits={10_000}
        completedAt="2026-08-09T12:00:00.000Z"
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "data-completion-accent",
      "settled",
    );
  });

  it("uses the immediate final state when reduced motion is preferred", () => {
    motionPreference.reduced = true;
    const { rerender } = render(
      <ProgressMeter
        balanceMinorUnits={9_000}
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    rerender(
      <ProgressMeter
        balanceMinorUnits={10_000}
        completedAt="2026-08-09T12:00:00.000Z"
        goalName="Emergency fund"
        targetMinorUnits={10_000}
      />,
    );

    const meter = screen.getByRole("progressbar");
    expect(meter).toHaveAttribute("data-motion", "reduced");
    expect(meter).toHaveAttribute("data-completion-accent", "settled");
    expect(screen.getByTestId("progress-fill")).toHaveStyle({
      transform: "scaleX(1)",
    });
  });
});
