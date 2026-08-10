# Saving Goals

A private, responsive saving-goal tracker that runs entirely in the browser.
Create goals in different currencies, record deposits and withdrawals, review
an immutable activity history, and see progress without creating an account.

## Features

- Multiple goals with per-goal ISO currencies and withdrawal thresholds
- Exact minor-unit money arithmetic and localized amount formatting
- Immutable opening, deposit, and withdrawal transactions
- Collapsible, count-labeled activity ledgers presented newest first
- Optional trimmed withdrawal reasons visibly labeled in immutable history
- Prominent goal artwork with local preview, replacement, and removal
- Projected transaction effects, overdraft protection, and confirmation for
  unusually large withdrawals
- Accessible progress, first-completion feedback, live announcements, keyboard
  workflows, and reduced-motion-safe interaction feedback
- Versioned local persistence with explicit corrupt-data and unavailable-storage
  recovery
- Responsive desktop dialogs and safe-area-aware mobile bottom sheets
- Production page-view analytics and web-vitals reporting through Vercel

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
local storage using a strict version-two envelope. It is not sent to a server,
synchronized, encrypted by this app, or backed up. Anyone with access to the
browser profile may be able to inspect it. Clearing site data, using private
browsing, changing browser profiles, or losing the device can permanently
remove the data. Valid version-one data migrates automatically; malformed and
unsupported data remains preserved for explicit recovery.

Withdrawal reasons are optional, limited to 160 characters, and stored only on
withdrawal records. Goal artwork accepts PNG, JPEG, and WebP source files up to
2 MB. The browser processes artwork locally without uploading it, preserves its
aspect ratio, does not crop or upscale it, and stores only a normalized PNG with
a longest side of 128px and a Base64 payload no larger than 100 KB.
Saved artwork appears in a prominent responsive stage that follows the image's
intrinsic aspect ratio and is named for its goal for assistive technology.

Artwork uses substantially more local-storage quota than text. If the browser
rejects a save because its quota is full, the app keeps the current in-memory
state for the session, reports the persistence failure, and does not overwrite
the prior saved value. Removing artwork reduces future storage usage.

When saved data is invalid, the app preserves it and shows **Saved data needs
attention**. Choose **Continue this session** to leave the stored value unchanged
or **Reset saved data**, then **Reset permanently**, to replace it with an empty
state. To clear otherwise valid data, delete each goal in the app or clear this
site's data through the browser settings. Both actions permanently remove the
associated transaction history.

## Vercel Observability

Production deployments include Vercel Web Analytics for automatic page views
and Speed Insights for web-vitals and performance metrics. Enable both features
for the project in the Vercel Dashboard before deploying. The integrations do
not track in local development.

Saving data remains local: the app does not send goal names, amounts,
currencies, withdrawal reasons, artwork, or transaction records as custom
analytics events.

## Architecture

React and TypeScript render a static Vite application. Pure domain modules own
money and saving rules, a reducer coordinates state, and a strict Zod schema
guards the versioned storage boundary. The React root mounts Vercel Analytics
and Speed Insights beside the application. See
[ADR 0001](docs/decisions/0001-client-only-react-local-storage.md) for the
client-only decision and [ADR 0002](docs/decisions/0002-bounded-goal-icons-in-local-storage.md)
for bounded artwork storage and its reconsideration threshold.
