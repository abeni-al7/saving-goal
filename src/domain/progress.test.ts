import { describe, expect, it, vi } from "vitest";
import { createGoal } from "./goals";
import { calculateProgress, recordFirstCompletion } from "./progress";

function goalFixture() {
  const ids = ["goal-progress", "opening-progress"];
  let index = 0;

  return createGoal(
    {
      name: "Progress goal",
      targetAmount: "1000",
      openingBalanceAmount: "0",
      currency: "USD",
    },
    {
      createId: () => ids[index++] ?? "unexpected-id",
      now: () => "2026-08-09T09:00:00.000Z",
    },
  ).goal;
}

describe("progress", () => {
  it.each([
    [0, 10000, { percentage: 0, fillPercent: 0, isComplete: false }],
    [2500, 10000, { percentage: 25, fillPercent: 25, isComplete: false }],
    [10000, 10000, { percentage: 100, fillPercent: 100, isComplete: true }],
    [12500, 10000, { percentage: 125, fillPercent: 100, isComplete: true }],
  ])(
    "calculates progress for a %i balance against a %i target",
    (balance, target, expected) => {
      expect(calculateProgress(balance, target)).toEqual(expected);
    },
  );

  it("uses floor division for a non-whole percentage", () => {
    expect(calculateProgress(1, 3).percentage).toBe(33);
  });

  it("records the timestamp when a goal first reaches its target", () => {
    const goal = goalFixture();

    const completedGoal = recordFirstCompletion(
      goal,
      goal.targetMinorUnits,
      () => "2026-08-09T12:00:00.000Z",
    );

    expect(completedGoal.completedAt).toBe("2026-08-09T12:00:00.000Z");
    expect(goal.completedAt).toBeUndefined();
  });

  it("does not timestamp an incomplete goal", () => {
    const goal = goalFixture();
    const now = vi.fn(() => "2026-08-09T12:00:00.000Z");

    expect(recordFirstCompletion(goal, 99999, now)).toBe(goal);
    expect(now).not.toHaveBeenCalled();
  });

  it("preserves the first completion after later balance changes", () => {
    const completedGoal = {
      ...goalFixture(),
      completedAt: "2026-08-09T12:00:00.000Z",
    };
    const now = vi.fn(() => "2026-08-10T12:00:00.000Z");

    expect(recordFirstCompletion(completedGoal, 50000, now)).toBe(
      completedGoal,
    );
    expect(now).not.toHaveBeenCalled();
  });
});
