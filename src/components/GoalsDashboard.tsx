import { useState } from "react";
import type { CreateGoalInput } from "../domain/goals";
import type { SavingsState } from "../domain/types";
import type { SavingsAction } from "../state/savings-reducer";
import { DeleteGoalDialog } from "./DeleteGoalDialog";
import { EmptyState } from "./EmptyState";
import { GoalFormDialog } from "./GoalFormDialog";

interface GoalsDashboardProps {
  readonly savings: SavingsState;
  readonly dispatch: React.Dispatch<SavingsAction>;
}

export function GoalsDashboard({ savings, dispatch }: GoalsDashboardProps) {
  const [announcement, setAnnouncement] = useState("");
  const completedCount = savings.goals.filter(
    (goal) => goal.completedAt !== undefined,
  ).length;

  const addGoal = (input: CreateGoalInput): void => {
    dispatch({ type: "goal/create", input });
    setAnnouncement(`${input.name.trim()} created.`);
  };

  return (
    <>
      {savings.goals.length === 0 ? (
        <EmptyState
          action={<GoalFormDialog mode="create" onSubmit={addGoal} />}
        />
      ) : (
        <section className="goals-dashboard" aria-labelledby="goals-title">
          <div className="goals-dashboard__heading">
            <div>
              <h2 id="goals-title">Your goals</h2>
              <p aria-label="Goal summary">
                {savings.goals.length}{" "}
                {savings.goals.length === 1 ? "goal" : "goals"},{" "}
                {completedCount} completed
              </p>
            </div>
            <GoalFormDialog mode="create" onSubmit={addGoal} />
          </div>
          <div className="goals-list">
            {savings.goals.map((goal) => (
              <article className="goal-item" key={goal.id}>
                <h3>{goal.name}</h3>
                <div className="goal-item__actions">
                  <GoalFormDialog
                    mode="edit"
                    goal={goal}
                    openingBalanceMinorUnits={
                      savings.transactions.find(
                        (transaction) =>
                          transaction.goalId === goal.id &&
                          transaction.kind === "opening",
                      )?.amountMinorUnits ?? 0
                    }
                    onSubmit={(input) => {
                      dispatch({ type: "goal/edit", goalId: goal.id, input });
                      setAnnouncement(`${input.name.trim()} updated.`);
                    }}
                  />
                  <DeleteGoalDialog
                    goal={goal}
                    onConfirm={(goalId) => {
                      dispatch({ type: "goal/delete", goalId });
                      setAnnouncement(`${goal.name} deleted.`);
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <p
        aria-atomic="true"
        aria-live="polite"
        className="visually-hidden"
        role="status"
      >
        {announcement}
      </p>
    </>
  );
}
