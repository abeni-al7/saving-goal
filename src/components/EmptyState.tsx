import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly action: ReactNode;
}

export function EmptyState({ action }: EmptyStateProps) {
  return (
    <section className="empty-state" aria-labelledby="empty-state-title">
      <p className="section-kicker">No goals yet</p>
      <h2 id="empty-state-title">Start your first goal</h2>
      <p>Give the plan a name and a number to move toward.</p>
      {action}
    </section>
  );
}
