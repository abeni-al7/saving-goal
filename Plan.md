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
- [x] Exclude authentication, cloud sync, conversion, target dates, recurring deposits, archives, transaction editing, import/export, and general transaction notes from the MVP.
- [x] Treat withdrawal reasons as optional, immutable withdrawal-only metadata limited to 160 trimmed characters.
- [x] Let users add, replace, and remove goal artwork during goal creation and editing.
- [x] Accept PNG, JPEG, and WebP artwork sources up to 2 MB, then normalize them locally to PNG with a longest side of 128px and a maximum encoded payload of 100 KB.
- [x] Store only normalized goal artwork in the versioned localStorage envelope; do not upload it or introduce a network dependency.
- [x] Migrate valid version-one data to a strict version-two envelope while preserving the existing recovery behavior for invalid and unknown data.

## Acceptance Criteria

- [x] A user can create a goal with a name, positive target, nonnegative opening balance, ISO currency, and warning threshold.
- [x] A user can edit a goal's name, target, and warning threshold, but not its currency or opening balance.
- [x] Deposits and withdrawals create timestamped immutable records and update the derived balance immediately.
- [x] A withdrawal exceeding the configured share of current balance shows projected impact and requires confirmation.
- [x] A withdrawal exceeding current balance is rejected without changing history.
- [x] Every goal displays formatted balance and target values, an exact integer percentage, and a bar visually capped at 100%.
- [x] First completion records a timestamp and triggers an accessible celebration that does not replay after refresh.
- [x] Goal deletion names the goal, warns about history loss, and cascades only after confirmation.
- [x] Valid data survives refreshes; corrupt or unavailable storage is not silently overwritten.
- [x] Primary workflows work on mobile and desktop with keyboard navigation and reduced motion.
- [x] A user can optionally add a withdrawal reason; blank reasons are omitted and nonblank reasons are trimmed and limited to 160 characters.
- [x] An ordinary or warned withdrawal preserves its reason in exactly one immutable ledger record and displays it with the matching activity entry.
- [x] Deposits and opening balances cannot receive withdrawal-reason metadata.
- [x] A user can add goal artwork while creating a goal and replace or remove it while editing without canceled changes leaking into saved state.
- [x] Goal artwork accepts decoded PNG, JPEG, and WebP sources no larger than 2 MB, preserves aspect ratio without cropping, and is normalized locally to a PNG no larger than 128px or 100 KB.
- [x] Each goal displays its artwork as a prominent, accessible visual reminder in a responsive stage that follows the normalized image's intrinsic aspect ratio without clipping or overlap on supported mobile and desktop viewports.
- [x] Valid version-one data migrates without user intervention, new changes persist as version two, and malformed or unsupported data remains preserved for recovery.

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

- [x] Define the Zod-validated version-one envelope in `src/storage/schema.ts` under the key `saving-goal:state`.
- [x] Write failing tests for absent data, valid data, schema-invalid data, malformed JSON, disabled storage, and quota failures.
- [x] Implement typed load, save, reset, and raw-value preservation behavior in `src/storage/savings-storage.ts`.
- [x] Ensure invalid data is never automatically deleted or overwritten during hydration.
- [x] Add an explicit migration entry point that accepts version one and rejects unknown future versions without data loss.
- [x] Write reducer tests for create, edit, deposit, withdrawal, confirmed withdrawal, completion, delete, reset, and storage-status actions.
- [x] Implement `src/state/savings-reducer.ts` using domain functions rather than duplicating business rules.
- [x] Write hook tests for lazy hydration, successful persistence, session-only fallback, and surfaced persistence errors.
- [x] Implement `src/state/useSavings.ts` with one initial storage read and persistence after successful state changes.

**Validation**

- [x] `npm test -- --run src/storage src/state`
- [x] `npm run typecheck`
- [x] `npm run lint`

**Handoff:** Record the exact storage schema, recovery states, and reducer commands in the Session Log.

---

## Session 4: Goal Creation And Management

**Depends on:** Session 3

**Outcome:** Users can create, edit, and permanently delete goals through accessible keyboard-complete dialogs.

- [x] Write component tests for opening, cancelling, submitting, and restoring focus from the goal dialog.
- [x] Implement `src/components/GoalFormDialog.tsx` with labeled name, target, opening balance, ISO currency, and threshold controls.
- [x] Show field-level errors linked with `aria-describedby`; do not rely on placeholders or color alone.
- [x] Lock currency and opening balance in edit mode while allowing name, target, and threshold changes.
- [x] Write tests for permanent deletion cancellation and confirmation, including transaction cascade.
- [x] Implement `src/components/DeleteGoalDialog.tsx` with the goal name, explicit history-loss language, and destructive-action focus management.
- [x] Write tests for first-run empty state, goal list rendering, add action, edit action, and completion-count summary.
- [x] Implement `src/components/EmptyState.tsx` and the initial `src/components/GoalsDashboard.tsx` composition.
- [x] Add polite live announcements for successful creation, editing, and deletion.

**Validation**

- [x] `npm test -- --run src/components/GoalFormDialog src/components/DeleteGoalDialog src/components/GoalsDashboard`
- [x] `npm run typecheck`
- [x] `npm run lint`

**Handoff:** Record finished goal-management flows and known visual placeholders in the Session Log.

---

## Session 5: Deposits, Withdrawals, And Activity

**Depends on:** Sessions 3 and 4

**Outcome:** Users can deposit and withdraw with projected effects, large-withdrawal confirmation, overdraft protection, and readable activity history.

- [x] Write tests for selecting deposit or withdrawal, validating amounts, previewing projected balance/progress, and successful submission.
- [x] Implement `src/components/TransactionDialog.tsx` with a segmented mode control and currency-aware amount input.
- [x] Write tests proving ordinary withdrawals submit directly, warned withdrawals require confirmation, cancellation preserves state, and confirmation records exactly one transaction.
- [x] Implement `src/components/WithdrawalWarningDialog.tsx` with amount, projected balance, percentage impact, cancel, and confirm actions.
- [x] Show overdrafts as blocking field errors before warning evaluation.
- [x] Write tests for opening balance, deposits, withdrawals, chronological display, and empty activity.
- [x] Implement `src/components/ActivityList.tsx` with localized amounts and dates.
- [x] Connect transaction actions and live announcements to `GoalsDashboard`.

**Validation**

- [x] `npm test -- --run src/components/TransactionDialog src/components/WithdrawalWarningDialog src/components/ActivityList`
- [x] `npm run typecheck`
- [x] `npm run lint`

**Handoff:** Record confirmed transaction behavior and threshold boundary semantics in the Session Log.

---

## Session 6: Goal Presentation And Motion

**Depends on:** Sessions 4 and 5

**Outcome:** The complete dashboard presents each goal clearly with an engaging, accessible progress experience across mobile and desktop.

- [x] Write tests for progress semantics, zero progress, overfunding, accessible values, and reduced-motion behavior.
- [x] Implement `src/components/ProgressMeter.tsx` with a transform-based fill capped at 100% and visible percentage allowed above 100%.
- [x] Implement a synchronized percentage transition and spring fill using Motion without animating layout dimensions.
- [x] Persist first completion so the completion accent plays once and does not replay after refresh.
- [x] Provide an immediate nonanimated completion state under `prefers-reduced-motion`.
- [x] Write tests for balance/target formatting, long goal names, action labels, completion state, and recent activity in a goal item.
- [x] Implement `src/components/GoalCard.tsx` with Lucide icon controls and text tooltips.
- [x] Finish `GoalsDashboard` with goal-count and completion-count summaries, an obvious add action, and no cross-currency total.
- [x] Implement the optimistic editorial visual system in `src/styles/global.css`: bundled expressive fonts, ledger-line texture, restrained multicolor tokens, stable controls, compact radii no greater than 8px, and full-width unframed regions.
- [x] Ensure long names, currencies, percentages, and action controls do not clip or overlap at supported viewport widths.

**Validation**

- [x] `npm test -- --run src/components/ProgressMeter src/components/GoalCard src/components/GoalsDashboard`
- [x] `npm run format:check`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`

**Handoff:** Record animation behavior, responsive breakpoints, and remaining accessibility checks in the Session Log.

---

## Session 7: Persistence Recovery And Accessibility Audit

**Depends on:** Sessions 3 through 6

**Outcome:** Storage failure states are actionable, and all primary workflows are usable with assistive technology, keyboard input, and reduced motion.

- [x] Write tests for unavailable storage, quota failure, corrupt data, session-only continuation, reset cancellation, and explicit reset confirmation.
- [x] Implement `src/components/StorageStatus.tsx` without exposing raw user data in error messages.
- [x] Verify a corrupt stored value remains byte-for-byte unchanged until explicit reset.
- [x] Audit document landmarks and heading order.
- [x] Audit every input for a visible label and linked error description.
- [x] Audit dialogs for accessible names, initial focus, focus containment, Escape behavior, and trigger-focus restoration.
- [x] Audit icon controls and progress meters for accessible names and values.
- [x] Audit live announcements so state changes are useful but not duplicated.
- [x] Audit keyboard order and visible focus on desktop and mobile layouts.
- [x] Audit text, control, warning, and progress contrast to WCAG AA or better.
- [x] Confirm all nonessential animation honors `prefers-reduced-motion`.

**Validation**

- [x] `npm test -- --run`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] Complete a keyboard-only pass of create, edit, deposit, warned withdrawal, and delete.

**Handoff:** Record audited flows, remaining exceptions, and any manual-only findings in the Session Log.

---

## Session 8: Browser Tests And Responsive Verification

**Depends on:** Sessions 1 through 7

**Outcome:** Automated browser coverage proves the complete application behavior on desktop, mobile, reload, and reduced-motion configurations.

- [x] Add `e2e/saving-goals.spec.ts` with isolated localStorage state per test.
- [x] Cover empty-state goal creation and persistence after reload.
- [x] Cover per-goal currency formatting without cross-currency aggregation.
- [x] Cover deposits and ordinary withdrawals.
- [x] Cover warned-withdrawal cancellation and confirmation.
- [x] Cover overdraft rejection without a new ledger entry.
- [x] Cover first completion, over-100% display, and no celebration replay after reload.
- [x] Cover goal editing with locked currency/opening balance.
- [x] Cover cascading deletion after confirmation.
- [x] Seed malformed storage and verify it is preserved until explicit reset.
- [x] Run desktop Chromium, mobile Chromium, and reduced-motion projects.
- [x] Capture representative screenshots and inspect them for nonblank progress visuals, clipping, overlap, and dialog framing.
- [x] Use a canvas or pixel check only if any primary visual is rendered through canvas; otherwise document that DOM/CSS assertions cover the progress meter.

**Validation**

- [x] `npm run test:e2e`
- [x] `npm run build`
- [x] Desktop screenshot inspection passed.
- [x] Mobile screenshot inspection passed.
- [x] Reduced-motion inspection passed.

**Handoff:** Record browser versions, screenshots inspected, and any intentionally manual assertions in the Session Log.

---

## Session 9: Documentation And Release Gate

**Depends on:** Sessions 1 through 8

**Outcome:** The repository accurately documents the finished MVP and every configured quality gate passes from a clean checkout.

- [x] Update `docs/project-brief.md` with target users, MVP scope, exclusions, domain terms, architecture, privacy/storage constraints, and verified commands.
- [x] Add `docs/decisions/0001-client-only-react-local-storage.md` documenting context, decision, alternatives, consequences, and validation.
- [x] Add `README.md` with prerequisites, install/run/test commands, feature summary, local-only data behavior, and reset instructions.
- [x] Check every acceptance criterion in this plan against automated or documented manual evidence.
- [x] Review `git diff` for accidental changes, generated artifacts, secrets, stale documentation, and inconsistent package metadata.
- [x] Run the complete validation suite from the repository root.
- [x] Start the development server, verify the final URL loads, and record the URL in the Session Log.

**Final Validation**

- [x] `npm ci`
- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test:coverage`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] Workspace diagnostics report no relevant errors.

---

## Session 10: Version-Two Data Contract

**Depends on:** Session 9

**Outcome:** The persisted model supports optional withdrawal reasons and bounded goal artwork through a strict, backward-compatible version-two envelope.

- [x] Write failing schema tests for a valid version-two envelope containing an optional goal icon and withdrawal reason.
- [x] Write failing schema tests that reject blank or over-160-character reasons, reasons on opening or deposit records, malformed icon data URLs, icon payloads over 100 KB, and unknown fields.
- [x] Write failing migration tests proving valid version-one envelopes become version two without changing goals or transactions.
- [x] Preserve strict version-one validation so malformed legacy data is not accepted during migration.
- [x] Add optional `iconDataUrl` goal metadata and optional `reason` transaction metadata to `src/domain/types.ts`.
- [x] Add shared constants and pure validation helpers for normalized goal icon data URLs in `src/domain/goal-icons.ts`.
- [x] Implement distinct strict version-one and version-two schemas in `src/storage/schema.ts` and set the current storage version to two.
- [x] Implement a migration branch that validates version-one data before constructing a version-two envelope.
- [x] Keep malformed JSON, invalid data, and unknown future versions byte-for-byte preserved behind the existing recovery flow.
- [x] Update storage tests to prove saves emit version two and quota failures still retain the prior raw value.

**Validation**

- [x] `npm test -- --run src/domain/goal-icons.test.ts src/storage/schema.test.ts src/storage/savings-storage.test.ts`
- [x] `npm run typecheck`
- [x] `npm run lint`

**Handoff:** Record the version-two shape, migration guarantees, icon payload calculation, and recovery behavior in the Session Log.

---

## Session 11: Optional Withdrawal Reasons

**Depends on:** Session 10

**Outcome:** Users can attach a concise optional reason to a withdrawal, including withdrawals that require confirmation, and review it in immutable activity history.

- [x] Write failing transaction-domain tests for omitted, whitespace-only, trimmed, exactly 160-character, and overlength reasons.
- [x] Extend `RecordTransactionInput` and `recordTransaction` so only withdrawals can store a validated reason and deposits remain unchanged.
- [x] Write failing reducer tests proving ordinary withdrawals record a reason immediately and warned withdrawals preserve it through request, confirmation, and cancellation.
- [x] Extend `PendingWithdrawal`, withdrawal actions, and reducer helpers without changing amount, warning, completion, or revision semantics.
- [x] Write failing `TransactionDialog` tests for a withdrawal-only `Reason (optional)` field, its 160-character limit, mode switching, reset-on-open behavior, and trimmed submission.
- [x] Add the reason field to withdrawal mode in `src/components/TransactionDialog.tsx`; omit it from deposit submissions and preserve existing amount focus and error behavior.
- [x] Write failing warning-dialog and dashboard tests proving the pending reason is reviewable and reaches exactly one confirmed transaction.
- [x] Show the pending reason in `src/components/WithdrawalWarningDialog.tsx` and thread it through `GoalCard` and `GoalsDashboard` callbacks.
- [x] Write failing activity tests for present, absent, and long reasons.
- [x] Render withdrawal reasons beneath their matching activity metadata with wrapping styles that do not disturb amount alignment.
- [x] Preserve existing live announcements, trigger-focus restoration, overdraft blocking, and exact-threshold warning behavior.

**Validation**

- [x] `npm test -- --run src/domain/transactions.test.ts src/state/savings-reducer.test.ts`
- [x] `npm test -- --run src/components/TransactionDialog.test.tsx src/components/WithdrawalWarningDialog.test.tsx src/components/ActivityList.test.tsx src/components/GoalsDashboard.test.tsx`
- [x] `npm run typecheck`
- [x] `npm run lint`

**Handoff:** Record reason normalization, confirmation propagation, display behavior, and boundary cases in the Session Log.

---

## Session 12: Custom Goal Artwork

**Depends on:** Session 10

**Outcome:** Users can add, preview, replace, remove, and persist reasonably sized goal artwork without leaving the browser or destabilizing local storage.

- [x] Write failing goal-domain tests for create, preserve, replace, and remove artwork semantics.
- [x] Extend `CreateGoalInput` with optional artwork and `EditGoalInput` with an explicit preserve, replace, or remove contract.
- [x] Create `src/browser/goal-icon-upload.ts` as the browser-only boundary for source validation, image decoding, aspect-ratio fitting, canvas rendering, PNG encoding, and resource cleanup.
- [x] Write focused tests for accepted PNG, JPEG, and WebP sources; unsupported MIME types; sources over 2 MB; decode failures; encoding failures; stale selections; dimension fitting; and normalized results over 100 KB.
- [x] Preserve transparency when present, never crop or upscale the source, constrain the longest side to 128px, and persist only the normalized PNG data URL.
- [x] Write failing goal-dialog tests for accessible file errors, processing state, preview, create submission, replacement, removal, cancellation, and edit-state reinitialization.
- [x] Add an optional file input accepting PNG, JPEG, and WebP to `src/components/GoalFormDialog.tsx` and link failures through `aria-describedby` and `aria-invalid`.
- [x] Disable goal submission only while image processing is active and prevent an older asynchronous selection from replacing a newer one.
- [x] Add preview, Replace, and Remove controls using the existing dialog, button, focus, and error conventions.
- [x] Write failing goal-card tests for artwork presence, absence, decorative alternative text, stable dimensions, long names, and completion state.
- [x] Render artwork with goal-specific alternative text at its full normalized size inside a full-width mobile or 160px-wide desktop focal stage whose aspect ratio follows the image using `object-fit: contain`; show no placeholder when artwork is absent.
- [x] Add responsive artwork and file-control styles without shifting balance, progress, activity, or action controls.

**Validation**

- [x] `npm test -- --run src/domain/goals.test.ts src/domain/goal-icons.test.ts src/browser/goal-icon-upload.test.ts`
- [x] `npm test -- --run src/components/GoalFormDialog.test.tsx src/components/GoalCard.test.tsx`
- [x] `npm run format:check`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`

**Handoff:** Record accepted formats, normalization limits, create/edit semantics, asynchronous cleanup, and responsive display behavior in the Session Log.

---

## Session 13: Feature Integration And Release Gate

**Depends on:** Sessions 11 and 12

**Outcome:** Browser coverage, accessibility checks, documentation, and the complete quality suite verify both features across persistence and responsive workflows.

- [x] Extend Playwright helpers to record optional withdrawal reasons and attach generated image buffers without committing binary fixtures.
- [x] Cover an ordinary withdrawal reason and a warned withdrawal reason through confirmation, reload, and exactly-one-record assertions.
- [x] Cover goal creation with artwork, decoded normalized dimensions and PNG type, reload persistence, replacement, and removal.
- [x] Cover unsupported image types and oversized source files without changing the saved goal.
- [x] Re-run viewport framing and horizontal-overflow assertions with a long goal name, goal artwork, and a 160-character withdrawal reason.
- [x] Complete a keyboard-only pass for selecting, replacing, and removing artwork and for recording ordinary and warned withdrawal reasons.
- [x] Inspect desktop, mobile, and reduced-motion screenshots for image clarity, stable sizing, reason wrapping, clipping, overlap, and dialog framing.
- [x] Update `docs/project-brief.md` and `README.md` with both features, accepted image formats and limits, schema version two, local-only image handling, and quota implications.
- [x] Refine the out-of-scope notes language so it excludes general transaction notes without contradicting optional withdrawal reasons.
- [x] Add `docs/decisions/0002-bounded-goal-icons-in-local-storage.md` documenting normalized data URLs, privacy and quota tradeoffs, rejected network storage, and the threshold for reconsidering IndexedDB.
- [x] Review the final diff for accidental report artifacts, raw source-image persistence, secrets, stale version-one documentation, unrelated formatting, and new network or runtime dependencies.
- [x] Check every new acceptance criterion against automated or documented manual evidence.

**Final Validation**

- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test:coverage`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] Workspace diagnostics report no relevant errors.
- [x] Desktop screenshot inspection passed.
- [x] Mobile screenshot inspection passed.
- [x] Reduced-motion inspection passed.

**Handoff:** Record complete workflow evidence, browser versions, screenshots inspected, coverage results, storage migration behavior, and any intentionally manual assertions in the Session Log.

---

## Session 14: Activity Disclosure And Goal Actions

**Depends on:** Session 13

**Outcome:** Goal cards keep their established editorial composition while exposing a clearer primary transaction action and a compact, accessible activity disclosure whose complete ledger reads newest to oldest.

- [x] Write failing `ActivityList` tests for a fully collapsed default, an entry-count label, `aria-expanded` and `aria-controls`, expansion, collapse, and an empty goal without a meaningless disclosure control.
- [x] Write failing `ActivityList` tests proving expansion reveals every matching transaction newest to oldest, with timestamp and transaction ID still providing deterministic tie behavior through the existing domain ordering helper.
- [x] Write failing reason-presentation tests for a visible `Reason` label, full untruncated text, omission when no reason exists, and a 160-character reason remaining attached to its matching withdrawal.
- [x] Update `src/components/ActivityList.tsx` with local disclosure state only; reverse a copied `transactionsForGoal` result at the presentation boundary without changing the domain helper, persisted state, or immutable records.
- [x] Add a goal-specific controlled-region ID and a text disclosure button with a Lucide chevron; use `Show N activities` while closed and `Hide activity` while open.
- [x] Render optional withdrawal reasons as secondary notes inside their matching rows, with a compact visible `Reason` label and the existing `data-testid="withdrawal-reason"` retained on the reason text.
- [x] Style the disclosure and reason note in `src/styles/global.css` using the existing ledger language: compact spacing, a muted left rule, normal body weight, robust wrapping, and no nested card, badge, speech bubble, tooltip, truncation, or internal scrolling region.
- [x] Use `AnimatePresence` to reveal or hide the ledger as one calm region and rotate the chevron subtly; set `initial={false}` and render immediate final states under reduced motion rather than staggering historical rows.
- [x] Write failing `GoalCard` tests for a visible icon-plus-text Add transaction control while preserving direct, compact edit and delete actions with their existing accessible names.
- [x] Update `TransactionDialog.tsx`, `GoalCard.tsx`, and `src/styles/global.css` so Add transaction is the visually dominant action, edit and delete remain directly available, narrow layouts use stable `minmax(0, 1fr) auto auto` tracks, and every target remains at least 44px.
- [x] Re-run affected dashboard tests and update assertions that previously assumed the activity list was always mounted or ordered oldest first.

**Validation**

- [x] `npm test -- --run src/components/ActivityList.test.tsx src/components/GoalCard.test.tsx src/components/GoalsDashboard.test.tsx`
- [x] `npm run format:check`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] Workspace diagnostics report no relevant errors.

**Handoff:** Record disclosure labels and semantics, newest-first presentation behavior, reason-note treatment, action hierarchy, reduced-motion behavior, and focused test results in the Session Log.

---

## Session 15: Shared Responsive Dialog Motion

**Depends on:** Session 14

**Outcome:** Every modal uses one accessible, restrained entrance and exit language, appearing as a safe-area-aware bottom sheet on phones and the existing centered panel on larger viewports.

- [x] Write focused failing tests for a shared dialog surface that prove open and closed rendering, accessible dialog attributes, exit completion, and immediate reduced-motion state.
- [x] Create `src/components/DialogSurface.tsx` using the existing `motion/react` dependency and `AnimatePresence`; centralize backdrop and panel variants with a short opacity transition and approximately 8-12px of calm vertical travel.
- [x] Keep focus ownership explicit in callers: the shared surface handles visual presence and exit completion, while each dialog retains its current accessible name, initial-focus target, focus containment, Escape behavior, and key handler.
- [x] Migrate `GoalFormDialog.tsx` and `TransactionDialog.tsx` to the shared surface, preserving validation, form reset, upload cancellation, amount focus, and trigger-focus restoration.
- [x] Migrate `DeleteGoalDialog.tsx`, `WithdrawalWarningDialog.tsx`, and the reset confirmation in `StorageStatus.tsx`, preserving safe initial focus and destructive confirmation semantics.
- [x] Defer trigger-focus restoration until exit completion so focus never moves behind a still-visible surface; continue skipping stale-trigger restoration when a destructive action removes its trigger.
- [x] Coordinate `GoalsDashboard.tsx` warning cancellation and confirmation with controlled exit completion before returning focus to the originating transaction control, without changing pending-withdrawal reducer behavior or creating two interactive `aria-modal` surfaces.
- [x] Add dialog motion and placement tokens to `src/styles/global.css` without changing the current palette, typography, backdrop strength, or desktop width.
- [x] Below the existing 48rem breakpoint, align the backdrop to the bottom and make the panel a full-width, `100dvh`-bounded, safe-area-aware sheet with only its top corners rounded and internally reachable overflow.
- [x] At 48rem and above, preserve the centered panel with its existing maximum 34rem width and bounded vertical scrolling.
- [x] Add regression tests for focus wrapping, Escape, cancellation, submission, warning confirmation, permanent deletion, reset confirmation, and trigger-focus restoration after animated exits.

**Validation**

- [x] `npm test -- --run src/components/GoalFormDialog.test.tsx src/components/TransactionDialog.test.tsx src/components/DeleteGoalDialog.test.tsx src/components/WithdrawalWarningDialog.test.tsx src/components/StorageStatus.test.tsx src/components/GoalsDashboard.test.tsx`
- [x] `npm run format:check`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] Workspace diagnostics report no relevant errors.

**Handoff:** Record the shared surface contract, responsive placement rules, exit-focus timing, warned-withdrawal layering, and focused test results in the Session Log.

---

## Session 16: Interaction Feedback And Local Motion

**Depends on:** Session 15

**Outcome:** Controls, conditional form regions, and artwork processing provide quiet, immediate feedback without layout instability or changes to the application’s fundamental visual identity.

- [x] Write focused failing tests for transaction-mode changes, withdrawal-reason visibility, transaction-preview visibility, artwork-processing status, and normalized preview completion before changing motion behavior.
- [x] In `TransactionDialog.tsx`, reveal and remove the withdrawal-reason field and transaction preview with short, restrained transitions while keeping validation and `aria-live="polite"` content available immediately to assistive technology.
- [x] In `GoalFormDialog.tsx`, pair the existing artwork-processing status with a Lucide loading indicator, retain submission disabling and abort behavior, and fade the normalized preview into a stable reserved region.
- [x] Add explicit hover, focus, active, and disabled treatments to controls in `src/styles/global.css`; use a restrained `scale(0.98)` pointer-press response and named transition properties rather than `transition: all`.
- [x] Refine segmented-control selection so deposit and withdrawal mode changes are unmistakable without relying on motion alone.
- [x] Keep the existing global focus outline visible and make form-control focus treatment consistent without reducing current contrast.
- [x] Ensure all new transforms, transitions, icon motion, conditional-region motion, and processing indicators resolve immediately under `prefers-reduced-motion`.
- [x] Verify stable dimensions for action groups, segmented controls, artwork previews, dialog actions, and disabled buttons so interaction states cannot move neighboring content.
- [x] Review CSS colors, fonts, radii, shadows, and page composition to confirm this session introduces no palette shift, typography change, nested cards, decorative effects, or broad redesign.

**Validation**

- [x] `npm test -- --run src/components/TransactionDialog.test.tsx src/components/GoalFormDialog.test.tsx src/components/GoalCard.test.tsx src/components/ProgressMeter.test.tsx`
- [x] `npm test -- --run`
- [x] `npm run format:check`
- [x] `npm run typecheck`
- [x] `npm run lint`
- [x] `npm run build`
- [x] Workspace diagnostics report no relevant errors.

**Handoff:** Record conditional-region behavior, tactile states, artwork feedback, reduced-motion fallbacks, stable-dimension checks, and validation results in the Session Log.

---

## Session 17: Design Polish Browser Gate

**Depends on:** Sessions 14 through 16

**Outcome:** Desktop, mobile, reduced-motion, keyboard, documentation, and full-suite evidence verify the complete interaction-polish release without regressions to product behavior or visual identity.

- [x] Extend `e2e/saving-goals.spec.ts` with enough transactions to prove each activity log is collapsed by default, reports its entry count, expands to every entry newest to oldest, and collapses again.
- [x] Assert optional withdrawal reasons retain their visible `Reason` labels, remain associated with the correct withdrawals, persist after reload, and wrap without colliding with right-aligned amounts.
- [x] Add responsive geometry assertions proving action controls do not wrap or overflow, expanded activity remains within the viewport, mobile sheets sit against the viewport bottom and safe area, and desktop dialogs remain centered and bounded.
- [x] Add reduced-motion assertions proving activity disclosure, dialog surfaces, conditional form regions, processing feedback, and control states render their immediate final state while preserving all information.
- [x] Complete keyboard-only create/cancel, activity expand/collapse, deposit, warned-withdrawal cancel/confirm, edit, delete, artwork, and storage-reset workflows; verify focus wrapping, Escape, and restoration after exits.
- [x] Capture representative dashboard, expanded-activity, transaction-sheet, warning-dialog, and artwork-processing screenshots for desktop Chromium, Pixel 7 mobile Chromium, and reduced-motion Chromium.
- [x] Inspect screenshots for action wrapping, clipped labels, long reason or amount collisions, sheet framing, backdrop layering, focus visibility, unstable dimensions, overlap, unintended palette/type changes, and unexpected layout shifts.
- [x] Update `docs/project-brief.md` current status with collapsed-by-default newest-first activity, labeled reason notes, responsive dialog placement, and reduced-motion-safe interaction feedback.
- [x] Update `README.md` only where the feature summary needs to mention collapsible activity and responsive mobile dialogs; do not expand product scope or alter local-data guarantees.
- [x] Review the final diff for duplicated dialog behavior, accidental domain or storage changes, stale generated screenshots, report artifacts, secrets, unrelated formatting, dependency churn, and stale documentation.
- [x] Check every Session 14-17 acceptance point against automated or documented manual evidence and add the completed Session Log entries newest first.

**Final Validation**

- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test:coverage`
- [x] `npm run build`
- [x] `npm run test:e2e`
- [x] `git diff --check`
- [x] Workspace diagnostics report no relevant errors.
- [x] Desktop screenshot inspection passed.
- [x] Mobile screenshot inspection passed.
- [x] Reduced-motion screenshot inspection passed.

**Handoff:** Record browser versions, activity and reason evidence, dialog geometry, keyboard and focus results, screenshot findings, coverage totals, documentation changes, and any intentionally manual assertions in the Session Log.

---

## Session Log

Add newest entries at the top. Keep entries brief and factual.

### 2026-08-10 - Session 17: Design Polish Browser Gate

- Completed: Extended Playwright coverage for collapsed count-labeled activity, full newest-first expansion and collapse, labeled withdrawal-reason persistence and row association, one-row goal actions, long-reason and viewport containment, centered desktop dialogs, safe-area-aware Pixel 7 bottom sheets, immediate reduced-motion states, and keyboard-only create/cancel, activity, deposit, warned-withdrawal cancel/confirm, edit, delete, artwork, and storage-reset workflows. Captured and inspected dashboard, expanded-activity, transaction, warning, and artwork-processing states for all three projects. Contained right-edge action tooltips on narrow viewports and updated the project brief and README without changing scope or local-data guarantees.
- Validation: Red browser evidence first failed because Session 14 activity is intentionally collapsed; the focused disclosure test then passed. The final gate passed `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:coverage` (177 tests across 22 files; 91.83% statements, 87.54% branches, 96.71% functions, and 91.75% lines), `npm run build`, `npm run test:e2e` (45 tests across desktop, Pixel 7 mobile, and reduced-motion Chromium), and `git diff --check`; workspace diagnostics were clean. Playwright 1.62.1 used Chromium 151.0.7922.34.
- Decisions or deviations: Fifteen ignored Session 17 screenshots passed inspection for action wrapping, reason and amount separation, clipping, overflow, dialog and backdrop framing, focus visibility, stable processing dimensions, overlap, palette, typography, and layout shifts. Geometry assertions allow 2px compositor rounding while enforcing viewport bounds, mobile full-width bottom anchoring and safe-area padding, and desktop centering and height/width limits. The processing screenshot uses a test-only delayed image decode and aborts the edit afterward. Session 14-17 unit, browser, keyboard, geometry, reduced-motion, and manual screenshot evidence was reviewed; no domain, storage, state, dependency, or persisted-data behavior changed, and no generated screenshots or reports are tracked.
- Next unchecked task: None; Session 17 and the interaction-polish release gate are complete.

### 2026-08-10 - Session 16: Interaction Feedback And Local Motion

- Completed: Added short reduced-motion-aware presence transitions for withdrawal reason and projected transaction regions, with exiting content hidden immediately from assistive technology and the projected values retained as a polite live region. Added a stable artwork feedback stage with a Lucide processing indicator, submission and abort behavior preserved, and normalized previews fading into the reserved region. Added fixed segmented-control indicators with distinct existing deposit and withdrawal colors plus explicit hover, focus, active, and disabled states using named transitions and transform-only `scale(0.98)` press feedback.
- Validation: Red tests first failed on absent conditional-region markers, artwork stage, loading icon, and reduced-motion marker. The exact focused command passed 29 tests across `TransactionDialog`, `GoalFormDialog`, `GoalCard`, and `ProgressMeter`; the full suite passed 177 tests across 22 files; `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed; workspace diagnostics were clean.
- Decisions or deviations: Conditional regions use 160ms opacity and 6px vertical travel, with zero-duration final states under reduced motion. The artwork stage keeps a 5.75rem minimum height, action buttons keep stable minimum widths, mode indicators reserve their dimensions in both states, and disabled controls change opacity without changing size. The existing palette, expressive fonts, radii, shadows, focus outline, ledger composition, and flat section structure remain unchanged. Updated the app-level corrupt-storage reset test to await the session 15 exit-completion contract instead of asserting synchronously.
- Next unchecked task: Session 17 - complete the design-polish browser gate, responsive and reduced-motion evidence, documentation updates, and release validation.

### 2026-08-10 - Session 15: Shared Responsive Dialog Motion

- Completed: Added one `AnimatePresence`-backed dialog surface with shared backdrop and panel variants, a 160ms opacity transition, 10px vertical travel, reduced-motion final states, caller-owned accessible naming and key handling, and exit completion callbacks. Migrated goal, transaction, delete, withdrawal-warning, and storage-reset dialogs; deferred trigger focus and destructive callbacks until exits complete; and sequenced warned withdrawals so the transaction surface exits before the warning mounts.
- Validation: The shared-surface contract suite and six focused dialog suites passed 38 tests total; the exact Session 15 command passed 35 tests; `npm run format:check`, `npm run typecheck`, `npm run lint`, and `git diff --check` passed; workspace diagnostics were clean. Red tests first failed on immediate unmount, immediate focus restoration, immediate destructive callbacks, and simultaneous warning handoff.
- Decisions or deviations: Dialog callers retain initial focus, focus containment, Escape, validation, form reset, upload cancellation, and semantic ownership. Destructive goal deletion intentionally skips restoring a trigger that is removed. Mobile panels are full-width bottom sheets bounded by `100dvh`, padded for safe areas, scrollable, and rounded only at the top; layouts at 48rem and wider retain the centered 34rem panel and existing backdrop strength.
- Next unchecked task: Session 16 - add local interaction feedback, conditional form-region motion, artwork processing feedback, and stable control states.

### 2026-08-10 - Session 14: Activity Disclosure And Goal Actions

- Completed: Replaced the always-mounted ledger with a collapsed, count-aware activity disclosure using goal-specific `aria-controls`, `aria-expanded`, a Lucide chevron, and one `AnimatePresence` region; presented the complete immutable ledger newest first by reversing the existing deterministic domain result only at the UI boundary; added compact, visibly labeled, untruncated withdrawal reason notes; and made Add transaction a persistent icon-plus-text primary action beside directly available 44px edit and delete controls in stable responsive grid tracks.
- Validation: The focused Session 14 command passed 18 tests across `ActivityList`, `GoalCard`, and `GoalsDashboard`; `npm run format:check`, `npm run typecheck`, and `npm run lint` passed; workspace diagnostics and `git diff --check` were clean. Red tests first failed on the absent disclosure, oldest-first mounted ledger, tooltip-only transaction action, and missing reduced-motion marker.
- Decisions or deviations: `transactionsForGoal` and persisted records remain unchanged; its copied result is reversed for newest-first display, including reverse timestamp-and-ID tie order. Empty goals retain plain `No activity yet.` text with no disclosure. Reasons remain attached to their withdrawal row under a muted left rule with the existing test ID. Motion uses a subtle region fade and 6px travel plus chevron rotation, while reduced motion uses zero-duration final states and no row staggering.
- Next unchecked task: Session 15 - introduce the shared responsive dialog surface and coordinate focus restoration with animated exits.

### 2026-08-10 - Session 13: Feature Integration And Release Gate

- Completed: Extended Playwright helpers with optional withdrawal reasons and in-memory PNG/JPEG/WebP generation; covered ordinary and warned reasons through confirmation, reload, and exact ledger counts; covered artwork creation, normalized PNG type and dimensions, reload, replacement, removal, invalid-type and oversized-source preservation; added keyboard-focused artwork and reason workflows; strengthened responsive geometry and screenshots with a long name, 56px artwork, and a 160-character reason; documented version two, limits, local processing, quota behavior, and precise general-note exclusions; and accepted ADR 0002 for bounded localStorage artwork. E2E specs are now included in the canonical TypeScript project.
- Validation: `npm run test:coverage` passed 166 tests across 21 files with 91.28% statements, 87.12% branches, 96.5% functions, and 91.14% lines; `npm run test:e2e` passed 45 tests across desktop, Pixel 7 mobile, and reduced-motion Chromium; `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` passed; workspace diagnostics and `git diff --check` were clean. Playwright 1.62.1 used Chrome for Testing 151.0.7922.34.
- Decisions or deviations: Six ignored Session 13 screenshots were inspected and passed for artwork clarity and stable sizing, reason wrapping and amount alignment, horizontal overflow, clipping, overlap, and dialog framing. Keyboard focus and activation covered Add, Replace, Remove, submissions, reason entry, and warned confirmation; Playwright `setInputFiles` substituted only for choosing a file in the native OS picker, which browser automation cannot control. Valid version-one migration remains covered by storage tests, version-two persistence is asserted in the artwork browser workflow, rejected files retain the prior saved icon, and no binary fixtures, report artifacts, raw sources, secrets, dependencies, or network runtime were added.
- Next unchecked task: None; Session 13 and the planned feature release gate are complete.

### 2026-08-10 - Session 12: Custom Goal Artwork

- Completed: Added optional normalized artwork to goal creation and explicit preserve, replace, or remove edit semantics; introduced a browser-only PNG/JPEG/WebP upload boundary with 2 MB source validation, decode and canvas failure handling, aspect-ratio fitting, transparent PNG encoding, 128px and 100 KB limits, abort-aware stale-selection handling, and bitmap cleanup; added accessible upload errors, processing state, previews, replacement and removal controls; and rendered decorative artwork in a stable 56px goal-heading region without an absent placeholder.
- Validation: The Session 12 domain/browser command passed 29 tests and the component command passed 14 tests; `npm test -- --run` passed 166 tests across 21 files; `npm run format:check`, `npm run typecheck`, `npm run lint`, and `npm run build` passed. Real Chromium upload produced and persisted a normalized PNG through reload; desktop inspection passed, and a 375x812 check measured a 56x56 artwork region, no heading overlap, and no horizontal overflow.
- Decisions or deviations: Creation omits artwork unless normalization succeeds, while every edit must explicitly preserve, replace, or remove it. Starting a newer upload aborts and supersedes the older result; closing or removing aborts active work, and decoded bitmaps close in every post-decode outcome. Canvas remains transparent by default, dimensions never upscale, and over-limit normalized output is rejected instead of persisted.
- Next unchecked task: Session 13 - add integrated Playwright coverage, complete keyboard and screenshot audits, update release documentation, and run the final release gate.

### 2026-08-10 - Session 11: Optional Withdrawal Reasons

- Completed: Added a withdrawal-only optional reason across the transaction domain, reducer pending state, transaction and warning dialogs, dashboard callbacks, and immutable activity history. Blank reasons are omitted, nonblank reasons are trimmed, the shared 160-character limit is enforced by the domain, storage schema, and UI, and long activity reasons wrap without shifting right-aligned amounts.
- Validation: The Session 11 domain and reducer command passed 22 tests; the component command passed 19 tests; `npm test -- --run` passed 143 tests across 20 files; `npm run format:check`, `npm run typecheck`, `npm run lint`, and `git diff --check` passed. Changed production files report no diagnostics; the existing goal-icon test retains a stale editor-only missing-module diagnostic despite passing TypeScript and Vitest resolution.
- Decisions or deviations: `RecordTransactionInput` is discriminated so deposits cannot accept reason metadata, and runtime construction also omits reasons unless the kind is `withdrawal`. Warned withdrawals store the normalized reason only in pending state until confirmation; cancellation preserves savings and revision, while confirmation creates exactly one record. Existing amount focus, overdraft blocking, exact-threshold behavior, announcements, and trigger-focus restoration remain unchanged. Browser persistence, mobile wrapping, and real-browser focus coverage remain Session 13 scope.
- Next unchecked task: Session 12 - add custom goal artwork domain semantics, browser normalization, goal-dialog controls, and stable goal-card presentation.

### 2026-08-10 - Session 10: Version-Two Data Contract

- Completed: Added optional `iconDataUrl` goal metadata and withdrawal-only `reason` transaction metadata; introduced shared normalized-PNG data URL constants and validation; split storage validation into strict version-one and version-two schemas; migrated valid version-one state to version two without changing goals or transactions; and updated saves and hook expectations to emit version two while retaining existing recovery behavior.
- Validation: The focused Session 10 command passed 35 tests across the goal-icon, schema, and storage suites; `npm test -- --run` passed 134 tests across 20 files; `npm run format:check`, `npm run typecheck`, and `npm run lint` passed; workspace diagnostics and `git diff --check` reported no relevant errors.
- Decisions or deviations: Version two remains `{ version: 2, state: { goals, transactions } }`; a goal may include a syntactically valid `data:image/png;base64,` value with a nonempty encoded payload of at most 102,400 ASCII bytes, and only withdrawals may include a trimmed 1-160 character reason. Legacy data must pass the unchanged strict version-one field contract before its envelope version is promoted. Saves validate the complete version-two envelope before writing. Malformed JSON, invalid envelopes, unknown versions, schema-invalid saves, and the prior raw value after quota failures remain preserved byte-for-byte behind the recovery flow.
- Next unchecked task: Session 11 - add optional withdrawal reasons throughout the domain, reducer, dialogs, dashboard, and activity history.

### 2026-08-09 - Session 9: Documentation And Release Gate

- Completed: Documented target users, final MVP scope and exclusions, architecture, privacy and local-only storage constraints, recovery/reset behavior, prerequisites, and verified commands; accepted the client-only React and local-storage architecture decision; aligned package metadata to version 1.0.0; and checked every acceptance criterion against unit, component, browser, or documented manual evidence. Final diff review found only the intended five release files, no generated artifacts, whitespace errors, or likely secrets.
- Validation: `npm ci` installed 264 packages and audited 265 with no vulnerabilities; `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test:coverage` (111 tests, 90.21% statements), `npm run build`, and `npm run test:e2e` (33 tests across desktop, mobile, and reduced-motion Chromium) passed. The development build loaded in the shared browser at `http://127.0.0.1:5175/` with the application heading and empty-state workspace rendered.
- Decisions or deviations: The VS Code diagnostics cache continued to show stale missing-module reports in unchanged tests immediately after `npm ci` replaced `node_modules`; direct TypeScript compilation and both test runners resolved those files successfully, so no relevant source diagnostic remained. The development server is intentionally left running on port 5175 for review.
- Next unchecked task: None; the 1.0.0 MVP release gate is complete.

### 2026-08-09 - Session 8: Browser Tests And Responsive Verification

- Completed: Added isolated Playwright coverage for creation and reload persistence, separate USD/JPY formatting, deposits, ordinary and warned withdrawals, overdraft ledger protection, first completion and overfunding without replay, locked goal fields during editing, cascading deletion, and malformed-storage preservation through reset. Added responsive assertions for horizontal overflow, nonzero CSS progress fills, and dialog viewport framing, plus dashboard and dialog screenshots for every configured project.
- Validation: `npm run test:e2e` passed 33 tests across desktop Chromium, Pixel 7 mobile Chromium, and reduced-motion Chromium; `npm run build`, `npm run format:check`, `npm run lint`, and `npm run typecheck` passed. Chromium 151.0.7922.34 was used. Six desktop, mobile, and reduced-motion dashboard/dialog screenshots were inspected with no blank progress, clipping, overlap, or framing defects.
- Decisions or deviations: The progress meter is rendered with DOM and CSS transforms rather than canvas, so ARIA values, nonzero rendered fill widths, viewport geometry, and screenshots provide the visual evidence; no canvas pixel check applies. Explicit reset replaces malformed bytes with a valid empty envelope when the reset state is persisted.
- Next unchecked task: Session 9 - update the project brief with the finished MVP scope, target users, requirements, privacy constraints, and verified commands.

### 2026-08-09 - Session 7: Persistence Recovery And Accessibility Audit

- Completed: Added an actionable storage status region for unavailable, quota-failed, corrupt, and session-only states; gated mutable workflows until unavailable or corrupt initial storage is explicitly resolved; added a named, focus-contained permanent-reset confirmation; and verified malformed saved bytes remain unchanged through hydration and reset cancellation. Audited landmarks, heading order, visible labels, linked errors, dialog naming and focus behavior, icon labels, progress values, live announcements, keyboard order, visible focus, contrast, and reduced motion.
- Validation: `npm run format:check`, `npm test -- --run` (111 tests across 19 files), `npm run typecheck`, and `npm run lint` passed. Keyboard-only create, edit, deposit, warned withdrawal, and delete passed at desktop and 360x800 mobile widths with no horizontal overflow; dialog Escape and focus wrapping/restoration also passed. Measured text at 5.40:1 or better, focus outlines at 3.27:1 or better, and progress/control pairs at 4.21:1 or better.
- Decisions or deviations: Recovery messages expose no raw stored value. Initial corrupt or unavailable storage blocks editing until the user chooses session-only use or confirms reset; save failures retain the current in-memory state and remain usable. Existing CSS globally suppresses nonessential transition/animation duration under reduced motion, while `ProgressMeter` also renders its immediate reduced-motion state. No accessibility exceptions remain from this audit; browser-project automation and screenshot evidence remain Session 8 scope.
- Next unchecked task: Session 8 - add isolated Playwright coverage for the complete saving-goal workflows.

### 2026-08-09 - Session 6: Goal Presentation And Motion

- Completed: Added an accessible Motion progress meter with synchronized spring percentage/fill, capped visual and ARIA range, visible overfunding, transition-only completion accent, and immediate reduced-motion state; composed formatted balances, targets, completion state, recent activity, and Lucide tooltip actions in a responsive goal card; retained per-goal currencies and dashboard counts without aggregation; and introduced locally bundled Fraunces/IBM Plex Sans, ledger lines, restrained multicolor accents, and stable responsive controls.
- Validation: Focused Session 6 suites passed 15 tests; `npm run format:check`, `npm run typecheck`, `npm run lint`, and `npm run build` passed. Seeded Chromium checks at 1440x1000 and 360x800 found no horizontal overflow, kept long names and USD/JPY balances within their regions and on one numeric line, and confirmed reduced motion reports a settled nonanimated completion state. Desktop and mobile screenshots were inspected with visible progress fills and no collisions.
- Decisions or deviations: The existing persisted `completedAt` remains the completion replay guard; goals complete on initial hydration render settled, while only an in-session undefined-to-defined transition plays the accent. The layout changes at 48rem from a single-column flow to an asymmetric two-column goal region. Font imports use Latin-only package entry points. Session 7 still owns the full contrast, assistive-technology, live-region, focus-order, and keyboard audit.
- Next unchecked task: Session 7 - write recovery UI tests for unavailable, quota-failed, and corrupt storage states.

### 2026-08-09 - Session 5: Deposits, Withdrawals, And Activity

- Completed: Added a currency-aware transaction dialog with deposit/withdrawal segmented modes, linked amount errors, projected balance and progress; immediate overdraft and aggregate-overflow blocking; a controlled large-withdrawal confirmation with projected impact and trigger-focus restoration; deterministic localized activity history; reducer-backed dashboard actions; and polite deposit and confirmed-withdrawal announcements.
- Validation: `npm test -- --run` passed 95 tests across 16 files; focused transaction and dashboard tests passed again after the final callback fix; `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed; workspace diagnostics reported no errors.
- Decisions or deviations: A withdrawal exactly at the configured threshold commits directly; only a strictly larger share creates a pending warning. Cancellation leaves the ledger unchanged, confirmation consumes the pending request into exactly one record, and cancel, Escape, and confirmation restore focus to the initiating transaction action. Overdrafts and projected balances outside the safe-integer range are blocked before dispatch. Activity is ordered by timestamp and transaction ID through the domain helper.
- Next unchecked task: Session 6 - write progress-meter tests for semantics, overfunding, accessible values, and reduced motion.

### 2026-08-09 - Session 4: Goal Creation And Management

- Completed: Added accessible create/edit goal dialogs with linked field errors, immutable edit fields, Escape handling, focus containment and restoration; a named permanent-delete confirmation with safe initial focus and reducer-backed transaction cascade; first-run and populated dashboard compositions with goal/completion counts; reducer wiring through `useSavings`; and polite creation, editing, and deletion announcements.
- Validation: `npm test -- --run src/components/GoalFormDialog src/components/DeleteGoalDialog src/components/GoalsDashboard` passed 9 tests across 3 files; `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm run build`, and `git diff --check` passed; workspace diagnostics reported no errors.
- Decisions or deviations: Form validation reuses domain currency and minor-unit rules; edit mode renders currency and opening balance as disabled controls; destructive dialogs focus Cancel first. Goal rows intentionally show only names and management actions until Session 6; transaction controls and activity remain Session 5 placeholders.
- Next unchecked task: Session 5 - write component tests for transaction mode, amount validation, projected balance, and projected progress.

### 2026-08-09 - Session 3: Storage And Application State

- Completed: Added the strict Zod version-one storage envelope and migration entry point; typed load, save, reset, raw preservation, unavailable-storage, and quota behavior; a domain-backed reducer for goal, ledger, completion, warning confirmation, deletion, reset, and storage transitions; and lazy hydration with revision-gated persistence and session-only fallback.
- Validation: `npm test -- --run src/storage src/state` passed 25 tests across 4 files; `npm run typecheck` and `npm run lint` passed.
- Decisions or deviations: `saving-goal:state` stores `{ version: 1, state: { goals, transactions } }`; invalid JSON, invalid version-one data, and unknown versions return recovery-required state while preserving the original string; unavailable storage can continue session-only; quota and access failures retain in-memory changes as save-error state. Reducer commands are `goal/create`, `goal/edit`, `transaction/deposit`, `withdrawal/request`, `withdrawal/confirm`, `withdrawal/cancel`, `goal/delete`, `savings/reset`, and `storage/status`.
- Next unchecked task: Session 4 - write component tests for the goal form dialog.

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
