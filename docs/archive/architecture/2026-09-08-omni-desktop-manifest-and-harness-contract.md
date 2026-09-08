# Omni Desktop — Plugin Manifest and Harness Contract

Date: 2026-09-08

Status: draft for architecture review; implementation not started

## Purpose

This document defines the smallest canonical contract between marketplace sources, plugins, skills, harnesses, and the deterministic reconciler.

External marketplaces do not need to adopt this format. Their source adapters normalize their records into this contract. Omni-owned marketplaces and imported forks use the canonical manifest when they are exported.

The contract must make these questions answerable without provider-specific branching in the reconciler:

- What is this plugin?
- Which files and skills does it contain?
- Which harnesses can consume it?
- Where did it come from?
- Which version and content hash are being used?
- Which files may Omni materialize?
- What must happen when a target file is missing, changed, or unmanaged?

## Contract layers

There are three deliberately separate representations:

1. Plugin manifest: portable metadata and artifact declarations.
2. Catalog record: a manifest plus source, revision, provenance, and availability.
3. Harness projection: a resolved set of safe target files for one project and harness.

The manifest never contains absolute user paths. The harness adapter owns target-root discovery and path resolution.

## Canonical plugin manifest

The canonical file name is omni.plugin.json at the root of a plugin package.

The first schema identifier is omni.plugin/v1. A manifest must declare its schema so future readers can reject or migrate it explicitly.

    type PluginManifestV1 = {
      schema: "omni.plugin/v1"
      id: PluginKey
      name: string
      version: Version
      description: string | null
      license: LicenseRef
      artifacts: ArtifactDeclaration[]
      compatibility: CompatibilityDeclaration[]
      capabilities: string[]
    }

    type ArtifactKind =
      | "skill"
      | "rule"
      | "instruction"
      | "agent"
      | "command"
      | "mcp-server"
      | "hook"
      | "configuration"
      | "resource"

    type ExecutionClass =
      | "static"
      | "model-invoked"
      | "tool-using"
      | "executable-hook"
      | "mcp-server"

    type InvocationPolicy =
      | "automatic"
      | "user-only"
      | "provider-defined"

    type PackageFormat =
      | "omni-plugin"
      | "agent-skill"
      | "agent-plugin"
      | "claude-plugin"
      | "codex-plugin"
      | "cursor-plugin"
      | "opencode-plugin"
      | "raw-directory"
      | "npm-package"

    type CatalogFormat =
      | "claude-marketplace"
      | "codex-marketplace"
      | "cursor-marketplace"
      | "opencode-http-skills"
      | "none"

### Identity

Plugin identity is stable within a source namespace:

    type PluginKey = {
      namespace: string
      name: string
    }

The normalized catalog combines the source identity and PluginKey into an internal catalog identity. A source adapter must preserve the external identifier even when it cannot map it to the preferred namespace/name shape.

Identity rules:

- namespace and name use lowercase ASCII letters, numbers, dots, underscores, and hyphens;
- identity is stable across versions;
- changing the identity means publishing a new plugin;
- a fork receives a new owned catalog identity and retains its origin identity as provenance;
- display names are not identity.

### Version

    type Version = {
      value: string
      scheme: "semver" | "opaque" | "unknown"
    }

SemVer is preferred but not required for external content. An opaque or unknown version never replaces the content hash as the integrity key.

The reconciler compares:

1. source revision;
2. plugin version when comparable;
3. manifest hash;
4. content hash.

### License

    type LicenseRef = {
      status: "declared" | "unknown" | "custom"
      spdx: string | null
      expression: string | null
      notice: string | null
    }

Unknown licensing is an explicit state. Omni must not infer or silently assign a permissive license.

### Static artifact declarations

    type ArtifactDeclaration = {
      id: ArtifactId
      kind: ArtifactKind
      executionClass: ExecutionClass
      invocationPolicy: InvocationPolicy
      relativePath: RelativePath
      contentHash: Hash
      materialization: "copy" | "host-managed" | "unsupported"
      optional: boolean
    }

P0 supports static file materialization only. Executable hooks, lifecycle scripts, shell
commands, package installation, and network callbacks are not valid P0 artifact
materializations. `host-managed` records a provider-owned install surface, such as a
native Cursor Plugin cache, without giving Omni permission to mutate it. `unsupported`
keeps the artifact visible while preventing a target plan.

The artifact path is relative to the plugin package root. It must:

- use forward slashes;
- be non-empty;
- not be absolute;
- not contain a parent traversal segment;
- not resolve through a symlink;
- not point to the manifest itself;
- remain stable for the lifetime of a plugin version.

Configuration is a declared artifact kind, not a promise that every harness can consume it. The compatibility declaration must state whether the harness supports that artifact.

### Compatibility declarations

    type CompatibilityDeclaration = {
      harness: "codex" | "claude-code" | "opencode" | "cursor"
      status: "native" | "mapped" | "unsupported" | "unknown"
      artifactIds: ArtifactId[]
      packageFormats: PackageFormat[]
      capabilities: string[]
      notes: string | null
    }

Meaning:

- native: the artifact shape is directly understood by the harness adapter;
- mapped: the adapter can deterministically project it into the harness format;
- unsupported: Omni must not generate an install plan for this pairing;
- unknown: compatibility has not been validated and cannot be assumed.

An assignment to an unsupported or unknown compatibility declaration fails during planning with an actionable result. The planner must not silently omit the artifact.

## Package and catalogue are separate records

An external catalogue entry points to a package. The two records must not be collapsed:

- Claude, Codex, and Cursor use marketplace JSON to list packages.
- OpenCode can use an HTTP `index.json` for skill files or package configuration for
  executable plugins.
- A package can contain many skills, as the Cursor `pstack` package demonstrates.
- A child skill can carry provider-specific activation metadata without becoming a new
  package.

For example, Cursor's `pstack/skills/unslop/SKILL.md` is one static skill artifact inside
the `pstack` Cursor Plugin. Its `disable-model-invocation: true` field normalizes to
`invocationPolicy: "user-only"`, while the original frontmatter remains preserved as
provider metadata. The plugin's agents, hooks, and other executable or tool-using
components remain separate artifacts and are not copied by the P0 reconciler.

## Catalog normalization

External sources may provide different names, layouts, version formats, or metadata. A source adapter produces:

    type CatalogPluginRecord = {
      manifest: PluginManifestV1
      sourceId: SourceId
      provider: "codex" | "claude-code" | "opencode" | "cursor"
      packageFormat: PackageFormat
      catalogFormat: CatalogFormat
      requestedRevision: string | null
      resolvedRevision: string
      externalId: string
      sourcePath: RelativePath | null
      rawManifestHash: Hash
      packageContentHash: Hash
      providerMetadata: Record<string, unknown>
      provenance: Provenance
      availability: "available" | "partial" | "invalid"
      warnings: CatalogWarning[]
    }

Normalization rules:

- preserve the original external identifier;
- preserve both the requested revision and the resolved revision used for the snapshot;
- preserve the provider, package format, and catalogue format;
- preserve unknown fields as warnings or source metadata, not as guessed domain behavior;
- reject path traversal and executable artifact declarations;
- keep malformed records visible as invalid when safe to inspect;
- never create a valid-looking record by inventing a license, version, compatibility, or hash;
- produce deterministic ordering for identical source revisions.

A source adapter may support an external format without writing that format back. Only the canonical manifest is used for Omni-owned exports.

## Provenance and forks

    type Provenance = {
      originSourceId: SourceId
      originExternalId: string
      originProvider: "codex" | "claude-code" | "opencode" | "cursor"
      originPackageFormat: PackageFormat
      originCatalogFormat: CatalogFormat
      originRevision: string
      originVersion: Version
      originLicense: LicenseRef
      originManifestHash: Hash
      originContentHash: Hash
      forkId: ForkId | null
      importedAt: Timestamp | null
    }

Import as a personal fork:

1. reads the source snapshot;
2. copies the selected static artifacts into an owned package;
3. writes a canonical manifest with a new owned identity;
4. stores the complete origin provenance;
5. leaves the source relationship as a visible reference, not an automatic update channel.

A fork can be edited and versioned in a personal Git repository. Changes are detected as local divergence; they are not pushed upstream automatically.

## Harness manifest

A harness manifest describes what an adapter can detect and materialize. It is not the same as a plugin manifest.

    type HarnessManifestV1 = {
      schema: "omni.harness/v1"
      id: "codex" | "claude-code" | "opencode" | "cursor"
      displayName: string
      supportedArtifactKinds: ArtifactKind[]
      supportedScopes: ("project" | "user")[]
      supportedPackageFormats: PackageFormat[]
      capabilities: string[]
    }

The harness adapter additionally owns runtime discovery:

    interface HarnessAdapter {
      readonly manifest: HarnessManifestV1

      detect(project: Project): Promise<Result<HarnessDescriptor[]>>

      scan(
        project: Project,
        harness: HarnessDescriptor,
      ): Promise<Result<ObservedHarnessState>>

      resolveTargets(
        project: Project,
        harness: HarnessDescriptor,
        plugin: CatalogPluginRecord,
        selection: ArtifactSelection,
      ): Result<TargetFile[]>
    }

The adapter must not expose arbitrary filesystem access to the renderer or MCP client.

## Target path and ownership contract

The plugin manifest never declares an absolute target path. A resolved target is produced only for a specific project and detected harness:

    type TargetFile = {
      projectId: ProjectId
      harnessId: HarnessId
      scope: "project" | "user"
      absolutePath: AbsolutePath
      artifactId: ArtifactId
      materialization: "copy"
      ownership: "omni-managed"
    }

Resolution rules:

- the target root must come from the harness adapter;
- the final path must remain inside an approved target root;
- path traversal, absolute paths from the manifest, and symlink escapes are rejected;
- user scope must be explicit; there is no implicit global installation;
- each target is linked to one assignment and one artifact;
- two assignments targeting the same path produce a conflict before writing;
- the adapter must report unsupported scopes instead of falling back silently.

The installation repository records the expected and observed hashes:

    type InstallationRecord = {
      assignmentId: AssignmentId
      projectId: ProjectId
      harnessId: HarnessId
      artifactId: ArtifactId
      absolutePath: AbsolutePath
      expectedHash: Hash
      observedHash: Hash | null
      status: "missing" | "current" | "drifted" | "conflict" | "unknown"
      backupRef: BackupRef | null
    }

Ownership is an Omni record, not an assumption based only on the file name. A missing ownership record means the file is unmanaged.

## Provider-managed state and execution boundary

`InstallationRecord` applies only to files that Omni owns and materializes in an approved
project or user target root. Provider caches, package indexes, plugin activation, and
hook registration are a different state boundary. Omni must observe and plan them, but
the provider adapter owns their lifecycle.

    type ProviderInstallationRecord = {
      assignmentId: AssignmentId
      harnessId: HarnessId
      artifactId: ArtifactId | null
      packageFormat: PackageFormat
      scope: "project" | "user" | "host-managed"
      requestedRevision: string | null
      resolvedRevision: string | null
      providerRef: string | null
      packageState: "not-installed" | "current" | "outdated" | "drifted" | "blocked" | "unknown"
      activationState: "not-applicable" | "inactive" | "active" | "unknown"
    }

    type ProviderAction = {
      kind: "install" | "update" | "uninstall" | "activate" | "deactivate"
      assignmentId: AssignmentId
      harnessId: HarnessId
      artifactId: ArtifactId | null
      requiresApproval: true
      rationale: string
    }

The provider-managed record is an observation, not a second source of truth. The Git
revision or marketplace snapshot remains canonical. A cache reference is opaque provider
state and must not be interpreted as a stable filesystem contract by the renderer.

Provider adapter rules:

- inspect provider caches, indexes, package versions, and activation state read-only;
- expose missing, current, outdated, drifted, blocked, and unknown states;
- produce provider-mediated actions for installation, update, uninstall, activation, or
  deactivation;
- require explicit approval before any provider action that can change installation or
  runtime behavior;
- never execute hooks, plugin JavaScript, shell commands, or MCP servers inside the
  reconciler;
- never delete or rewrite a provider-owned cache directly when a provider installer or
  API exists.

Hooks remain visible artifacts with `executionClass: "executable-hook"`. They can be
included in a catalogue snapshot, compatibility report, and change plan. P0 may report
that a hook needs provider activation, but it must not activate or run it automatically.

## Resolution flow

The application services use the following sequence:

    load catalog snapshot
      → load assignment
        → validate plugin compatibility
          → detect harness and target scope
            → inspect provider-managed state
              → resolve bounded target paths
                → compare file and provider records
                  → emit FileChange and ProviderAction records

The resolver does not read or write files directly. It receives observations and returns a deterministic result.

    interface TargetResolver {
      resolve(
        assignment: Assignment,
        plugin: CatalogPluginRecord,
        project: Project,
        harness: HarnessDescriptor,
        observed: ObservedHarnessState,
      ): Result<DesiredFile[]>
    }

    interface ProviderStateAdapter {
      inspect(
        assignment: Assignment,
        plugin: CatalogPluginRecord,
        harness: HarnessDescriptor,
      ): Promise<Result<ProviderInstallationRecord>>

      plan(
        assignment: Assignment,
        plugin: CatalogPluginRecord,
        harness: HarnessDescriptor,
        observed: ProviderInstallationRecord,
      ): Result<ProviderAction[]>
    }

## Canonical package examples

### Fixture A: local static plugin

    review-plugin/
      omni.plugin.json
      skills/
        review.md
      instructions/
        review-instructions.md

The manifest declares both files as static artifacts, their SHA-256 hashes, and explicit compatibility entries for the harnesses that have been validated.

### Fixture B: external Git plugin

    source: git-repository
    externalId: community/review-plugin
    requestedRevision: v1.4.0
    resolvedRevision: 8f2c...
    version: 1.4.0
    license: declared MIT
    availability: available

The catalog record retains the Git revision and the external identifier. A later remote revision creates a pending update; it does not update installed files automatically.

### Fixture C: personal fork

    forkId: fork_review_001
    ownedId: personal/review-plugin
    origin: community/review-plugin at revision 8f2c...
    localVersion: 1.4.0-personal.1
    divergence: content hash differs

The fork keeps the original license and provenance, uses a new owned identity, and can be versioned in the user’s personal Git repository.

### Fixture D: Cursor multi-plugin repository

    cursor-plugins/
      .cursor-plugin/
        marketplace.json
      pstack/
        .cursor-plugin/
          plugin.json
        skills/
          unslop/
            SKILL.md
        agents/
        assets/

The [Cursor repository catalogue](https://raw.githubusercontent.com/cursor/plugins/main/.cursor-plugin/marketplace.json)
identifies `pstack` by its source path. The
[per-plugin manifest](https://raw.githubusercontent.com/cursor/plugins/main/pstack/.cursor-plugin/plugin.json)
declares the package metadata and component roots. The
[`unslop` skill](https://raw.githubusercontent.com/cursor/plugins/main/pstack/skills/unslop/SKILL.md)
is normalized as a
`skill` artifact with `packageFormat: "cursor-plugin"` and
`invocationPolicy: "user-only"`; its provider-specific frontmatter is retained. The
other pstack components remain visible but are not materialized or executed by P0.

## Non-goals

The manifest and harness contracts record these capabilities but do not define their
provider-specific runtime implementation:

- hook execution semantics and provider-specific hook APIs;
- arbitrary shell commands;
- automatic package installation;
- automatic commits, pushes, merges, or rebases;
- universal support for unknown harnesses;
- structured configuration merging in P0;
- provider-specific commands or APIs for host-managed installation and cache mutation;
- an external marketplace publishing protocol;
- cloud synchronization or recommendation logic.

## Decisions still requiring validation

The contract is intentionally precise about shape while leaving these product decisions open:

1. The exact project and user roots for Codex, Claude Code, OpenCode, and Cursor.
2. Whether structured configuration merging is needed after the copy-only vertical slice.
3. Whether one plugin may expose multiple manifests or compatibility profiles.
4. How Agent Plugins and provider-native plugins should be represented when the host owns
   their installation cache.
5. How a source adapter maps an external package with no manifest.
6. The final public license and notice policy.

Each decision must be recorded before the implementation task that depends on it.

## Validation plan

Before implementing the adapters, prepare:

- a manifest parser fixture with valid and invalid identities;
- path traversal, absolute path, symlink, and self-reference rejection cases;
- unknown license and non-SemVer version cases;
- a plugin with one unsupported harness;
- a source adapter fixture that normalizes an external record without inventing metadata;
- a Cursor marketplace fixture with `.cursor-plugin/marketplace.json`, a native
  `.cursor-plugin/plugin.json`, and the `pstack/unslop` child skill;
- an Agent Plugin fixture with a root `plugin.json` and `skills/` directory;
- provider state fixtures covering a current cache, an outdated cache, a drifted cache,
  and an inactive hook that requires explicit activation;
- a personal fork fixture with preserved provenance and a changed content hash;
- a harness fixture for each supported harness;
- target collision, unmanaged file, drifted file, and stale observation cases;
- a golden change plan for each supported materialization outcome.
