# Project Brief

This document is the durable context for contributors and coding agents. Keep it factual, concise, and current as the project takes shape.

## Goal

Build a saving-goal application. Define the target users, primary problem, and measurable outcome before implementation begins.

## Current Status

The repository has a minimal React application shell and executable formatting,
linting, type-checking, unit-test, browser-test, build, and preview commands.

## Product Scope

### In Scope

- To be defined before the first feature is implemented.

### Out Of Scope

- To be defined before the first feature is implemented.

## Domain Terms

Document terms whose meaning affects product behavior, such as goal, contribution, target amount, target date, and progress.

## Architecture

The application uses React, TypeScript, and Vite and is delivered as a static
client-side application. Vitest and React Testing Library cover component and
domain behavior; Playwright covers desktop, mobile, and reduced-motion browser
workflows. Persistence and module boundaries will be documented as those
features are implemented.

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
