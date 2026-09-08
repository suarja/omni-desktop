# Omni Desktop documentation

This directory contains the current product, convention, architecture, planning, and
process references for Omni Desktop.

## Current references

- [Product premise](product/README.md)
- [Design direction](design/README.md)
- [Canonical UI reference](design/canonical-ui-reference.md)
- [Harness conventions](conventions/README.md)
- [Architecture](architecture/README.md)
- [Milestones and user stories](planning/2026-09-08-omni-desktop-milestones-and-user-stories.md)
- [First vertical slice plan](planning/2026-09-08-first-vertical-slice-plan.md)
- [Orchestration protocol](process/2026-09-08-orchestration-protocol.md)
- [Research index](research/README.md)

## Documentation rules

Current documentation is concise by design. A canonical Markdown file targets 150
physical lines and must not exceed 200. A documentation directory contains at most five
direct files, including `README.md`.

When a topic needs more space, split it by responsibility and update the nearest index.
Do not append another section to an already-long document. Historical workshop material
lives under `docs/archive/`; it is preserved for context and is not extended.

## Status vocabulary

Each current document should make its status clear when the decision is not final:

- `draft` means open for review;
- `validated` means accepted as the current working contract;
- `historical` means retained for context, not authority.
