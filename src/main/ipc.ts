import { fileURLToPath } from "node:url";
import { ipcMain } from "electron";

import { createLocalFilePort } from "../adapters/filesystem/local-files";
import { cursorHarnessAdapter } from "../adapters/harness/cursor";
import { readCursorFixtureSnapshot } from "../adapters/source/cursor-fixture";
import { applyPlan as applyPlanService } from "../application/apply";
import { createReconciler } from "../application/reconcile";
import type { PackageArtifact, PackageRecord, SourceSnapshot } from "../domain/records";
import type { Binding, Plan } from "../ports";
import {
  IPC_CHANNELS,
  parseApplyPlanRequest,
  parseCreatePlanRequest,
  type ApplyResult,
  type ArtifactSummary,
  type PlanPreview,
  type SourceCatalog,
} from "../shared/ipc";
import type { ApplyResult as DomainApplyResult } from "../application/apply";

type SenderGuard = (event: Electron.IpcMainInvokeEvent) => void;

const fixtureRoot = fileURLToPath(
  new URL("../../fixtures/cursor-pstack/", import.meta.url),
);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected Omni error.";
}

function summarizeArtifact(artifact: PackageArtifact): ArtifactSummary {
  const metadata = artifact.metadata;
  return {
    id: artifact.id,
    kind: artifact.kind,
    relativePath: artifact.relativePath,
    contentHash: artifact.contentHash,
    executionClass: artifact.executionClass,
    ...(metadata?.name ? { name: metadata.name } : {}),
    ...(metadata?.description ? { description: metadata.description } : {}),
    ...(metadata?.invocationPolicy
      ? { invocationPolicy: metadata.invocationPolicy }
      : {}),
    ...(metadata?.providerMetadata
      ? { providerMetadata: metadata.providerMetadata }
      : {}),
  };
}

function summarizePackage(packageRecord: PackageRecord) {
  return {
    id: packageRecord.id,
    externalId: packageRecord.externalId,
    version: packageRecord.version,
    provider: packageRecord.provider,
    sourcePath: packageRecord.sourcePath,
    ...(packageRecord.license ? { license: packageRecord.license } : {}),
    artifacts: packageRecord.artifacts.map(summarizeArtifact),
  };
}

function createCatalog(snapshot: SourceSnapshot, projectRoot: string): SourceCatalog {
  return {
    projectRoot,
    sources: [
      {
        id: snapshot.sourceId,
        provider: snapshot.provider,
        locator: snapshot.locator,
        revision: snapshot.revision,
        defaultProjectRoot: projectRoot,
        packages: snapshot.packages.map(summarizePackage),
      },
    ],
  };
}

function findPackage(snapshot: SourceSnapshot, packageId: string): PackageRecord {
  const packageRecord = snapshot.packages.find((entry) => entry.id === packageId);
  if (!packageRecord) {
    throw new Error(`Package ${packageId} was not found.`);
  }

  return packageRecord;
}

function findArtifact(packageRecord: PackageRecord, artifactId: string): PackageArtifact {
  const artifact = packageRecord.artifacts.find((entry) => entry.id === artifactId);
  if (!artifact) {
    throw new Error(`Artifact ${artifactId} was not found.`);
  }

  return artifact;
}

function getRisk(plan: Plan, artifact: PackageArtifact): PlanPreview["risk"] {
  if (plan.status === "drifted" || plan.status === "blocked") {
    return "high";
  }
  if (artifact.executionClass !== "static" || artifact.kind !== "skill") {
    return "high";
  }
  if (plan.actions.some((action) => action.kind === "update")) {
    return "medium";
  }

  return "low";
}

function toPreview(
  snapshot: SourceSnapshot,
  packageRecord: PackageRecord,
  artifact: PackageArtifact,
  projectRoot: string,
  plan: Plan,
): PlanPreview {
  return {
    sourceId: snapshot.sourceId,
    sourceRevision: snapshot.revision,
    packageId: packageRecord.id,
    packageExternalId: packageRecord.externalId,
    packageVersion: packageRecord.version,
    artifactId: artifact.id,
    artifactKind: artifact.kind,
    ...(artifact.metadata?.name ? { artifactName: artifact.metadata.name } : {}),
    ...(artifact.metadata?.description
      ? { artifactDescription: artifact.metadata.description }
      : {}),
    executionClass: artifact.executionClass,
    compatibility:
      artifact.executionClass === "static" && artifact.kind === "skill"
        ? "compatible"
        : "provider-action",
    risk: getRisk(plan, artifact),
    projectRoot,
    plan,
  };
}

function toApplyResult(result: DomainApplyResult): ApplyResult {
  return {
    status: result.status,
    completed: result.completed,
    failed: result.failed.map(({ action, reason }) => ({
      path: action.path,
      kind: action.kind,
      reason,
    })),
    ...(result.reason ? { reason: result.reason } : {}),
  };
}

async function readSnapshot(): Promise<SourceSnapshot> {
  return readCursorFixtureSnapshot(fixtureRoot);
}

async function handleListSources(): Promise<SourceCatalog> {
  const projectRoot = process.cwd();
  return createCatalog(await readSnapshot(), projectRoot);
}

async function handleCreatePlan(rawRequest: unknown): Promise<PlanPreview> {
  const request = parseCreatePlanRequest(rawRequest);
  const snapshot = await readSnapshot();
  if (request.sourceId !== snapshot.sourceId) {
    throw new Error(`Source ${request.sourceId} was not found.`);
  }

  const packageRecord = findPackage(snapshot, request.packageId);
  const artifact = findArtifact(packageRecord, request.artifactId);
  const binding: Binding = {
    id: [
      snapshot.sourceId,
      packageRecord.id,
      artifact.id,
      request.projectRoot,
    ].join("::"),
    packageId: packageRecord.id,
    artifactId: artifact.id,
    projectRoot: request.projectRoot,
    harnessId: "cursor",
  };
  const filePort = createLocalFilePort(request.projectRoot);
  const plan = await createReconciler({
    filePort,
    harnessAdapter: cursorHarnessAdapter,
  }).plan(snapshot, binding);

  return toPreview(snapshot, packageRecord, artifact, request.projectRoot, plan);
}

async function handleApplyPlan(rawRequest: unknown): Promise<ApplyResult> {
  const request = parseApplyPlanRequest(rawRequest);
  if (request.plan.projectRoot !== request.projectRoot) {
    throw new Error("The plan project root does not match the apply target.");
  }
  const filePort = createLocalFilePort(request.projectRoot);
  const plan: Plan = request.plan.plan;
  const result = await applyPlanService(filePort, plan, request.approved);
  return toApplyResult(result);
}

export function registerIpcHandlers(
  assertTrustedSender: SenderGuard,
): void {
  const guard = <T>(handler: (request: unknown) => Promise<T>) =>
    async (
      event: Electron.IpcMainInvokeEvent,
      request: unknown,
    ): Promise<T> => {
      assertTrustedSender(event);
      try {
        return await handler(request);
      } catch (error: unknown) {
        throw new Error(errorMessage(error));
      }
    };

  ipcMain.handle(IPC_CHANNELS.listSources, guard(async () => handleListSources()));
  ipcMain.handle(IPC_CHANNELS.createPlan, guard(handleCreatePlan));
  ipcMain.handle(IPC_CHANNELS.applyPlan, guard(handleApplyPlan));
}
