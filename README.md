# Saving Goals

A private, responsive saving-goal tracker that runs entirely in the browser.
Create goals in different currencies, record deposits and withdrawals, review
an immutable activity history, and see progress without creating an account.

## Features

- Multiple goals with per-goal ISO currencies and withdrawal thresholds
- Exact minor-unit money arithmetic and localized amount formatting
- Immutable opening, deposit, and withdrawal transactions
- Projected transaction effects, overdraft protection, and confirmation for
  unusually large withdrawals
- Accessible progress, first-completion feedback, dialogs, live announcements,
  keyboard workflows, and reduced-motion support
- Versioned local persistence with explicit corrupt-data and unavailable-storage
  recovery
- Responsive desktop and mobile layouts

## Prerequisites

- Node.js 22 or later
- npm 10 or later
- Chromium installed through Playwright for browser tests

## Install And Run

```bash
npm ci
npm run dev
```

Open the URL printed by Vite. The default is `http://localhost:5173/` when that
port is available.

To exercise a production build locally:

```bash
npm run build
npm run preview
```

## Quality Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:coverage
npm run build
npm run test:e2e
```

Install the Playwright browser once on a new machine if needed:

```bash
npx playwright install chromium
```

## Local-Only Data

Saving data is stored under `saving-goal:state` in the current browser profile's
local storage. It is not sent to a server, synchronized, encrypted by this app,
or backed up. Anyone with access to the browser profile may be able to inspect
it. Clearing site data, using private browsing, changing browser profiles, or
losing the device can permanently remove the data.

When saved data is invalid, the app preserves it and shows **Saved data needs
attention**. Choose **Continue this session** to leave the stored value unchanged
or **Reset saved data**, then **Reset permanently**, to replace it with an empty
state. To clear otherwise valid data, delete each goal in the app or clear this
site's data through the browser settings. Both actions permanently remove the
associated transaction history.

## Architecture

React and TypeScript render a static Vite application. Pure domain modules own
money and saving rules, a reducer coordinates state, and a strict Zod schema
guards the versioned storage boundary. See
[ADR 0001](docs/decisions/0001-client-only-react-local-storage.md) for the
decision and tradeoffs.
