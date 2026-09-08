import { isAbsolute, relative, resolve, sep } from "node:path";

import {
  assertMaterializableArtifact,
  hashContent,
  type PackageArtifact,
  type SourceSnapshot,
} from "../domain/records";
import type {
  Binding,
  FilePort,
  HarnessAdapter,
  Plan,
  Reconciler,
} from "../ports";

type ReconcilerDependencies = Readonly<{
  filePort: FilePort;
  harnessAdapter: HarnessAdapter;
}>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected reconciliation error.";
}

function blockedPlan(binding: Binding, reason: string, targetPath?: string): Plan {
  return {
    id: binding.id,
    bindingId: binding.id,
    actions: [],
    status: "blocked",
    ...(targetPath ? { targetPath } : {}),
    reason,
  };
}

function isOutsideRoot(root: string, target: string): boolean {
  const distance = relative(root, target);
  return (
    distance === ".." ||
    distance.startsWith(`..${sep}`) ||
    distance.startsWith(sep)
  );
}

function findArtifact(
  snapshot: SourceSnapshot,
  binding: Binding,
): PackageArtifact | undefined {
  const packageRecord = snapshot.packages.find((pkg) => pkg.id === binding.packageId);
  return packageRecord?.artifacts.find((artifact) => artifact.id === binding.artifactId);
}

function createAction(
  artifact: PackageArtifact,
  kind: "create" | "update",
  path: string,
  expectedHash?: string,
) {
  return {
    kind,
    path,
    ...(expectedHash ? { expectedHash } : {}),
    content: artifact.content,
    contentHash: artifact.contentHash,
  } as const;
}

export function createReconciler(
  dependencies: ReconcilerDependencies,
): Reconciler {
  return {
    async plan(snapshot, binding) {
      const packageRecord = snapshot.packages.find(
        (pkg) => pkg.id === binding.packageId,
      );
      if (!packageRecord) {
        return blockedPlan(binding, `Package ${binding.packageId} was not found.`);
      }

      const artifact = findArtifact(snapshot, binding);
      if (!artifact) {
        return blockedPlan(binding, `Artifact ${binding.artifactId} was not found.`);
      }

      let materializableArtifact: PackageArtifact;
      try {
        materializableArtifact = assertMaterializableArtifact(artifact);
      } catch (error: unknown) {
        return blockedPlan(binding, errorMessage(error));
      }

      if (hashContent(materializableArtifact.content) !== materializableArtifact.contentHash) {
        return blockedPlan(binding, "Artifact content hash does not match content.");
      }

      if (!isAbsolute(binding.projectRoot)) {
        return blockedPlan(binding, "Project root must be absolute.");
      }

      const projectRoot = resolve(binding.projectRoot);
      let targetPath: string;
      try {
        targetPath = resolve(
          projectRoot,
          dependencies.harnessAdapter.resolveSkillTarget(
            projectRoot,
            materializableArtifact.id,
          ),
        );
      } catch (error: unknown) {
        return blockedPlan(binding, errorMessage(error));
      }
      if (isOutsideRoot(projectRoot, targetPath)) {
        return blockedPlan(
          binding,
          "Resolved target path must remain inside the project root.",
          targetPath,
        );
      }

      const observedContent = await dependencies.filePort.read(targetPath);
      if (observedContent === null) {
        return {
          id: binding.id,
          bindingId: binding.id,
          status: "ready",
          targetPath,
          actions: [createAction(materializableArtifact, "create", targetPath)],
        };
      }

      const observedHash = hashContent(observedContent);
      if (observedHash === materializableArtifact.contentHash) {
        return {
          id: binding.id,
          bindingId: binding.id,
          status: "noop",
          targetPath,
          actions: [],
        };
      }

      if (
        binding.ownedContentHash !== undefined &&
        binding.ownedContentHash !== materializableArtifact.contentHash &&
        observedHash === binding.ownedContentHash
      ) {
        return {
          id: binding.id,
          bindingId: binding.id,
          status: "ready",
          targetPath,
          actions: [
            createAction(
              materializableArtifact,
              "update",
              targetPath,
              observedHash,
            ),
          ],
        };
      }

      return {
        id: binding.id,
        bindingId: binding.id,
        status: "drifted",
        targetPath,
        actions: [],
        reason: "Target contains unexpected local content.",
      };
    },
  };
}
