# Omni Desktop — Harness Convention Comparison

Date: 2026-09-08

Status: research baseline for architecture review

## Executive conclusion

The ecosystem is converging at two different levels.

First, Agent Skills provide a common content package: a directory with a `SKILL.md`
entrypoint, YAML frontmatter, Markdown instructions, and optional scripts, references,
and assets. Second, Agent Plugins now provide an emerging portable package format for
skills and MCP servers. Hosts still add provider-specific manifests, catalogues, scopes,
and runtime components around those standards.

Packaging and distribution remain provider-specific:

- Claude Code uses `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`.
- Codex uses `.codex-plugin/plugin.json` and `.agents/plugins/marketplace.json`.
- OpenCode separates skills from executable plugins. Skills can come from local directories or HTTP catalogs; plugins are local JavaScript/TypeScript modules or packages loaded from configuration.
- Cursor supports the portable Agent Plugins and Agent Skills formats, plus a native
  Cursor Plugin format. Its official multi-plugin repository uses
  `.cursor-plugin/marketplace.json`.

This supports a three-layer Omni model:

1. A provider-neutral domain model and normalized catalog.
2. Provider-specific source and harness adapters.
3. Provider-specific projections and materialized files.

`omni.plugin.json` should therefore remain an Omni-owned normalized manifest. It must not
be presented as a universal replacement for Agent Plugins or the Claude, Codex, Cursor,
or OpenCode manifests.

## Scope and source policy

This comparison covers:

- Agent Skills file conventions.
- Claude Code skills, plugins, marketplaces, scopes, and updates.
- Codex skills, plugins, marketplaces, scopes, and Git-backed updates.
- OpenCode skills, HTTP catalogs, plugins, precedence, and updates.
- Cursor Agent Skills, plugins, marketplaces, and rules.
- GitHub Copilot and VS Code as additional evidence for cross-harness skill portability.

The sources are first-party documentation or canonical specifications consulted on
2026-09-08:

- [Agent Skills specification](https://agentskills.io/specification)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Claude Code plugins](https://code.claude.com/docs/en/plugins)
- [Claude Code plugin marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
- [Claude Code plugin reference](https://code.claude.com/docs/en/plugins-reference)
- [OpenAI/Codex build skills](https://developers.openai.com/codex/skills)
- [OpenAI/Codex AGENTS.md discovery](https://developers.openai.com/codex/guides/agents-md)
- [OpenAI/Codex build skills for plugins](https://developers.openai.com/plugins/build/skills)
- [OpenAI/Codex package plugins](https://developers.openai.com/plugins/build/plugins)
- [OpenAI/Codex workspace plugin management](https://learn.chatgpt.com/docs/enterprise/plugin-management)
- [OpenCode skills](https://opencode.ai/v2/docs/skills)
- [OpenCode plugins](https://opencode.ai/v2/docs/plugins)
- [Agent Plugins specification](https://agent-plugins.org/specification)
- [Cursor Agent Skills](https://cursor.com/docs/skills)
- [Cursor plugins](https://cursor.com/docs/plugins)
- [Cursor plugin reference](https://cursor.com/docs/reference/plugins)
- [Cursor multi-plugin marketplace](https://raw.githubusercontent.com/cursor/plugins/main/.cursor-plugin/marketplace.json)
- [Cursor pstack plugin manifest](https://raw.githubusercontent.com/cursor/plugins/main/pstack/.cursor-plugin/plugin.json)
- [Cursor pstack README](https://raw.githubusercontent.com/cursor/plugins/main/pstack/README.md)
- [Cursor pstack `unslop` skill](https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/unslop/SKILL.md)
- [Cursor pstack license](https://raw.githubusercontent.com/cursor/plugins/main/pstack/LICENSE)
- [Cursor rules](https://docs.cursor.com/context/rules)
- [GitHub Copilot agent skills](https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills)
- [VS Code Agent Skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)

## 1. The common denominator: Agent Skills

The portable skill profile is:

```text
skill-name/
├── SKILL.md              required entrypoint
├── scripts/              optional executable helpers
├── references/           optional supporting documentation
├── assets/               optional templates and resources
└── ...                   optional additional files
```

The specification defines YAML frontmatter followed by Markdown. The portable fields are:

| Field | Status | Portable rule |
| --- | --- | --- |
| `name` | Required | Lowercase letters, numbers, and hyphens; 1–64 characters; normally matches the directory name. |
| `description` | Required | Non-empty; up to 1024 characters; describe what the skill does and when to use it. |
| `license` | Optional | License name or reference to a bundled license file. |
| `compatibility` | Optional | Environment requirements, such as product, system packages, network, or runtime assumptions. |
| `metadata` | Optional | String-to-string extension map. |
| `allowed-tools` | Optional / experimental | Pre-approved tools, interpreted differently by hosts. |

The important portability boundary is that supporting files are relative to the skill directory. The body should explain when to load references or run scripts; hosts do not all load supporting files in the same way.

### Provider differences inside the common skill format

- Claude Code treats `description` as recommended rather than strictly required and adds invocation controls such as `disable-model-invocation`, `user-invocable`, `context`, `allowed-tools`, dynamic context injection, and argument substitution.
- Codex requires `name` and `description`, progressively loads skills, scans repository `.agents/skills` directories, and can use `agents/openai.yaml` for appearance and tool dependencies in packaged skills.
- OpenCode V2 derives the runtime skill ID from the path, not from frontmatter. It currently does not enforce the standard name regex or length limits, and its own `slash` and `opencode/autoinvoke` metadata controls are provider-specific.
- GitHub Copilot and VS Code accept the common `SKILL.md` structure and several compatible locations. GitHub's `gh skill` flow also writes source, ref, and tree-SHA provenance metadata for updates.

Omni should validate a strict portable profile at authoring time, while preserving the original provider metadata separately. A provider adapter may accept a looser external skill without silently claiming it is portable.

### Agent Plugins as the package layer

The Agent Plugins specification defines a portable plugin directory with a root
`plugin.json`, a `skills/` directory, and an optional `mcp.json`. The specification
currently standardizes skills and MCP servers. Provider-specific behavior belongs in
client extensions rather than in the portable manifest.

This is a useful boundary for Omni:

- `SKILL.md` is the portable skill payload.
- `plugin.json` is the portable package identity and metadata.
- `marketplace.json`, HTTP indexes, Git repositories, npm packages, and hosted registries
  are catalogue or source mechanisms, not interchangeable package formats.
- Native provider manifests extend or wrap the portable package and must remain visible
  after normalization.

Cursor explicitly supports both the portable Agent Plugin format and its own Cursor
Plugin format. This makes Cursor useful evidence for an adapter architecture, but it
does not make `.cursor-plugin/plugin.json` interchangeable with a root `plugin.json`.

## 2. Provider comparison

### 2.1 Claude Code

#### Skills

Documented locations include:

- Personal: `~/.claude/skills/<skill-name>/SKILL.md`
- Project: `.claude/skills/<skill-name>/SKILL.md`
- Plugin: `<plugin>/skills/<skill-name>/SKILL.md`
- Enterprise: managed settings

Claude Code also discovers nested project skills and can apply different scope and precedence rules. Plugin skills are namespaced as `plugin-name:skill-name`, which reduces collisions with standalone skills.

#### Plugin package

The plugin root may contain:

```text
plugin/
├── .claude-plugin/
│   └── plugin.json
├── skills/
├── commands/
├── agents/
├── hooks/
└── .mcp.json
```

Only `plugin.json` belongs in `.claude-plugin/`. Component directories remain at the plugin root. Hooks, MCP servers, agents, and commands are executable or behavior-bearing capabilities, not static skill files.

#### Marketplace

The catalog is normally `.claude-plugin/marketplace.json` and contains a `plugins` array. Each entry has a public `name` and a `source`. Sources can be GitHub repositories, arbitrary Git repositories, local paths, remote marketplace URLs, npm packages, or archives. The source can be pinned to a branch, tag, or commit.

Claude distinguishes the marketplace source from the plugin source. They can be separate repositories and can be pinned independently. The marketplace can also provide metadata, component paths, `strict` behavior, default enablement, tags, and trust or recommendation signals.

#### Versioning and installation

- A declared plugin version can pin update detection.
- If a Git plugin omits a version, Claude can use the resolved commit SHA as the effective version.
- Marketplace plugins are copied into `~/.claude/plugins/cache` rather than used directly in place, with path traversal and external-file restrictions.
- Marketplace installation can be scoped to user, project, or local settings.
- Refresh is explicit through marketplace update commands, with auto-update behavior depending on configuration and version resolution.

### 2.2 Codex

#### Skills and repository instructions

Codex loads `AGENTS.md` instructions through a global-to-local chain. Skill discovery is separate and scans `.agents/skills` from the current directory upward to the repository root.

Documented skill scopes include:

- Repository: `.agents/skills` in the current directory and ancestors.
- User: `~/.agents/skills`.
- Admin: `/etc/codex/skills`.
- System: bundled skills.

This is a meaningful distinction for Omni: `AGENTS.md` is persistent repository instruction context, while `SKILL.md` is an on-demand workflow package. They should not be collapsed into one artifact type.

#### Plugin package

Codex uses a required `.codex-plugin/plugin.json` manifest. A package can contain:

```text
plugin/
├── .codex-plugin/
│   └── plugin.json
├── skills/
├── hooks/
├── .app.json
├── .mcp.json
└── assets/
```

The manifest points to bundled components using relative paths such as `"skills": "./skills/"`. It can also describe publisher metadata, legal links, interface metadata, MCP mappings, hooks, and assets.

#### Marketplace

Codex documents repo-scoped and personal marketplaces:

- Repository: `$REPO_ROOT/.agents/plugins/marketplace.json`
- Personal: `~/.agents/plugins/marketplace.json`

The catalog is a JSON object with `name` and `plugins`. Entries can use local paths, GitHub repository roots, or Git subdirectories. Git sources can carry a branch, tag, or commit SHA. Codex also supports `codex plugin marketplace add`, `list`, `upgrade`, and `remove`.

Codex's marketplace entries are close enough to Claude's catalog shape to share a conceptual adapter, but not close enough to share a parser without a format discriminator. The path, source object, policies, and manifest filename differ.

#### Workspace synchronization

OpenAI documents importing a GitHub marketplace into a workspace with an optional branch, tag, or commit. New marketplaces receive automatic daily synchronization, and an administrator can request an immediate sync. Workspace import preserves installation and authentication policies separately from GitHub marketplace content.

### 2.3 OpenCode

#### Skills

OpenCode V2 discovers skills from:

- Project: `.opencode/skills`
- Project compatibility: `.claude/skills`, `.agents/skills`
- Global: `~/.config/opencode/skills`
- Global compatibility: `~/.claude/skills`, `~/.agents/skills`
- Explicit local or HTTP sources from `opencode.json` or `opencode.jsonc`

OpenCode accepts both `SKILL.md` directories and Markdown files. The directory form is recommended because it gives a skill a private base directory for supporting files.

OpenCode can also consume an HTTP skill catalog with an `index.json`. The catalog lists a skill name, version, and safe relative file paths. The host downloads the files from the catalog base URL and refreshes cached content when the catalog version changes.

#### Identity and precedence

OpenCode V2 derives a skill ID from the path. IDs are exact and case-sensitive, and later sources override earlier definitions. The frontmatter `name` is a display label rather than the authoritative identity. This is materially different from the Agent Skills recommendation that `name` matches the directory name.

#### Plugins

OpenCode plugins are JavaScript or TypeScript modules:

- Project: `.opencode/plugins/`
- Global: `~/.config/opencode/plugins/`
- Package plugins: npm or Git-compatible package entries in `opencode.json(c)` or via the plugin CLI

OpenCode's official model is a package and configuration ecosystem, not the same marketplace-file model used by Claude Code or Codex. Plugins can be versioned, scoped, loaded from local paths, or installed from npm/Git. Unpinned package plugins can be checked for updates; exact versions and full commit hashes remain pinned.

#### Consequence for Omni

OpenCode has two distinct adapters:

1. An Agent Skill adapter for `.opencode/skills`, compatible `.claude/skills`, `.agents/skills`, local directories, and HTTP catalogs.
2. An executable plugin adapter for `.opencode/plugins` and configured packages.

They must not be represented as the same installation kind. An OpenCode plugin can execute hooks and tools, while an OpenCode skill is primarily an on-demand instruction bundle.

### 2.4 Cursor

#### Agent Skills

Cursor now documents [Agent Skills](https://cursor.com/docs/skills) as a first-class,
portable customization format. It discovers `SKILL.md` directories from project
`.agents/skills` and `.cursor/skills`, user
`~/.agents/skills` and `~/.cursor/skills`, and compatibility locations such as
`.claude/skills` and `.codex/skills`. It walks nested skill directories and supports
scripts, references, and assets.

Cursor requires `name` and `description` in the skill frontmatter and adds an optional
`paths` field for file-aware surfacing. A nested skill can also inherit scope from its
directory. This means Cursor belongs in Omni's portable Agent Skills lane. The adapter
must still preserve Cursor's precedence and path-scoping behavior.

#### Plugin formats

The [Cursor plugin documentation](https://cursor.com/docs/plugins) describes two package
formats:

1. A portable Agent Plugin with a root `plugin.json`, skills, and optional MCP servers.
2. A native Cursor Plugin with `.cursor-plugin/plugin.json`, which can also contain
   rules, agents, commands, hooks, variables, and other Cursor-specific components.

The distinction matters. The [`cursor/plugins` repository](https://github.com/cursor/plugins)
uses the native Cursor Plugin format. Its root
[`.cursor-plugin/marketplace.json`](https://raw.githubusercontent.com/cursor/plugins/main/.cursor-plugin/marketplace.json)
is a machine-readable catalogue of plugin entries. The `pstack` entry points to the
`pstack/` directory. That directory has its own
[`plugin.json`](https://raw.githubusercontent.com/cursor/plugins/main/pstack/.cursor-plugin/plugin.json),
which declares metadata, version, license, logo, category, tags, and explicit `skills`
and `agents` paths.

The root README is a human-facing index. Omni must use the marketplace manifest and the
per-plugin manifest as the source records, not scrape the README as a catalogue.

#### The pstack and unslop fixture

The Cursor `pstack` package is a real example of a plugin containing a family of skills,
agents, assets, documentation, and automation material. It demonstrates that a
marketplace item is often a bundle, while the individual `SKILL.md` files remain the
unit that an agent discovers and invokes.

The [`pstack/skills/unslop/SKILL.md`](https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/unslop/SKILL.md)
file uses the portable `name` and `description` frontmatter and adds
`disable-model-invocation: true`. That field changes activation
policy: the skill remains available for explicit invocation but is not selected
automatically by the model. It is provider metadata, not a different skill format.

The package README says these are the skills used to ship at Cursor, and the plugin
manifest names Lauren Tan as the author. That is useful provenance and a quality signal
for the fixture, but it does not create a new technical convention. The technical lesson
is the separation between a plugin package, its child skills, and provider-specific
invocation metadata.

#### Rules remain separate

Cursor rules remain a distinct artifact family. Project rules use `.cursor/rules/*.mdc`
with fields such as `description`, `globs`, and `alwaysApply`. A rule with file globs or
always-on behavior does not map losslessly to a skill. Omni should model it as a `rule`
artifact and preserve its trigger semantics rather than silently converting it to
`SKILL.md`.

#### Marketplace and refresh behavior

Cursor distributes official plugins from Git repositories through its hosted Marketplace
and supports imported team marketplaces. Imported repositories can be refreshed manually
or automatically, subject to Cursor's hosting and GitHub integration rules. This is
another example of catalogue refresh being separate from local project materialization.
Omni should record the requested ref and resolved revision and should not treat a moving
marketplace branch as an implicit local write permission.

### 2.5 GitHub Copilot and VS Code

These products provide useful evidence that Agent Skills are becoming a cross-agent content standard. Their documented project locations include `.github/skills`, `.claude/skills`, and `.agents/skills`; personal locations include `~/.copilot/skills` and `~/.agents/skills`.

GitHub's `gh skill` flow adds provenance metadata such as source repository, ref, and tree SHA, supports pinning, and can update installed skills from that metadata. This is a strong precedent for Omni's source revision, resolved revision, and provenance records.

## 3. Comparison matrix

| Dimension | Claude Code | Codex | OpenCode V2 | Cursor | Omni implication |
| --- | --- | --- | --- | --- | --- |
| Common skill payload | `SKILL.md` directory | `SKILL.md` directory | `SKILL.md` or Markdown | `SKILL.md` directory, plus separate MDC rules | Use Agent Skills as the portable skill profile; model Cursor rules separately. |
| Project skill path | `.claude/skills` | `.agents/skills` | `.opencode/skills`, `.claude/skills`, `.agents/skills` | `.cursor/skills`, `.agents/skills`, compatibility paths | Target paths belong to adapters, never to the normalized plugin manifest. |
| Personal skill path | `~/.claude/skills` | `~/.agents/skills` | `~/.config/opencode/skills`, compatibility paths | `~/.cursor/skills`, `~/.agents/skills`, compatibility paths | Scope must be explicit and provider-specific. |
| Plugin manifest | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` | No equivalent bundle manifest for local plugins | Root `plugin.json` for Agent Plugins or `.cursor-plugin/plugin.json` for Cursor Plugins | Preserve package format and external manifest identity. |
| Marketplace/catalog | `.claude-plugin/marketplace.json` | `.agents/plugins/marketplace.json` | HTTP `index.json` for skills; npm/Git config for plugins | `.cursor-plugin/marketplace.json` for multi-plugin repositories plus hosted/team marketplace | Source adapters need catalog format and provider metadata. |
| Plugin contents | Skills, agents, commands, hooks, MCP, LSP | Skills, hooks, MCP, apps, assets | JS/TS hooks, tools, integrations | Agent Plugins: skills/MCP; Cursor Plugins: skills, rules, agents, commands, hooks, variables | Separate static, tool-using, and executable artifacts. |
| Identity | Plugin name plus namespaced skill name | Plugin name and path-derived skill name | Path-derived skill ID; frontmatter name is display-only in V2 | Plugin name plus skill folder; rules retain path and MDC identity | Store provider identity and normalized identity separately. |
| Version/update key | Version, commit SHA, archive/npm version | Version, ref, commit SHA, workspace sync | Package version/hash; HTTP catalog entry version | Plugin version, Git revision, hosted marketplace refresh | Compare resolved revision, version when comparable, manifest hash, and content hash. |
| Precedence | Enterprise/personal/project/plugin rules | Global/project instruction chain; skills can coexist by name | Later source wins by skill ID | User/project/nested skill scope, compatibility paths, plugin installation | Record source order and conflict policy in the adapter. |
| Runtime risk | Hooks/MCP/agents can execute | Hooks/MCP/connectors can act | Plugins execute JS/TS and can run commands | Skills can invoke tools; plugins can add hooks, agents, commands, and MCP | Default Omni P0 to static artifacts; require explicit capability and trust for execution. |

## 4. What the existing Omni work got right

The existing Omni model already established the right high-level separation:

- `Artifact`, `Source`, `Binding`, and `HarnessTarget` are the correct domain nouns.
- Marketplace catalogs are distribution and discovery sources, not runtime authorities.
- Provenance and Git revision pinning belong in source and binding state.
- Harness-specific behavior belongs behind adapters.
- Discovery should be read-only and user-visible before any write-back.

The existing repository discovery design is still too early in four places:

1. It explicitly left Codex and OpenCode conventions undefined.
2. It models a source mainly as a GitHub repository and `marketplace.json`, which is insufficient for OpenCode HTTP skill catalogs, npm plugins, and personal local directories.
3. It uses `projectPluginBindings` as a loose string reference and does not yet represent package format, scope, capability risk, or precedence.
4. The initial research treated Cursor as a rules-only system and missed its Agent Skills support, Agent Plugins support, native Cursor Plugin format, and `.cursor-plugin/marketplace.json` catalogue.

The current `dev` implementation also still writes skills to a hard-coded `.claude/skills/...` path. A historical Codex/Claude abstraction exists on another branch, but it is not the current `dev` implementation and it does not cover OpenCode or Cursor.

## 5. Recommended Omni Desktop model

### 5.1 Keep the normalized manifest, but narrow its role

Keep `omni.plugin.json` as an Omni-owned normalized representation for:

- imported catalog records;
- personal forks;
- deterministic reconciliation;
- Omni-owned exports when a provider projection is generated.

Do not require external marketplaces to adopt it. An import should retain:

- provider;
- source format;
- external manifest path;
- external identifier;
- source locator;
- requested revision/ref;
- resolved revision;
- raw manifest hash;
- content hash;
- license state;
- provenance;
- compatibility warnings.

### 5.2 Add explicit format and capability dimensions

The catalog model should distinguish at least:

```text
artifactKind:
  skill | rule | instruction | agent | command | mcp-server | hook | resource

packageFormat:
  agent-skill | agent-plugin | claude-plugin | codex-plugin | cursor-plugin |
  opencode-plugin | raw-directory | npm-package

catalogFormat:
  claude-marketplace | codex-marketplace | cursor-marketplace |
  opencode-http-skills | none

executionClass:
  static | model-invoked | tool-using | executable-hook | mcp-server

invocationPolicy:
  automatic | user-only | provider-defined
```

This prevents a safe Markdown skill from being treated as equivalent to a plugin that
can execute commands or install packages. It also preserves the difference between a
package format and the catalogue that points to that package. The Cursor `unslop` fixture
normalizes to `artifactKind: skill`, `packageFormat: cursor-plugin`, and
`invocationPolicy: user-only` because of `disable-model-invocation: true`.

### 5.3 Make the adapter contract richer

Each adapter should own six provider-specific concerns:

1. Catalogue discovery: marketplace manifests, HTTP indexes, hosted registries, and
   their refresh rules.
2. Package discovery: paths, manifests, component directories, and source types.
3. Normalization: external IDs, metadata, files, capabilities, and invocation policy.
4. Target resolution: project/user scope and safe target roots.
5. Identity and update: version, ref, commit, catalogue version, and content hash.
6. Runtime policy: precedence, enablement, permissions, and executable behavior.

The reconciler should only consume normalized records and resolved target plans.

### 5.4 Recommended V1 scope

To keep complexity bounded, V1 should separate portable skill materialization from
native package management:

1. **Portable Agent Skills lane** — import, validate, preview, and materialize static
   `SKILL.md` packages for Claude Code, Codex, Cursor, and OpenCode compatibility paths.
2. **Read-only catalogue lane** — index Claude, Codex, and Cursor marketplace manifests,
   preserving the source format, plugin manifest, requested ref, resolved revision, and
   child artifacts. Support OpenCode HTTP skill indexes as a separate source type.
3. **Deterministic project/user bindings** — write only approved static skill files into
   adapter-owned target roots. Keep native plugin installation, host-managed caches,
   executable components, and marketplace publication outside P0.

"Outside P0" means outside direct unattended mutation, not outside the Omni model. P0
must inspect provider-managed package state, cache references, versions, revisions, and
activation status. It should show the resulting provider action in the change plan. A
later provider adapter may execute an approved install, update, uninstall, activation,
or deactivation through the provider's own installer or API.

Cursor is therefore part of the first-class V1 adapter set for skills and read-only
plugin/catalogue inspection. Cursor rules remain a separate artifact type. A rule-to-skill
conversion is not lossless because MDC trigger semantics do not map directly to Agent
Skills invocation semantics.

The Cursor `pstack` fixture should be the first package fixture because it tests the
important shape: one marketplace entry, one native plugin manifest, many child skills,
provider-specific invocation metadata, and non-skill components that P0 must not execute.

### 5.5 P0 safety boundary

P0 should permit:

- reading local directories and Git revisions;
- parsing manifests and skill frontmatter;
- validating relative paths and hashes;
- building a catalog snapshot;
- inspecting provider-owned caches and activation state without writing to them;
- classifying hooks and executable components and producing explicit provider actions;
- producing a deterministic change plan;
- materializing static files after approval.

P0 should not automatically:

- execute hooks, plugin JavaScript, shell commands, or MCP servers;
- mutate provider-owned caches or activation state directly;
- install npm packages or dependencies;
- run provider package managers;
- publish or push to an external marketplace;
- silently follow a moving branch without recording the resolved revision;
- convert a Cursor rule into a skill without an explicit user decision.

## 6. Decisions to carry into the architecture review

1. Adopt a strict portable Agent Skills profile for Omni-authored skills.
2. Recognize Agent Plugins as a portable package layer for skills and MCP, while
   preserving provider-specific extensions.
3. Preserve provider-specific manifests and source formats rather than flattening them.
4. Add `provider`, `packageFormat`, `catalogFormat`, `artifactKind`, `executionClass`,
   `invocationPolicy`, `scope`, `requestedRevision`, `resolvedRevision`, and
   `updatePolicy` to source/catalog state.
5. Treat Claude, Codex, and Cursor marketplace JSON as separate adapters with a shared
   conceptual model.
6. Treat OpenCode skills and OpenCode plugins as separate adapters.
7. Treat Cursor rules as a distinct artifact type while treating Cursor Agent Skills as
   part of the portable lane.
8. Keep Git as the revision and transport layer; use content hashes and ownership records
   for local reconciliation.
9. Represent provider-managed installation state separately from Omni-owned target files.
10. Keep external sources read-only in P0 and require an explicit plan approval before
   local materialization.

## Limitations

This is a documentation comparison, not a compatibility test run. It does not yet prove that every provider version accepts every cross-provider path or manifest field. The next validation step should create small fixture repositories and run the real provider validators/loaders against them, especially for:

- Claude marketplace source variants and plugin cache behavior;
- Codex repo/personal marketplace resolution;
- Cursor Agent Plugin versus Cursor Plugin manifests and multi-plugin marketplace refresh;
- the Cursor `pstack` package and `unslop` invocation policy;
- OpenCode V2 path-derived IDs, HTTP catalog caching, and precedence;
- the practical portability of one strict `SKILL.md` across Claude, Codex, OpenCode, Copilot, and VS Code.
