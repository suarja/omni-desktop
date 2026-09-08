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

## Documentation structure

- New canonical documentation is written in English.
- A canonical Markdown file targets 150 physical lines and must not exceed 200.
- Every documentation directory contains at most five direct files, including its
  `README.md`.
- Split a document by responsibility and update the nearest index when it reaches the
  preferred target. Do not solve the limit by hiding content in generated files.
- Historical workshop material belongs under `docs/archive/`. Preserve it, do not extend
  it during unrelated work, and do not treat it as the current contract.
- Run `bash scripts/check-doc-structure.sh` together with the source line-count check.

## Git workflow

- Commit early and often. Every coherent milestone, vertical slice, or bounded documentation
  tranche must end in a local commit once its relevant checks pass.
- Keep commits small, cohesive, recoverable, and easy to review. Do not leave a completed
  slice uncommitted merely because later corrections may follow.
- Stage only the exact paths belonging to the slice and preserve unrelated work in the
  checkout. Report the commit hash and validation evidence after each checkpoint.
- Keep local commits, pushes, merges, releases, and external mutations as separate actions.
  Push or merge only when explicitly requested; a local commit is the normal completion
  step for an approved slice.

## Visual reference contract

- The canonical visual reference is `docs/design/canonical-ui-reference.md`.
- The reference board export at
  `docs/design/assets/form-boards/Omni Desktop - Planches.dc.html` is authoritative
  for visual direction. Its co-located export support files must remain available when
  rendering or comparing the board.
- Before and after every UI change, compare the affected surface with the reference
  board at the same viewport and theme. Report `PASS`, `FAIL`, or `NOT RUN` with the
  surface, comparison performed, and reason for any exception or missing check.
- Do not treat the reference board as permission to copy its branding, text, code,
  assets, or product flows.

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
