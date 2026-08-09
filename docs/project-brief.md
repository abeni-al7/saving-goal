# Project Brief

This document is the durable context for contributors and coding agents. Keep it factual, concise, and current as the project takes shape.

## Goal

Build a saving-goal application. Define the target users, primary problem, and measurable outcome before implementation begins.

## Current Status

The repository has a responsive React goal-management dashboard, accessible
create, edit, and permanent-delete dialogs, a tested money and saving goal
domain, a validated local-storage boundary and reducer-driven application
state, and executable formatting, linting, type-checking, unit-test,
browser-test, build, and preview commands.

## Product Scope

### In Scope

- To be defined before the first feature is implemented.

### Out Of Scope

- To be defined before the first feature is implemented.

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

## Persistence And Recovery

- The local-storage key is `saving-goal:state`.
- Version one stores `{ version: 1, state: { goals, transactions } }` and is
  validated with a strict Zod schema before entering application state.
- Missing data starts with an empty state. Valid data hydrates normally.
- Malformed JSON, schema-invalid data, and unknown versions are preserved
  byte-for-byte and require an explicit reset or session-only decision.
- Unavailable storage permits explicit session-only use. Save failures retain
  in-memory changes and surface a recoverable status.
- Only an explicit reset removes stored data.

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

## Quality Gates

- New behavior has focused automated coverage.
- Formatting, linting, type checks, tests, and builds pass when configured.
- User-visible or architectural changes update the relevant documentation.
- Security- or data-sensitive changes include explicit failure-path validation.

## Open Decisions

- Target users and first workflow
- Functional and non-functional requirements
- Application type and technology stack
- Data ownership, privacy, and persistence requirements
- Deployment target and observability needs
