# Omni Desktop agent instructions

These instructions apply to the Omni Desktop repository.

## Language

- Use English for source code, identifiers, comments, tests, user-facing developer errors, commit messages, issues, pull requests, and all new documentation.
- Existing bootstrap documents under docs/ were created in French during the initial product workshop. Leave them in French unless a dedicated translation task is explicitly approved.
- Do not mix languages inside a new file.
- Use established domain names such as MCP, Git, Codex, Claude Code, and OpenCode without translating them.

## Source-file size

- A hand-authored source or test file must never exceed 1,000 physical lines.
- The preferred target is 500 lines or fewer.
- Reaching 500 lines is a design signal: extract a focused module before adding more unrelated responsibility.
- More than 1,000 physical lines is a hard failure. Splitting the file is required.
- Generated files, vendored code, build output, coverage output, dependency directories, lockfiles, and machine-produced snapshots are excluded from this cap. They must not be edited manually.
- Run bash scripts/check-line-counts.sh before opening a pull request.

## Modules and functions

- Give every module one clear responsibility.
- Keep public boundaries small and explicit.
- Prefer pure functions for parsing, normalization, resolution, diffing, and validation.
- Keep filesystem, process, network, and UI effects at explicit adapter or service boundaries.
- Name functions with verbs that describe the observable operation.
- Prefer several short functions with explicit inputs and outputs over one orchestration function with hidden branches.
- Keep a function ideally below 50 lines; split it when it approaches 80 lines or owns more than one decision.
- Export only the symbols required by another module.
- Add explicit return types to exported functions and public adapter methods.
- Avoid boolean flag arguments when two named operations make the behavior clearer.

## Comments and documentation

- Comments explain why a constraint, workaround, or safety rule exists; they do not narrate obvious code.
- Do not keep commented-out code.
- Use a tracked issue or decision record for TODOs that survive a change.
- Prefer precise names and small functions over explanatory comments.
- Document public contracts, invariants, ownership rules, and failure behavior.
- Keep examples executable or clearly mark them as pseudocode.

## Errors and safety

- Validate untrusted input at the boundary where it enters the system.
- Return or throw errors with enough context to identify the operation, source, project, and safe recovery path.
- Never silently overwrite a locally modified file.
- Never execute plugin content or hooks automatically.
- Keep destructive operations explicit, previewable, reversible where possible, and auditable.
- Do not hide a partial failure behind a successful aggregate result.

## Tests and review

- Name tests after user-observable behavior.
- Add a focused test for every new invariant, parser, resolver rule, or destructive-operation guard.
- Prefer deterministic fixtures and event-based waits over arbitrary sleeps.
- A change is not complete without its relevant validation evidence.
- Keep pull requests focused and make design-sensitive UI or core changes pass design review before implementation.

## Scope discipline

- Read the relevant product and architecture documents before changing a contract.
- Do not introduce cloud, inference, team, or cross-platform behavior into the local-first P0 without an approved design change.
- Do not modify historical French bootstrap documents as incidental cleanup.
