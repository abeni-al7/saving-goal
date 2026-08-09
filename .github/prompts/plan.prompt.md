---
name: Plan Change
description: "Create an implementation-ready plan for a feature, bug fix, or refactor without changing files"
argument-hint: "Describe the requested change and its constraints"
agent: plan
---

Read `AGENTS.md` and `docs/project-brief.md`, then inspect only the code and tests needed to understand the requested change.

Produce an implementation-ready plan that includes:

1. The current behavior and the code path that controls it.
2. Explicit assumptions, constraints, and acceptance criteria.
3. A small ordered set of changes with concrete file paths.
4. Focused validation for each behavior change.
5. Risks, migrations, documentation updates, or open decisions.

Do not edit files. Ask questions only when a missing decision would materially change the implementation.
