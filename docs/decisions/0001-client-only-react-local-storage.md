# ADR 0001: Client-Only React With Local Storage

- Status: Accepted
- Date: 2026-08-09
- Owners: Saving Goals maintainers

## Context

The MVP must let an individual manage multiple saving goals, immutable
transactions, progress, and withdrawal warnings without an account or backend.
It must be deployable as static files, retain data across refreshes, work
offline after loading, and surface storage failures without silently losing or
replacing data. Financial amounts require exact minor-unit arithmetic, but the
application does not connect to banks or provide financial advice.

## Decision

Build a static React and TypeScript single-page application with Vite. Keep
money, goal, ledger, progress, and withdrawal rules in pure domain modules and
coordinate state with a reducer. Store one strict, versioned Zod-validated
envelope under `saving-goal:state` in browser local storage. Derive balances
from immutable transactions instead of persisting a mutable balance.

Hydrate storage once, persist only successful state revisions, preserve invalid
raw values, and require an explicit user choice before resetting invalid data or
continuing without persistence. Use Vitest for domain and component behavior and
Playwright for complete desktop, mobile, reload, and reduced-motion workflows.

## Alternatives Considered

- **Backend API and database:** Rejected for the MVP because accounts,
  authorization, operations, and data-retention obligations add material scope
  without supporting the local-only product goal.
- **IndexedDB:** Rejected because the state is small and local storage provides a
  simpler synchronous hydration boundary. Reconsider if data volume, querying,
  or atomic multi-record writes become requirements.
- **In-memory state only:** Rejected because goals and history must survive a
  normal refresh and browser restart.
- **Persisting balances directly:** Rejected because duplicated ledger and
  balance state can diverge. Derivation keeps transactions as the source of
  truth.

## Consequences

The application is inexpensive to host, has no server runtime, and sends no
saving data over the network. Domain behavior remains independently testable,
and a versioned boundary provides a migration point.

Data is limited to one browser profile and is neither synchronized, encrypted
by the application, nor backed up. Browser storage can be unavailable, cleared,
or quota-limited. Device loss or site-data removal can therefore cause permanent
loss. Any future cloud feature requires a migration design and a new decision
covering authentication, authorization, privacy, and operations.

## Validation

Unit and component tests verify domain arithmetic, immutable ledger behavior,
schema validation, reducer transitions, persistence recovery, dialogs, and
accessibility behavior. Playwright verifies primary workflows, reload
persistence, malformed-data recovery, responsive rendering, and reduced motion
across configured Chromium projects. The release gate runs clean install,
formatting, linting, type checking, coverage, build, and browser tests.

Revisit this decision if users require multi-device access, sharing, backups,
large histories, cross-device recovery, or server-enforced security controls.
