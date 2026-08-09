import { useEffect, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { calculateProgress } from "../domain/progress";

interface ProgressMeterProps {
  readonly balanceMinorUnits: number;
  readonly completedAt?: string;
  readonly goalName: string;
  readonly targetMinorUnits: number;
}

const progressSpring = {
  type: "spring" as const,
  stiffness: 115,
  damping: 20,
  mass: 0.8,
};

export function ProgressMeter({
  balanceMinorUnits,
  completedAt,
  goalName,
  targetMinorUnits,
}: ProgressMeterProps) {
  const { fillPercent, isComplete, percentage } = calculateProgress(
    balanceMinorUnits,
    targetMinorUnits,
  );
  const shouldReduceMotion = useReducedMotion();
  const percentageTarget = useMotionValue(percentage);
  const animatedPercentage = useSpring(percentageTarget, progressSpring);
  const animatedFill = useTransform(
    animatedPercentage,
    (latest) => Math.min(Math.max(latest, 0), 100) / 100,
  );
  const animatedLabel = useTransform(
    animatedPercentage,
    (latest) => `${Math.round(latest)}%`,
  );
  const previousCompletedAt = useRef(completedAt);
  const [isCompletionAccentPlaying, setIsCompletionAccentPlaying] =
    useState(false);

  useEffect(() => {
    percentageTarget.set(percentage);
    if (
      !shouldReduceMotion &&
      previousCompletedAt.current === undefined &&
      completedAt !== undefined
    ) {
      setIsCompletionAccentPlaying(true);
    }
    previousCompletedAt.current = completedAt;
  }, [completedAt, percentage, percentageTarget, shouldReduceMotion]);

  return (
    <motion.div
      aria-label={`Progress for ${goalName}`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={fillPercent}
      aria-valuetext={`${percentage}% funded`}
      className={`progress-meter${isComplete ? " progress-meter--complete" : ""}`}
      data-completion-accent={isCompletionAccentPlaying ? "playing" : "settled"}
      data-motion={shouldReduceMotion ? "reduced" : "animated"}
      role="progressbar"
      animate={
        isCompletionAccentPlaying
          ? { scale: [1, 1.015, 1], transition: progressSpring }
          : undefined
      }
      onAnimationComplete={() => setIsCompletionAccentPlaying(false)}
    >
      <div className="progress-meter__heading" aria-hidden="true">
        <span>Progress</span>
        {shouldReduceMotion ? (
          <span className="progress-meter__percentage">{percentage}%</span>
        ) : (
          <motion.span className="progress-meter__percentage">
            {animatedLabel}
          </motion.span>
        )}
      </div>
      <span className="progress-meter__track" aria-hidden="true">
        <motion.span
          className="progress-meter__fill"
          data-testid="progress-fill"
          style={
            shouldReduceMotion
              ? {
                  transform: `scaleX(${fillPercent / 100})`,
                  transformOrigin: "left center",
                }
              : {
                  scaleX: animatedFill,
                  transformOrigin: "left center",
                }
          }
        />
      </span>
    </motion.div>
  );
}
