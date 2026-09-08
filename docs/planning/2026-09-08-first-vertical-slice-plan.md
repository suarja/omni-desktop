# Local Skill Projection and Safe Apply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Prove that Omni can read one local package, bind one static skill to one project and harness, preview a deterministic plan, apply it with approval, and detect drift on the next run.

**Architecture:** Keep the Electron renderer thin. The application service calls a normalized domain core through narrow ports; adapters own filesystem, process, and provider conventions. The first provider adapter is Cursor because the documented `pstack` fixture exercises a marketplace, plugin manifest, child skill, and unsupported executable material without requiring network access.

**Tech Stack:** Electron, TypeScript strict mode, React renderer, Vite, Vitest, Node `fs/promises`, and Node `crypto`. Use `pnpm`; do not add a cloud service, database, LLM, or provider SDK in this slice.

---

## Scope and caller journey

The user opens Omni, selects a local catalogue, chooses one static skill and a local Cursor
project, then reviews the resolved revision, target path, compatibility, and file diff. After
approval Omni writes only the owned skill; the next run is `noop`, while a local edit is `drifted`.

Dogfood rule: this repository is Omni's first read/preview target; self-application remains explicit and opt-in. Out of scope: remote marketplaces, Git writes, background refresh, MCP, provider caches, hooks, agents, commands, executable plugins, recommendations, accounts, and subscriptions.

## Contract sketch

```ts
type PackageArtifact = {
  id: string; kind: "skill" | "hook" | "agent" | "command" | "mcp-server";
  relativePath: string; content: string; contentHash: string; executionClass: "static" | "executable";
};
type PackageRecord = { id: string; externalId: string; version: string; provider: "cursor"; sourcePath: string; artifacts: PackageArtifact[] };
type SourceSnapshot = { sourceId: string; provider: "cursor"; revision: string; packages: PackageRecord[] };
type Binding = { id: string; packageId: string; artifactId: string; projectRoot: string; harnessId: "cursor"; ownedContentHash?: string };
type FileAction = { kind: "create" | "update"; path: string; expectedHash?: string; content: string; contentHash: string };
type Plan = { id: string; bindingId: string; actions: FileAction[]; status: "ready" | "drifted" | "blocked" | "noop"; targetPath?: string; reason?: string };
```

Required port signatures:

```ts
interface SourceAdapter { readSnapshot(sourceRoot: string): Promise<SourceSnapshot>; }
interface HarnessAdapter { resolveSkillTarget(projectRoot: string, skillId: string): string; }
interface FilePort { read(path: string): Promise<string | null>; apply(action: FileAction): Promise<{ path: string; changed: boolean; backupPath?: string }>; }
interface Reconciler { plan(snapshot: SourceSnapshot, binding: Binding): Promise<Plan>; }
```

Invariants: source and materialized state stay separate; only `static` skills can produce a
file action; paths remain under the selected project root; an expected hash mismatch blocks
apply; applying an identical plan produces `noop`; no adapter executes discovered content.

## Module map

- `src/domain/records.ts` and `src/application/reconcile.ts` — records and pure plan decisions.
- `src/ports/index.ts` — narrow interfaces used by the application layer and adapters.
- `src/shared/ipc.ts` — shared channel names and runtime-validated preload responses.
- `src/adapters/source/cursor-fixture.ts` — read-only Cursor marketplace/plugin normalization.
- `src/adapters/harness/cursor.ts` and `src/adapters/filesystem/local-files.ts` — projection and bounded writes.
- `src/main/`, `src/preload/`, and `src/renderer/` — typed IPC boundary and thin UI.
- `scripts/check-preload-bundle.sh` — verifies the sandbox-compatible CommonJS preload output.
- `tests/` — domain, adapter, reconciliation, IPC, and renderer behavior fixtures.

## Tasks

### Task 1: Bootstrap the desktop shell

**Files:** `.gitignore`, `package.json`, `tsconfig.json`, `vite.config.ts`, `src/main/index.ts`, `src/preload/index.ts`, `src/shared/ipc.ts`, `src/renderer/App.tsx`, `src/renderer/index.html`, `src/renderer/renderer.tsx`, `scripts/check-preload-bundle.sh`, `tests/smoke/desktop.test.ts`.

- [x] Create the Electron/Vite/React TypeScript shell with `pnpm dev`, `pnpm test`,
  `pnpm typecheck`, and `pnpm check:size` scripts.
- [x] Configure context isolation and expose only `listSources`, `createPlan`, and
  `applyPlan` placeholders through preload; renderer code must not import `fs` or `child_process`.
- [x] Run `pnpm typecheck && pnpm test -- tests/smoke/desktop.test.ts`; expect a bootable
  window and a passing renderer smoke test.

### Task 2: Add the normalized fixture and domain records

**Files:** `fixtures/cursor-pstack/`, `src/domain/records.ts`, `tests/domain/records.test.ts`, `tests/fixtures/cursor-pstack.test.ts`.

- [x] Add a minimal local copy of the Cursor `pstack` shape: marketplace entry, plugin
  manifest, `skills/unslop/SKILL.md`, and one ignored executable artifact fixture.
- [x] Implement strict record constructors and SHA-256 hashing; reject traversal paths,
  missing skill metadata, unsupported artifact kinds, and non-static apply candidates.
- [x] Test normalized identity, preserved provider metadata, hash stability, and rejection
  of `../outside` paths. Run the two focused Vitest files and expect all tests to pass.

### Task 3: Implement the read-only Cursor adapters

**Files:** `src/ports/index.ts`, `src/adapters/source/cursor-fixture.ts`, `src/adapters/harness/cursor.ts`, `tests/adapters/cursor-fixture.test.ts`, `tests/adapters/cursor-harness.test.ts`.

- [x] Parse the fixture without executing scripts or hooks; return one `SourceSnapshot` with
  package and child-artifact provenance intact.
- [x] Resolve a skill only to `<projectRoot>/.cursor/skills/<skillId>/SKILL.md`; reject an
  absolute root mismatch and every non-static artifact.
- [x] Test the pstack/unslop fixture, deterministic target resolution, and unsupported
  executable reporting. No network or real user-directory access is allowed.

### Task 4: Build the deterministic reconciler

**Files:** `src/application/reconcile.ts`, `tests/application/reconcile.test.ts`.

- [x] Implement `plan(snapshot, binding)` using observed target content supplied by `FilePort`.
- [x] Return `create` when absent, `update` when the owned hash matches the previous version,
  `noop` when hashes match, and `drifted` when an existing local hash differs unexpectedly.
- [x] Test create, update, noop, drift, path-boundary rejection, and executable blocking.
  The planner remains deterministic apart from its injected file and harness ports.

### Task 5: Apply bounded file actions with recovery

**Files:** `src/adapters/filesystem/local-files.ts`, `src/application/apply.ts`, `tests/adapters/local-files.test.ts`, `tests/application/apply.test.ts`.

- [x] Implement a project-root guard, expected-hash check, backup before update, atomic
  temporary-file replacement, and an operation result listing completed and failed actions.
- [x] Require an explicit `approved: true` argument in the application service; reject drift
  before any write. Never delete or modify provider caches.
- [x] Test successful create/update, repeated apply, drift refusal, traversal refusal, and
  recovery metadata. Run focused tests plus `pnpm typecheck`.

### Task 6: Wire the thin UI and IPC flow

**Files:** `src/main/ipc.ts`, `src/preload/index.ts`, `src/renderer/App.tsx`, `src/renderer/components/PlanSummary.tsx`, `tests/ipc/reconciliation-ipc.test.ts`.

- [x] Replace placeholders with typed calls for source load, plan preview, and approved apply.
- [x] Render source revision, skill provenance, target path, action kind, compatibility,
  risk, and status; make `drifted`, `blocked`, and `noop` visually distinct.
- [x] Keep approval explicit and show provider actions separately from file actions. Test the
  renderer-visible result for preview, approval, success, and drift refusal.

### Task 7: Verify the slice and document the boundary

**Files:** `README.md`, `tests/integration/first-slice.test.ts`, `tests/integration/self-dogfood.test.ts`, and `docs/design/README.md` or `docs/architecture/README.md` only if the implementation changes a validated assumption.

- [x] Run `pnpm test`, `pnpm typecheck`, `pnpm check:size`, `bash scripts/check-doc-structure.sh`,
  and `git diff --check` from the child repository.
- [x] Verify the journey in the integration tests: fixture → Cursor project → preview →
  approved apply → second-run noop → local edit → drift refusal.
- [x] Record exact results and any changed assumption; do not commit or push without a
  separate explicit approval.

## Alternatives and decisions

Cursor is selected first because the existing `pstack` fixture already exercises the hardest
catalogue shape. Codex is the next adapter because it is a primary daily harness, but its
separate `AGENTS.md` and plugin lifecycle should not be conflated with skill projection.
Implementing all harnesses first is rejected because it would hide adapter mistakes behind
cross-provider branching before the deterministic core is proven.

## Design and implementation gates

The renderer task starts only after the Overview, Marketplace detail, Plugin detail, Project
state, and Change plan boards are accepted. Core and adapter tests may be implemented against
the documented contracts before visual polish. A fresh subagent should take each task, with
the parent reviewing the diff and tests before the next task.
