# Omni Desktop

Omni Desktop is an open-source, local-first desktop application for a solo developer
managing skills, plugins, marketplaces, projects, and agent harnesses.

The deterministic core catalogs sources, computes desired state, previews changes, and
materializes approved files without silently overwriting local work.

## Status

The repository has a validated Electron bootstrap and a first usable desktop flow:
read-only Cursor fixture ingestion, skill binding, plan preview, bounded local apply, backups,
and drift detection are covered by automated tests. The renderer now exposes the local
catalogue, plugin and skill views, a change-review drawer, and an explicit apply action.
The repository itself is the first read-only dogfood target for the same project ports.

The first target is macOS with Codex, Claude Code, OpenCode, and Cursor skill
compatibility. Cloud sync, hosted inference, and asynchronous automation are later SaaS
extensions.

## Documentation

Start with the [documentation index](docs/README.md):

- [Product premise](docs/product/README.md)
- [Harness conventions](docs/conventions/README.md)
- [Architecture](docs/architecture/README.md)
- [Milestones and user stories](docs/planning/2026-09-08-omni-desktop-milestones-and-user-stories.md)
- [Orchestration protocol](docs/process/2026-09-08-orchestration-protocol.md)
- [Open-source reference notes](docs/research/2026-09-08-open-source-reference-notes.md)

Historical workshop documents are preserved under [docs/archive](docs/archive/).

## Development

This repository is independent from `OmniProject`. The parent repository may reference it
as a submodule while this repository keeps its own history, branches, and pull requests.

Run the structural checks from the repository root:

```bash
bash scripts/check-doc-structure.sh
bash scripts/check-line-counts.sh
```

## License

The final open-source license remains a product and legal decision. It must be selected
before the first release containing reusable code.
