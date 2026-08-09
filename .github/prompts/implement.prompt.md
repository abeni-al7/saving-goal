---
name: Implement Change
description: "Implement a scoped feature, bug fix, or refactor and validate it end to end"
argument-hint: "Describe the change, acceptance criteria, and constraints"
agent: agent
---

Read `AGENTS.md` and `docs/project-brief.md` before editing.

Implement the requested change end to end:

1. Inspect the smallest relevant code path, nearby tests, and working tree.
2. State a falsifiable hypothesis or concrete acceptance criteria.
3. Make the smallest coherent edit that addresses the root cause.
4. Run the narrowest relevant check immediately after the first substantive edit.
5. Add or update focused tests, then run broader checks according to risk.
6. Review the final diff and update documentation affected by the change.

Finish with a concise summary of changed behavior, validation performed, and any residual risk. Do not commit or push unless explicitly requested.
