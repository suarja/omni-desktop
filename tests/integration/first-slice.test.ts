import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { applyPlan } from "../../src/application/apply";
import { createReconciler } from "../../src/application/reconcile";
import { cursorHarnessAdapter } from "../../src/adapters/harness/cursor";
import { createLocalFilePort } from "../../src/adapters/filesystem/local-files";
import { cursorFixtureSourceAdapter } from "../../src/adapters/source/cursor-fixture";
import type { Binding } from "../../src/ports";

const fixtureRoot = fileURLToPath(
  new URL("../../fixtures/cursor-pstack/", import.meta.url),
);

describe("first vertical slice", () => {
  it("projects a fixture skill, detects noop, then reports local drift", async () => {
    const projectRoot = await mkdtemp(join(tmpdir(), "omni-first-slice-"));

    try {
      const snapshot = await cursorFixtureSourceAdapter.readSnapshot(fixtureRoot);
      const skill = snapshot.packages[0]?.artifacts.find(
        (artifact) => artifact.id === "unslop",
      );
      if (!skill) {
        throw new Error("Fixture skill is missing.");
      }

      const filePort = createLocalFilePort(projectRoot);
      const reconciler = createReconciler({
        filePort,
        harnessAdapter: cursorHarnessAdapter,
      });
      const binding: Binding = {
        id: "binding-unslop",
        packageId: "pstack",
        artifactId: "unslop",
        projectRoot,
        harnessId: "cursor",
      };

      const createPlan = await reconciler.plan(snapshot, binding);
      expect(createPlan.status).toBe("ready");
      expect((await applyPlan(filePort, createPlan, true)).status).toBe("applied");

      const installedBinding: Binding = {
        ...binding,
        ownedContentHash: skill.contentHash,
      };
      const noopPlan = await reconciler.plan(snapshot, installedBinding);
      expect(noopPlan.status).toBe("noop");

      const targetPath = noopPlan.targetPath;
      if (!targetPath) {
        throw new Error("Reconciliation target is missing.");
      }
      await writeFile(targetPath, "manual local edit", "utf8");

      const driftPlan = await reconciler.plan(snapshot, installedBinding);
      expect(driftPlan.status).toBe("drifted");
      expect((await applyPlan(filePort, driftPlan, true)).status).toBe("blocked");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
