# Contributing to Omni Desktop

Thank you for contributing. Omni Desktop is a local-first open-source application for managing skills, plugins, marketplaces, projects, and agent harnesses.

## Before you start

Read:

- README.md;
- the product design under docs/product/;
- the milestones and user stories under docs/planning/;
- the orchestration protocol under docs/process/;
- AGENTS.md.

Open an issue before starting a substantial feature or core behavior change. A small bug fix or documentation correction can go directly to a focused pull request.

## Language policy

All new repository content is written in English:

- source code and identifiers;
- comments and tests;
- error messages intended for developers;
- documentation and examples;
- commit messages, issues, pull requests, and review comments.

The initial product-workshop documents under docs/ are historical French documents. They are intentionally preserved. Do not translate them as part of an unrelated change.

## File-size policy

The physical line count includes code, blank lines, and comments.

- Preferred target: 500 lines or fewer per hand-authored source or test file.
- Warning zone: 501 to 1,000 lines. Refactor before adding unrelated responsibility.
- Hard failure: more than 1,000 lines.

The cap excludes generated files, vendored code, dependency directories, build and coverage output, lockfiles, and machine-generated snapshots. Those files are still subject to the repository's generation and review rules.

Run the repository check from the root:

    bash scripts/check-line-counts.sh

## Documentation policy

Current Markdown documentation targets 150 physical lines and has a hard limit of 200.
Each documentation directory may contain at most five direct files, including
`README.md`. Split by topic when a page grows beyond the target and update the directory
index. Historical workshop documents are preserved under `docs/archive/` and are not
extended as part of unrelated work.

Run the documentation check from the repository root:

    bash scripts/check-doc-structure.sh

Do not solve a line-cap failure by hiding source code in generated output, weakening the check, or adding a broad exception. Split the responsibility into focused modules and tests.

## Visual changes

Read [the canonical UI reference](docs/design/canonical-ui-reference.md) before
changing a UI surface. The board export at
`docs/design/assets/form-boards/Omni Desktop - Planches.dc.html` is authoritative for
visual direction. Compare the affected implementation with it before and after the
change at the same viewport and theme. In the change report, mark the visual check
`PASS`, `FAIL`, or `NOT RUN`, name the surfaces checked, and include the reason when it
did not run or when an approved exception explains a difference.

## Naming and structure

- Use English, descriptive names.
- Use camelCase for variables and functions.
- Use PascalCase for types, classes, and UI components.
- Use UPPER_SNAKE_CASE only for true constants.
- Use kebab-case for directories and non-component filenames unless the framework requires another convention.
- Prefer one module per responsibility.
- Keep domain logic independent from filesystem and UI adapters.
- Keep provider- and harness-specific behavior behind explicit adapters.

## Functions and comments

- A function should do one coherent thing.
- Prefer explicit inputs, outputs, and return types at public boundaries.
- Keep functions short; split functions that approach 80 lines or combine unrelated decisions.
- Avoid hidden I/O, mutable global state, and boolean flags that change several modes.
- Comments should explain intent, invariants, safety constraints, or non-obvious trade-offs.
- Do not use comments to preserve dead code.
- A TODO must include enough context to become a tracked issue or decision.

## Safety and product invariants

- External marketplaces are read-only by default.
- Imports preserve source, version, license, and content hash provenance.
- The reconciler must distinguish catalog state, desired state, and materialized disk state.
- A locally modified file is a drift or conflict; it is never silently overwritten.
- Plugin scripts and hooks are never executed automatically.
- Any removal affecting more than one project must show its scope and consequences before confirmation.

## Pull requests

Keep each pull request focused on one milestone slice or one documented concern.

The pull request description should include:

- the user story or issue;
- the design decision it implements;
- files and boundaries changed;
- validation commands and their PASS, FAIL, NOT RUN, or BLOCKED result;
- screenshots or recordings for visual changes;
- known limitations and follow-up work.

Do not combine a product redesign, broad cleanup, dependency upgrade, and unrelated refactor in one pull request.
