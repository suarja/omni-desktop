# Omni Desktop — Core Architecture Contracts

Date: 2026-09-08

Status: draft for architecture review; implementation not started

## Purpose

This document fixes the boundaries and contracts needed for the first deterministic local-first vertical slice.

It does not choose the final Electron toolkit, persistence library, visual component library, or cloud architecture. Those decisions must fit these contracts rather than weaken them.

The contract notation is TypeScript-like pseudocode. It describes ownership and behavior, not implementation-ready code.

## Caller use

The main caller is the desktop application:

1. The user connects one or more sources.
2. The local service refreshes a normalized catalog.
3. The user adds a project.
4. The local service detects supported harnesses and scans existing files.
5. The user creates or changes an assignment.
6. The reconciler produces a readable change plan.
7. The user approves the plan.
8. The executor applies bounded file changes.
9. The verifier records hashes, drift, conflicts, and a reversible operation receipt.

An MCP client may call the same application services, but it must not bypass the plan and approval boundary.

## Architecture boundary

The dependency direction is:

    UI renderer
      → local application API
        → application services
          → domain model and reconciler
            → ports
              → source adapters
              → harness adapters
              → local persistence
              → bounded filesystem executor

### UI renderer

Owns presentation, navigation, user input, loading states, and error display.

The renderer must not:

- read arbitrary project files;
- write to a project or harness directory;
- execute a plugin, hook, shell command, or process;
- resolve marketplace formats;
- decide whether a file is safe to remove.

### Local application API

Owns the narrow IPC or local-service boundary used by the renderer and the MCP server.

It accepts validated commands and returns serializable results. It does not contain provider-specific parsing or UI policy.

### Application services

Own the user-facing workflows:

- connect or refresh a source;
- scan a project;
- list catalog records;
- create or remove an assignment;
- calculate a change plan;
- apply an approved plan;
- verify an operation;
- restore a completed operation.

### Domain model and reconciler

Own the invariants that must be true regardless of UI, storage, or provider:

- provenance is preserved;
- external sources are read-only;
- catalog, desired, and materialized state remain separate;
- plans are deterministic and idempotent;
- locally changed files are never silently overwritten;
- removal is constrained by ownership and expected hashes.

### Adapters and ports

Adapters translate external systems into domain contracts. They do not leak provider-specific structures into the core.

The filesystem executor is the only component allowed to perform bounded writes. It receives a validated plan; it never decides what should be installed.

## Domain identifiers and results

Identifiers are opaque strings created by the local service. Paths and URLs are values, not identifiers.

    type Result<T> =
      | { ok: true; value: T }
      | { ok: false; error: DomainError }

    type DomainError = {
      code: ErrorCode
      operation: string
      message: string
      context: Record<string, string>
      retryable: boolean
      recovery: RecoveryAction[]
    }

Errors crossing the UI or MCP boundary must be safe to display and must not expose secrets or arbitrary file contents.

## Core domain records

### Marketplace source

    type MarketplaceSource = {
      sourceId: SourceId
      kind: "local-directory" | "git-repository"
      trust: "personal" | "external"
      access: "read-only" | "owned"
      locator: string
      revision: string | null
      status: "connected" | "stale" | "unavailable" | "invalid"
      lastRefreshAt: Timestamp | null
    }

Rules:

- External sources are always read-only.
- A source refresh may update Omni’s local cache, but never publishes to or mutates the source.
- A Git source is identified by its locator and resolved revision, not by the current working directory alone.
- Secrets must not be stored in the source record.

### Plugin record

    type PluginRecord = {
      pluginId: PluginId
      sourceId: SourceId
      externalId: string
      name: string
      version: string
      license: LicenseRef
      contentHash: Hash
      manifestHash: Hash
      skills: SkillRecord[]
      artifacts: ArtifactRecord[]
      compatibility: HarnessCompatibility[]
      provenance: Provenance
    }

A plugin remains a first-class unit. Normalization may expose skills and artifacts for selection, but must retain the plugin identity and source relationship.

### Provenance and imported forks

    type Provenance = {
      originSourceId: SourceId
      originExternalId: string
      originVersion: string
      originLicense: LicenseRef
      originContentHash: Hash
      importedAt: Timestamp | null
      forkId: ForkId | null
    }

Importing an external plugin creates a new owned record with preserved provenance. It is a snapshot fork; there is no bidirectional synchronization in P0.

### Skill and artifact

    type SkillRecord = {
      skillId: SkillId
      pluginId: PluginId
      relativePath: RelativePath
      contentHash: Hash
      capabilities: string[]
    }

    type ArtifactRecord = {
      artifactId: ArtifactId
      pluginId: PluginId
      relativePath: RelativePath
      kind: "instruction" | "configuration" | "resource"
      contentHash: Hash
    }

The normalized catalog must not assume that every plugin is only one Markdown file.

### Project and harness

    type Project = {
      projectId: ProjectId
      rootPath: AbsolutePath
      displayName: string
      permission: "granted" | "required" | "denied"
      lastScanAt: Timestamp | null
    }

    type HarnessDescriptor = {
      harnessId: HarnessId
      kind: "codex" | "claude-code" | "opencode"
      version: string | null
      projectId: ProjectId
      status: "detected" | "not-detected" | "partial" | "unsupported"
      recognizedRoots: AbsolutePath[]
      capabilities: string[]
    }

Harness detection is observation. Detection must not create assignments or write files.

### Assignment and desired state

    type Assignment = {
      assignmentId: AssignmentId
      pluginId: PluginId
      projectId: ProjectId
      harnessId: HarnessId
      selectedArtifacts: ArtifactSelection[]
      enabled: boolean
    }

    type DesiredInstallation = {
      assignmentId: AssignmentId
      sourceRevision: string
      pluginVersion: string
      pluginContentHash: Hash
      targetFiles: DesiredFile[]
    }

The desired state is derived from assignments and a specific catalog snapshot. It is not inferred from files already present on disk.

### Materialized state and ownership

    type MaterializedFile = {
      projectId: ProjectId
      harnessId: HarnessId
      absolutePath: AbsolutePath
      managedBy: AssignmentId | null
      expectedHash: Hash | null
      observedHash: Hash | null
      status: "missing" | "current" | "drifted" | "conflict" | "unknown"
      backupRef: BackupRef | null
    }

Omni may remove or replace a file only when:

- the path is inside a recognized harness root;
- the file is owned by the relevant assignment;
- the expected hash still matches the observed file;
- the approved plan includes the operation.

An unmanaged or locally modified file becomes a conflict. It is not silently deleted.

## Adapter contracts

### Marketplace source adapter

    interface MarketplaceSourceAdapter {
      readonly kind: MarketplaceSourceKind

      probe(config: SourceConfig): Promise<Result<SourceProbe>>

      refresh(
        source: MarketplaceSource,
      ): Promise<Result<CatalogSnapshot>>
    }

    type CatalogSnapshot = {
      sourceId: SourceId
      revision: string
      retrievedAt: Timestamp
      plugins: PluginRecord[]
      warnings: CatalogWarning[]
    }

Adapter rules:

- probe is read-only and reports actionable permission or format failures;
- refresh returns a deterministic ordering and a stable revision;
- malformed records are reported as warnings or rejected according to the source contract;
- an adapter cannot expose a write method in the P0 read contract;
- external source failures never erase the last known valid snapshot.

### Harness adapter

    interface HarnessAdapter {
      readonly kind: HarnessKind

      detect(project: Project): Promise<Result<HarnessDescriptor[]>>

      scan(
        project: Project,
        harness: HarnessDescriptor,
      ): Promise<Result<MaterializedFile[]>>

      resolveTargets(
        project: Project,
        harness: HarnessDescriptor,
        plugin: PluginRecord,
      ): Result<DesiredFile[]>
    }

Adapter rules:

- detect and scan are read-only;
- resolveTargets validates compatibility and returns bounded target paths;
- an adapter does not write files or execute hooks;
- each adapter declares the roots and file patterns it may own;
- unsupported plugin/harness combinations return a typed compatibility result.

### Persistence ports

    interface CatalogRepository {
      saveSnapshot(snapshot: CatalogSnapshot): Promise<Result<void>>
      getCurrent(sourceId: SourceId): Promise<Result<CatalogSnapshot | null>>
    }

    interface AssignmentRepository {
      list(projectId: ProjectId): Promise<Result<Assignment[]>>
      save(assignment: Assignment): Promise<Result<void>>
      disable(assignmentId: AssignmentId): Promise<Result<void>>
    }

    interface InstallationRepository {
      list(projectId: ProjectId): Promise<Result<MaterializedFile[]>>
      record(files: MaterializedFile[]): Promise<Result<void>>
    }

    interface OperationRepository {
      save(plan: ChangePlan): Promise<Result<void>>
      record(receipt: OperationReceipt): Promise<Result<void>>
      get(operationId: OperationId): Promise<Result<OperationRecord | null>>
    }

The persistence technology is intentionally behind these ports. SQLite, a structured local file store, or another local implementation must not change domain behavior.

### Filesystem executor

    interface FilesystemExecutor {
      apply(
        plan: ApprovedChangePlan,
      ): Promise<Result<OperationReceipt>>

      restore(
        operationId: OperationId,
      ): Promise<Result<OperationReceipt>>
    }

The executor validates preconditions again immediately before writing. It uses temporary files and atomic replacement where supported, creates backups for destructive changes, and records per-file results.

## Change-plan contract

    type ChangePlan = {
      operationId: OperationId
      generatedAt: Timestamp
      catalogRevisions: Record<SourceId, string>
      observedStateVersion: string
      changes: FileChange[]
      requiresConfirmation: boolean
      expiresAt: Timestamp
    }

    type FileChange = {
      kind: "add" | "modify" | "remove" | "noop" | "conflict"
      projectId: ProjectId
      harnessId: HarnessId
      absolutePath: AbsolutePath
      previousHash: Hash | null
      nextHash: Hash | null
      ownership: "new" | "owned" | "unmanaged" | "drifted"
      backupRequired: boolean
      reason: string
    }

A plan is bound to the catalog revisions and observed-state version used to produce it. Applying a stale plan must fail safely and require a new scan and plan.

## Reconciliation lifecycle

    refresh sources
      → persist catalog snapshots
        → scan projects and harnesses
          → resolve assignments into desired state
            → compare desired and materialized state
              → produce change plan
                → user or approved MCP call confirms
                  → revalidate preconditions
                    → apply bounded changes
                      → verify hashes and ownership
                        → record receipt and pending conflicts

### Idempotency

For the same catalog revisions, assignments, observed-state version, and desired state, a second reconciliation produces no file changes.

### Concurrency

- Multiple source refreshes may run concurrently.
- A project root has one active writer at a time.
- A refresh may not invalidate an already-running write silently.
- If a source, project, or observed file changes during planning, the plan is stale and must be regenerated.

### Partial failure

An operation returns per-file results and an aggregate status:

- succeeded;
- succeeded with conflicts;
- partially applied;
- failed before write;
- restored.

The UI must never display a partial operation as fully successful.

## Module ownership

The first implementation should follow these boundaries:

    src/domain/
      identities, records, errors, invariants

    src/application/
      refresh-catalog, scan-project, resolve-state, plan-changes, apply-plan

    src/ports/
      source-adapter, harness-adapter, repositories, filesystem-executor

    src/adapters/marketplaces/
      local-directory, git-repository

    src/adapters/harnesses/
      codex, claude-code, opencode

    src/infrastructure/
      persistence, filesystem, git, logging

    src/desktop/
      renderer, IPC handlers, view models

The exact framework and folder names can change, but the dependency direction must remain.

## Alternatives considered

### Adapters writing files directly

Rejected. It duplicates safety, ownership, backup, and conflict logic across providers.

### One provider-specific state model

Rejected. It makes cross-harness assignments and deterministic plans impossible to reason about.

### Central reconciler with read-only adapters

Recommended. It gives one place for idempotency, ownership, hashes, previews, rollback, and auditability while keeping providers replaceable.

## Open decisions before implementation

These are intentionally not hidden inside the contract:

1. The canonical plugin manifest format and versioning rules.
2. The exact filesystem locations and ownership markers for each harness.
3. The local persistence implementation.
4. The backup retention policy.
5. The permission request and macOS security-scoped bookmark flow.
6. Whether a plugin may target more than one harness through one manifest or requires explicit compatibility entries.
7. The final license for the repository.

Each decision needs a short record before the first implementation task that depends on it.

## Validation plan

Before implementation begins, the contract must be checked with:

- type sketches reviewed against the approved product design;
- one source fixture containing a valid plugin, a malformed plugin, and an unavailable source;
- one project fixture per supported harness;
- a golden plan for add, update, drift, conflict, remove-one-project, and remove-everywhere;
- idempotency tests that run the same plan twice;
- safety tests proving that unmanaged and locally modified files are not removed;
- a stale-plan test proving that changed hashes force re-planning;
- the repository line-count check.
