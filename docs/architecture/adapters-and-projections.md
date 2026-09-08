# Adapters and projections

Status: draft architecture baseline

## Ports

The domain core depends on narrow ports, not provider SDKs:

- `SourceAdapter` discovers and normalizes a catalogue snapshot;
- `PackageAdapter` reads a package manifest and child artifacts;
- `HarnessAdapter` detects a harness and resolves safe target roots;
- `ProviderStateAdapter` observes provider installations and plans provider actions;
- `GitPort` reads refs, status, and diffs;
- `FilePort` reads, hashes, backs up, and applies bounded file changes;
- `OperationStore` persists plans, results, and recovery metadata.

## Normalized package shape

```text
Plugin
├── provider
├── packageFormat
├── catalogueFormat
├── externalId
├── requestedRevision
├── resolvedRevision
├── license
└── artifacts[]
    ├── kind
    ├── relativePath
    ├── contentHash
    ├── executionClass
    └── invocationPolicy
```

`omni.plugin.json` is Omni's normalized export. An external provider does not need to
adopt it. The adapter retains the original manifest path and provider metadata.

## Adapter responsibilities

An adapter owns provider-specific discovery, parsing, identity, precedence, scopes,
update keys, and runtime policy. It must not leak arbitrary filesystem or process access
to the renderer or MCP client.

The reconciler consumes normalized records and emits bounded plans. It does not branch on
`.claude-plugin`, `.codex-plugin`, `.cursor-plugin`, or `.opencode` paths itself.

## Projection rules

- A portable `SKILL.md` can project to validated provider skill roots.
- A provider rule remains a `rule` artifact unless the user explicitly requests a
  conversion.
- A plugin bundle remains a bundle in the catalogue even when one child skill is bound.
- Hooks, MCP servers, agents, and commands are capability-bearing artifacts.
- Host-managed plugin installation produces a provider action, not a file target.

## Compatibility status

Each artifact-to-harness pairing is `native`, `mapped`, `unsupported`, or `unknown`.
Unknown is not treated as supported. A plan fails with an actionable explanation instead
of silently dropping an artifact.

## Validation fixture

Use the Cursor `pstack` shape as the first multi-artifact fixture: a catalogue entry,
native plugin manifest, several skills, an agent, and executable or automation material.
The fixture should prove that Omni can inspect the full package while materializing only
the approved static artifact.
