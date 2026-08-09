# Agent Guidelines

## Source Of Truth

- Read `docs/project-brief.md` before making product or architecture decisions.
- Treat the repository as the source of truth. When documentation and behavior differ, verify the behavior and update the stale documentation in the same change.
- Keep this file concise and applicable to every task. Put language- or path-specific guidance in scoped instruction files only after those paths exist.

## Working Agreement

1. Inspect the smallest relevant code path, nearby tests, and current working tree before editing.
2. State a testable hypothesis for bugs or a concrete acceptance criterion for features.
3. Prefer the smallest coherent change that solves the root cause and follows existing patterns.
4. Run the narrowest relevant check immediately after the first substantive edit, then broaden validation according to risk.
5. Review the final diff for accidental changes, generated files, secrets, and stale documentation.

## Implementation Standards

- Preserve public APIs and established conventions unless the task requires changing them.
- Keep functions and modules focused; avoid speculative abstractions and unrelated refactors.
- Validate input at system boundaries and return actionable errors without exposing secrets.
- Add or update tests for changed behavior. Include failure paths and boundary cases when they are material.
- Explain non-obvious decisions in documentation or an architecture decision record, not with comments that merely narrate code.

## Safety

- Never commit credentials, tokens, private keys, personal data, or local environment files.
- Do not run destructive commands or modify unrelated user changes without explicit approval.
- Treat dependency updates, migrations, authentication, authorization, billing, and data deletion as high-risk changes that require focused validation.

## Project Commands

The project is not scaffolded yet. When a toolchain is selected, add the canonical install, format, lint, type-check, test, build, and run commands to `docs/project-brief.md`. Agents must use those documented commands rather than inventing alternatives.
