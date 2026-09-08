# Omni Desktop product premise

Status: validated workshop baseline

Omni Desktop is an open-source, local-first desktop application for a solo developer who
uses several agent harnesses across several projects. It manages marketplaces, plugins,
skills, project bindings, provenance, drift, and deterministic changes.

## Core promise

Omni gives one personal view of what is available, what is desired, and what is actually
installed. It does not replace external marketplaces. It reads them, preserves their
identity and license information, and projects approved static artifacts into projects.

## Open SaaS model

The open-source desktop product provides local catalogue management, project detection,
provider adapters, plans, safe materialization, Git inspection, and local history.

The later SaaS layer can add multi-machine sync, background jobs, codebase analysis,
recommendations, hosted inference, and remote MCP. The local deterministic workflow must
remain useful without an account or subscription.

Omni Desktop is its first dogfood project: the same ports must read and preview this
repository before any self-application is enabled.

## V1 boundaries

- solo macOS developer;
- Codex, Claude Code, OpenCode, and Cursor skill compatibility;
- external and personal catalogue sources;
- static skill materialization after approval;
- read-only provider cache and executable-artifact inspection;
- no silent overwrite, direct cache deletion, hook execution, or automatic Git writes.

## Product states

```text
catalogue → desired bindings → materialized/provider state
```

Every user-facing change must identify its source, revision, scope, files, provider
actions, conflicts, and recovery path.
