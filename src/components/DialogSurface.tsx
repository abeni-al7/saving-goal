import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { KeyboardEventHandler, ReactNode, RefObject } from "react";

interface DialogSurfaceProps {
  readonly describedBy?: string;
  readonly isOpen: boolean;
  readonly labelledBy: string;
  readonly panelClassName?: string;
  readonly panelRef: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
  readonly onExitComplete: () => void;
  readonly onKeyDown: KeyboardEventHandler<HTMLElement>;
}

const backdropVariants = {
  closed: { opacity: 0 },
  open: { opacity: 1 },
};

const panelVariants = {
  closed: { opacity: 0, y: 10 },
  open: { opacity: 1, y: 0 },
};

export function DialogSurface({
  describedBy,
  isOpen,
  labelledBy,
  panelClassName,
  panelRef,
  children,
  onExitComplete,
  onKeyDown,
}: DialogSurfaceProps) {
  const shouldReduceMotion = useReducedMotion();
  const transition = { duration: shouldReduceMotion ? 0 : 0.16 };

  return (
    <AnimatePresence initial={false} onExitComplete={onExitComplete}>
      {isOpen ? (
        <motion.div
          animate="open"
          className="dialog-backdrop"
          data-motion={shouldReduceMotion ? "reduced" : "animated"}
          exit="closed"
          initial={shouldReduceMotion ? false : "closed"}
          key="dialog-surface"
          role="presentation"
          transition={transition}
          variants={backdropVariants}
        >
          <motion.section
            animate="open"
            aria-describedby={describedBy}
            aria-labelledby={labelledBy}
            aria-modal="true"
            className={
              panelClassName === undefined
                ? "dialog-panel"
                : `dialog-panel ${panelClassName}`
            }
            exit="closed"
            initial={shouldReduceMotion ? false : "closed"}
            ref={panelRef}
            role="dialog"
            transition={transition}
            variants={panelVariants}
            onKeyDown={onKeyDown}
          >
            {children}
          </motion.section>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
