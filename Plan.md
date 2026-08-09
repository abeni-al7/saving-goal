# Saving Goals Web Application Implementation Plan

> Execute this plan one session at a time. Begin with the first session containing an unchecked task. Do not mark a task complete until its stated validation passes.

**Goal:** Build a static, responsive React application for managing multiple saving goals, recording deposits and withdrawals, visualizing animated progress, and warning users before unusually large withdrawals.

**Architecture:** Use React, TypeScript, and Vite with a reducer-driven client state. Keep money, progress, and withdrawal rules in pure domain modules; derive balances from an immutable transaction ledger; validate a versioned localStorage envelope at the storage boundary; and keep the UI accessible under keyboard navigation and reduced-motion preferences.

**Tech stack:** React, TypeScript, Vite, npm, Zod, Lucide React, Motion, Vitest, React Testing Library, Playwright, ESLint, and Prettier.

---

## Session Protocol

Every implementation session must:

- [ ] Read `AGENTS.md`, `docs/project-brief.md`, and this plan before editing.
- [ ] Inspect `git status --short` and preserve unrelated changes.
- [ ] Work only on the first session below that has unchecked implementation tasks, unless explicitly redirected.
- [ ] Follow red-green-refactor for behavioral code: write one focused failing test, confirm the expected failure, implement minimally, and rerun it.
- [ ] Run that session's validation commands before checking off tasks.
- [ ] Update this file immediately as tasks pass; leave failed or partial tasks unchecked.
- [ ] Add a concise entry to the Session Log with the date, completed scope, commands run, and next task.
- [ ] Do not commit, push, or alter remote state unless the user explicitly requests it.

## Product Decisions

- [x] Use React, TypeScript, Vite, npm, and static client-side deployment.
- [x] Persist data in versioned localStorage with an explicit recovery path.
- [x] Support creating, editing, and permanently deleting multiple goals.
- [x] Give each goal one immutable ISO currency; do not aggregate unlike currencies.
- [x] Record the opening balance as an immutable transaction.
- [x] Derive balances from immutable opening, deposit, and withdrawal transactions.
- [x] Configure withdrawal warnings per goal, defaulting to 20% of current balance.
- [x] Allow a warned withdrawal after explicit confirmation, but never allow an overdraft.
- [x] Keep completed goals active, display percentages above 100%, and celebrate first completion once.
- [x] Exclude authentication, cloud sync, conversion, target dates, recurring deposits, archives, transaction editing, import/export, and notes from the MVP.

## Acceptance Criteria

- [ ] A user can create a goal with a name, positive target, nonnegative opening balance, ISO currency, and warning threshold.
- [ ] A user can edit a goal's name, target, and warning threshold, but not its currency or opening balance.
- [ ] Deposits and withdrawals create timestamped immutable records and update the derived balance immediately.
- [ ] A withdrawal exceeding the configured share of current balance shows projected impact and requires confirmation.
- [ ] A withdrawal exceeding current balance is rejected without changing history.
- [ ] Every goal displays formatted balance and target values, an exact integer percentage, and a bar visually capped at 100%.
- [ ] First completion records a timestamp and triggers an accessible celebration that does not replay after refresh.
- [ ] Goal deletion names the goal, warns about history loss, and cascades only after confirmation.
- [ ] Valid data survives refreshes; corrupt or unavailable storage is not silently overwritten.
- [ ] Primary workflows work on mobile and desktop with keyboard navigation and reduced motion.

---

## Session 1: Scaffold And Quality Gates

**Outcome:** A minimal React shell builds and has executable formatting, linting, type-checking, unit-test, and browser-test commands.

- [x] Scaffold Vite's React-TypeScript template in the existing repository without replacing `AGENTS.md`, `.github/`, `docs/`, or this plan.
- [x] Use npm and retain `package-lock.json` as the reproducible dependency lockfile.
- [x] Add runtime dependencies: `zod`, `lucide-react`, and `motion`.
- [x] Add development dependencies for Prettier, Vitest, jsdom, React Testing Library, `user-event`, `jest-dom`, and Playwright.
- [x] Configure scripts named `dev`, `format`, `format:check`, `lint`, `typecheck`, `test`, `test:coverage`, `test:e2e`, `build`, and `preview`.
- [x] Configure Vitest setup with jsdom and `jest-dom` matchers.
- [x] Configure Playwright with desktop Chromium, mobile Chromium, and reduced-motion projects using Vite's preview or dev server.
- [x] Write a failing smoke test for the application heading, verify the expected failure, then replace the starter UI with the smallest semantic shell that passes.
- [x] Add base CSS tokens for an off-white canvas, charcoal ink, green progress, coral warnings, yellow completion, 4px spacing increments, responsive breakpoints, and visible focus.
- [x] Extend `.gitignore` only for generated Vite, coverage, and Playwright artifacts actually introduced by the scaffold.
- [x] Update the Project Commands table in `docs/project-brief.md` with the exact npm commands.

**Validation**

- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test -- --run`
- [x] `npm run build`

**Handoff:** Record installed versions, deviations from the scaffold, and any command caveats in the Session Log.

---

## Session 2: Money And Goal Domain

**Depends on:** Session 1

**Outcome:** Pure, tested domain functions represent currencies, goals, immutable transactions, balances, progress, completion, and withdrawal decisions.

- [x] Define `Goal`, `Transaction`, `SavingsState`, `CurrencyCode`, transaction-kind, and identifier types in `src/domain/types.ts`.
- [x] Write failing tests for currency fraction digits, valid amount parsing, malformed decimals, negative values, unsafe integers, zero targets, and locale-aware formatting.
- [x] Implement `src/domain/money.ts` using safe integer minor units and `Intl.NumberFormat` metadata instead of floating-point balance arithmetic.
- [x] Write failing tests for goal creation with an opening-balance transaction, editable fields, immutable currency, and input validation.
- [x] Implement goal creation and editing in `src/domain/goals.ts` with injected ID and clock providers.
- [x] Write failing tests for deposits, withdrawals, deterministic ordering, derived balances, and cascading goal deletion.
- [x] Implement immutable ledger operations in `src/domain/transactions.ts`; never persist a second mutable balance field.
- [x] Write failing tests for zero, partial, complete, and overfunded progress and first-completion timestamp behavior.
- [x] Implement progress and completion calculations with percentage display allowed above 100% and visual fill capped at 100%.
- [x] Write failing tests for ordinary withdrawals, a withdrawal exactly at the threshold, a withdrawal above it, zero balance, and overdrafts.
- [x] Implement `src/domain/withdrawals.ts` so warning comparison uses integer arithmetic and overdrafts are hard failures.

**Validation**

- [x] `npm test -- --run src/domain`
- [x] `npm run typecheck`
- [x] `npm run lint`

**Handoff:** Document the public domain APIs and any currency edge cases in the Session Log.

---

## Session 3: Storage And Application State

**Depends on:** Session 2

**Outcome:** Valid state hydrates and persists once through a tested boundary, while corrupt or unavailable storage produces recoverable UI state.

- [ ] Define the Zod-validated version-one envelope in `src/storage/schema.ts` under the key `saving-goal:state`.
- [ ] Write failing tests for absent data, valid data, schema-invalid data, malformed JSON, disabled storage, and quota failures.
- [ ] Implement typed load, save, reset, and raw-value preservation behavior in `src/storage/savings-storage.ts`.
- [ ] Ensure invalid data is never automatically deleted or overwritten during hydration.
- [ ] Add an explicit migration entry point that accepts version one and rejects unknown future versions without data loss.
- [ ] Write reducer tests for create, edit, deposit, withdrawal, confirmed withdrawal, completion, delete, reset, and storage-status actions.
- [ ] Implement `src/state/savings-reducer.ts` using domain functions rather than duplicating business rules.
- [ ] Write hook tests for lazy hydration, successful persistence, session-only fallback, and surfaced persistence errors.
- [ ] Implement `src/state/useSavings.ts` with one initial storage read and persistence after successful state changes.

**Validation**

- [ ] `npm test -- --run src/storage src/state`
- [ ] `npm run typecheck`
- [ ] `npm run lint`

**Handoff:** Record the exact storage schema, recovery states, and reducer commands in the Session Log.

---

## Session 4: Goal Creation And Management

**Depends on:** Session 3

**Outcome:** Users can create, edit, and permanently delete goals through accessible keyboard-complete dialogs.

- [ ] Write component tests for opening, cancelling, submitting, and restoring focus from the goal dialog.
- [ ] Implement `src/components/GoalFormDialog.tsx` with labeled name, target, opening balance, ISO currency, and threshold controls.
- [ ] Show field-level errors linked with `aria-describedby`; do not rely on placeholders or color alone.
- [ ] Lock currency and opening balance in edit mode while allowing name, target, and threshold changes.
- [ ] Write tests for permanent deletion cancellation and confirmation, including transaction cascade.
- [ ] Implement `src/components/DeleteGoalDialog.tsx` with the goal name, explicit history-loss language, and destructive-action focus management.
- [ ] Write tests for first-run empty state, goal list rendering, add action, edit action, and completion-count summary.
- [ ] Implement `src/components/EmptyState.tsx` and the initial `src/components/GoalsDashboard.tsx` composition.
- [ ] Add polite live announcements for successful creation, editing, and deletion.

**Validation**

- [ ] `npm test -- --run src/components/GoalFormDialog src/components/DeleteGoalDialog src/components/GoalsDashboard`
- [ ] `npm run typecheck`
- [ ] `npm run lint`

**Handoff:** Record finished goal-management flows and known visual placeholders in the Session Log.

---

## Session 5: Deposits, Withdrawals, And Activity

**Depends on:** Sessions 3 and 4

**Outcome:** Users can deposit and withdraw with projected effects, large-withdrawal confirmation, overdraft protection, and readable activity history.

- [ ] Write tests for selecting deposit or withdrawal, validating amounts, previewing projected balance/progress, and successful submission.
- [ ] Implement `src/components/TransactionDialog.tsx` with a segmented mode control and currency-aware amount input.
- [ ] Write tests proving ordinary withdrawals submit directly, warned withdrawals require confirmation, cancellation preserves state, and confirmation records exactly one transaction.
- [ ] Implement `src/components/WithdrawalWarningDialog.tsx` with amount, projected balance, percentage impact, cancel, and confirm actions.
- [ ] Show overdrafts as blocking field errors before warning evaluation.
- [ ] Write tests for opening balance, deposits, withdrawals, chronological display, and empty activity.
- [ ] Implement `src/components/ActivityList.tsx` with localized amounts and dates.
- [ ] Connect transaction actions and live announcements to `GoalsDashboard`.

**Validation**

- [ ] `npm test -- --run src/components/TransactionDialog src/components/WithdrawalWarningDialog src/components/ActivityList`
- [ ] `npm run typecheck`
- [ ] `npm run lint`

**Handoff:** Record confirmed transaction behavior and threshold boundary semantics in the Session Log.

---

## Session 6: Goal Presentation And Motion

**Depends on:** Sessions 4 and 5

**Outcome:** The complete dashboard presents each goal clearly with an engaging, accessible progress experience across mobile and desktop.

- [ ] Write tests for progress semantics, zero progress, overfunding, accessible values, and reduced-motion behavior.
- [ ] Implement `src/components/ProgressMeter.tsx` with a transform-based fill capped at 100% and visible percentage allowed above 100%.
- [ ] Implement a synchronized percentage transition and spring fill using Motion without animating layout dimensions.
- [ ] Persist first completion so the completion accent plays once and does not replay after refresh.
- [ ] Provide an immediate nonanimated completion state under `prefers-reduced-motion`.
- [ ] Write tests for balance/target formatting, long goal names, action labels, completion state, and recent activity in a goal item.
- [ ] Implement `src/components/GoalCard.tsx` with Lucide icon controls and text tooltips.
- [ ] Finish `GoalsDashboard` with goal-count and completion-count summaries, an obvious add action, and no cross-currency total.
- [ ] Implement the optimistic editorial visual system in `src/styles/global.css`: bundled expressive fonts, ledger-line texture, restrained multicolor tokens, stable controls, compact radii no greater than 8px, and full-width unframed regions.
- [ ] Ensure long names, currencies, percentages, and action controls do not clip or overlap at supported viewport widths.

**Validation**

- [ ] `npm test -- --run src/components/ProgressMeter src/components/GoalCard src/components/GoalsDashboard`
- [ ] `npm run format:check`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run build`

**Handoff:** Record animation behavior, responsive breakpoints, and remaining accessibility checks in the Session Log.

---

## Session 7: Persistence Recovery And Accessibility Audit

**Depends on:** Sessions 3 through 6

**Outcome:** Storage failure states are actionable, and all primary workflows are usable with assistive technology, keyboard input, and reduced motion.

- [ ] Write tests for unavailable storage, quota failure, corrupt data, session-only continuation, reset cancellation, and explicit reset confirmation.
- [ ] Implement `src/components/StorageStatus.tsx` without exposing raw user data in error messages.
- [ ] Verify a corrupt stored value remains byte-for-byte unchanged until explicit reset.
- [ ] Audit document landmarks and heading order.
- [ ] Audit every input for a visible label and linked error description.
- [ ] Audit dialogs for accessible names, initial focus, focus containment, Escape behavior, and trigger-focus restoration.
- [ ] Audit icon controls and progress meters for accessible names and values.
- [ ] Audit live announcements so state changes are useful but not duplicated.
- [ ] Audit keyboard order and visible focus on desktop and mobile layouts.
- [ ] Audit text, control, warning, and progress contrast to WCAG AA or better.
- [ ] Confirm all nonessential animation honors `prefers-reduced-motion`.

**Validation**

- [ ] `npm test -- --run`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] Complete a keyboard-only pass of create, edit, deposit, warned withdrawal, and delete.

**Handoff:** Record audited flows, remaining exceptions, and any manual-only findings in the Session Log.

---

## Session 8: Browser Tests And Responsive Verification

**Depends on:** Sessions 1 through 7

**Outcome:** Automated browser coverage proves the complete application behavior on desktop, mobile, reload, and reduced-motion configurations.

- [ ] Add `e2e/saving-goals.spec.ts` with isolated localStorage state per test.
- [ ] Cover empty-state goal creation and persistence after reload.
- [ ] Cover per-goal currency formatting without cross-currency aggregation.
- [ ] Cover deposits and ordinary withdrawals.
- [ ] Cover warned-withdrawal cancellation and confirmation.
- [ ] Cover overdraft rejection without a new ledger entry.
- [ ] Cover first completion, over-100% display, and no celebration replay after reload.
- [ ] Cover goal editing with locked currency/opening balance.
- [ ] Cover cascading deletion after confirmation.
- [ ] Seed malformed storage and verify it is preserved until explicit reset.
- [ ] Run desktop Chromium, mobile Chromium, and reduced-motion projects.
- [ ] Capture representative screenshots and inspect them for nonblank progress visuals, clipping, overlap, and dialog framing.
- [ ] Use a canvas or pixel check only if any primary visual is rendered through canvas; otherwise document that DOM/CSS assertions cover the progress meter.

**Validation**

- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] Desktop screenshot inspection passed.
- [ ] Mobile screenshot inspection passed.
- [ ] Reduced-motion inspection passed.

**Handoff:** Record browser versions, screenshots inspected, and any intentionally manual assertions in the Session Log.

---

## Session 9: Documentation And Release Gate

**Depends on:** Sessions 1 through 8

**Outcome:** The repository accurately documents the finished MVP and every configured quality gate passes from a clean checkout.

- [ ] Update `docs/project-brief.md` with target users, MVP scope, exclusions, domain terms, architecture, privacy/storage constraints, and verified commands.
- [ ] Add `docs/decisions/0001-client-only-react-local-storage.md` documenting context, decision, alternatives, consequences, and validation.
- [ ] Add `README.md` with prerequisites, install/run/test commands, feature summary, local-only data behavior, and reset instructions.
- [ ] Check every acceptance criterion in this plan against automated or documented manual evidence.
- [ ] Review `git diff` for accidental changes, generated artifacts, secrets, stale documentation, and inconsistent package metadata.
- [ ] Run the complete validation suite from the repository root.
- [ ] Start the development server, verify the final URL loads, and record the URL in the Session Log.

**Final Validation**

- [ ] `npm ci`
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:coverage`
- [ ] `npm run build`
- [ ] `npm run test:e2e`
- [ ] Workspace diagnostics report no relevant errors.

---

## Session Log

Add newest entries at the top. Keep entries brief and factual.

### 2026-08-09 - Session 2: Money And Goal Domain

- Completed: Added branded currency and identifier types; safe minor-unit parsing and locale formatting; goal creation/editing with opening transactions; immutable ledger recording, derived balances, deterministic ordering, and cascade deletion; progress and one-time completion; and integer-based withdrawal assessment.
- Validation: `npm test -- --run src/domain` passed 47 tests across 5 files; `npm run typecheck` and `npm run lint` passed.
- Decisions or deviations: Public APIs are `currencyCode`, `currencyFractionDigits`, `parseAmountToMinorUnits`, `formatMinorUnits`, `createGoal`, `editGoal`, `recordTransaction`, `deriveBalance`, `transactionsForGoal`, `deleteGoal`, `calculateProgress`, `recordFirstCompletion`, and `evaluateWithdrawal`. Currency input must be an uppercase three-letter code listed by `Intl.supportedValuesOf`; fraction digits come from `Intl.NumberFormat`; decimal input uses `.` at the domain boundary; formatting preserves every safe minor unit through `BigInt`; progress percentages use floor division; exact-threshold withdrawals do not warn; and displayed withdrawal impact is truncated to two decimals.
- Next unchecked task: Session 3 - define the version-one storage envelope in `src/storage/schema.ts`.

### 2026-08-09 - Session 1: Scaffold And Quality Gates

- Completed: Scaffolded React 19.2.8, Vite 8.2.1, and TypeScript 6.0.3 with Zod 4.4.3, Lucide React 1.31.0, Motion 13.0.0, ESLint 10.8.1, Prettier 3.9.6, Vitest 4.1.10, jsdom 30.0.1, React Testing Library 16.3.2, user-event 14.6.3, jest-dom 7.0.0, and Playwright 1.62.1.
- Validation: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, `npm run test:coverage`, and `npm run test:e2e` passed; Playwright ran desktop, mobile, and reduced-motion Chromium projects.
- Decisions or deviations: Replaced Vite demo assets with the tested semantic shell, kept Vitest in a separate config, added the V8 coverage provider required by `test:coverage`, and configured reduced motion through Playwright browser context options. Browser binaries are Playwright-managed and may require `npx playwright install chromium` on a new machine.
- Next unchecked task: Session 2 - define domain types in `src/domain/types.ts`.

### YYYY-MM-DD - Session N: Title

- Completed:
- Validation:
- Decisions or deviations:
- Next unchecked task:
