import { GoalsDashboard } from "./components/GoalsDashboard";
import { useSavings } from "./state/useSavings";

export default function App() {
  const { state, dispatch } = useSavings();

  return (
    <div className="app-shell">
      <header className="app-header">
        <p className="app-kicker">Your plans, made visible</p>
        <h1>Saving goals</h1>
        <p className="app-intro">
          Build steady momentum toward the things that matter.
        </p>
      </header>

      <main aria-label="Saving goals workspace">
        <GoalsDashboard
          dispatch={dispatch}
          pendingWithdrawal={state.pendingWithdrawal}
          savings={state.savings}
        />
      </main>
    </div>
  );
}
