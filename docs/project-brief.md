# Project Brief

This document is the durable context for contributors and coding agents. Keep it factual, concise, and current as the project takes shape.

## Goal

Build a private, browser-based saving-goal application for individuals who want
to plan several purchases or reserves without creating an account or sharing
financial data with a service. A successful MVP lets a user complete the core
create, fund, withdraw, review, and delete workflows on mobile and desktop while
retaining valid data across browser refreshes.

## Target Users

- Individuals tracking earmarked savings on a personal device.
- Privacy-conscious users who prefer local-only data over an account or cloud
  sync.
- Users managing goals in one or more currencies without currency conversion or
  aggregate totals.

## Current Status

The repository has a responsive editorial React goal-management dashboard with
accessible animated progress, overfunding and persisted completion states,
per-goal localized balances and activity, and icon-based goal controls. Create,
edit, permanent-delete, deposit, withdrawal, and large-withdrawal confirmation
flows are implemented over a tested money and saving-goal domain, a validated
local-storage boundary, and reducer-driven application state. Unavailable,
quota-failed, and corrupt storage states provide explicit session-only or reset
recovery without exposing or silently overwriting raw data. Primary workflows
have passed desktop and mobile keyboard, focus, contrast, landmark, form,
dialog, live-region, and reduced-motion audits. Formatting, linting,
type-checking, unit-test, browser-test, build, and preview commands are
executable. The persisted model now uses a strict version-two envelope that can
hold an optional normalized goal icon and an optional withdrawal reason; the
corresponding user interfaces remain planned work.

## Product Scope

### In Scope

- Create, edit, and permanently delete multiple saving goals.
- Give each goal an immutable ISO currency and opening balance.
- Record timestamped deposits and withdrawals in an immutable ledger.
- Derive balances, progress, and first completion from goals and transactions.
- Warn before withdrawals above a per-goal threshold and reject overdrafts.
- Persist a versioned state envelope in browser local storage with explicit
  recovery for invalid or unavailable storage.
- Support keyboard navigation, accessible dialogs and announcements, responsive
  layouts, and reduced-motion preferences.

### Out Of Scope

- Authentication, user accounts, cloud sync, or multi-device access.
- Exchange rates, currency conversion, or totals across unlike currencies.
- Target dates, recurring deposits, archives, transaction editing, notes, and
  import or export.
- Bank connections, payment initiation, financial advice, and server-side
  backups.

## Domain Terms

- **Minor units:** Safe integer currency units, such as cents for USD. Balance
  arithmetic never uses floating-point major units.
- **Goal:** A named target with one immutable ISO currency, a positive target,
  and a configurable whole-number withdrawal warning percentage from 0 to 100.
- **Transaction:** An immutable opening, deposit, or withdrawal ledger record.
  A goal balance is always derived from its transactions.
- **Progress:** The balance divided by the target using integer floor division.
  The displayed percentage may exceed 100%, while visual fill is capped at 100%.
- **Completion:** The first time a balance reaches its target. Its timestamp is
  retained even if a later withdrawal lowers the balance.
- **Warned withdrawal:** A withdrawal strictly greater than the configured share
  of the current balance. An exact-threshold withdrawal does not warn, and an
  overdraft is always rejected.

## Architecture

The application uses React, TypeScript, and Vite and is delivered as a static
client-side application. Vitest and React Testing Library cover component and
domain behavior; Playwright covers desktop, mobile, and reduced-motion browser
workflows. Pure modules under `src/domain` own money parsing and formatting,
goal lifecycle rules, immutable ledger operations, progress and completion, and
withdrawal decisions. IDs and clocks are injected where records are created.
Application state hydrates once through `useSavings` and persists successful
durable changes through a revision-gated effect.

The application has no backend or runtime network dependency. Vite produces
static assets that can be hosted on any service capable of serving the built
files. Architecture rationale is recorded in
`docs/decisions/0001-client-only-react-local-storage.md`.

## Persistence And Recovery

- The local-storage key is `saving-goal:state`.
- Version two stores `{ version: 2, state: { goals, transactions } }` and is
  validated with a strict Zod schema before entering application state.
- Goals may contain an optional normalized PNG data URL whose encoded Base64
  payload is at most 100 KB. Withdrawals may contain an optional trimmed reason
  from 1 through 160 characters; opening balances and deposits cannot contain a
  reason.
- A valid version-one envelope is validated against its original strict schema
  and migrated in memory by changing only the version. The next successful
  state change persists version two.
- Missing data starts with an empty state. Valid data hydrates normally.
- Malformed JSON, schema-invalid data, and unknown versions are preserved
  byte-for-byte and require an explicit reset or session-only decision.
- Unavailable storage permits explicit session-only use. Save failures retain
  in-memory changes and surface a recoverable status.
- Only an explicit reset removes stored data.

## Privacy And Data Ownership

- Goal names, amounts, currencies, thresholds, normalized goal artwork, and
  transaction history remain in the current browser profile's local storage.
- The application does not transmit, synchronize, analyze, or back up saving
  data.
- Anyone with access to the browser profile may be able to inspect the locally
  stored data; this application is not an encrypted vault.
- Clearing browser site data, using private browsing, changing browsers or
  profiles, or losing the device can permanently remove the data.
- The UI never includes the raw stored value in recovery errors, and malformed
  data is not overwritten until the user explicitly resets it.

## Project Commands

Run each command from the repository root.

| Task             | Command                 |
| ---------------- | ----------------------- |
| Install          | `npm ci`                |
| Format           | `npm run format`        |
| Check formatting | `npm run format:check`  |
| Lint             | `npm run lint`          |
| Type-check       | `npm run typecheck`     |
| Unit tests       | `npm test -- --run`     |
| Test coverage    | `npm run test:coverage` |
| Browser tests    | `npm run test:e2e`      |
| Build            | `npm run build`         |
| Run locally      | `npm run dev`           |
| Preview build    | `npm run preview`       |

`npm ci` is the canonical clean install. Browser tests use Playwright-managed
Chromium; on a new machine, install it with `npx playwright install chromium` if
the browser binary is not already available.

All commands in this table were verified successfully on 2026-08-09 for the
1.0.0 MVP release.

## Quality Gates

- New behavior has focused automated coverage.
- Formatting, linting, type checks, tests, and builds pass when configured.
- User-visible or architectural changes update the relevant documentation.
- Security- or data-sensitive changes include explicit failure-path validation.

## Open Decisions

The MVP has no unresolved product or architecture decisions. A future move to
accounts, synchronization, or server-side persistence requires a new decision
record covering identity, authorization, migration, privacy, and operations.
