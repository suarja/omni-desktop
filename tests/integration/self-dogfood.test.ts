import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { createReconciler } from "../../src/application/reconcile";
import { cursorHarnessAdapter } from "../../src/adapters/harness/cursor";
import { createLocalFilePort } from "../../src/adapters/filesystem/local-files";
import { cursorFixtureSourceAdapter } from "../../src/adapters/source/cursor-fixture";
import type { Binding } from "../../src/ports";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const fixtureRoot = join(repositoryRoot, "fixtures/cursor-pstack");

describe("Omni self-dogfood target", () => {
  it("previews the current repository through the normal project ports without writing", async () => {
    const snapshot = await cursorFixtureSourceAdapter.readSnapshot(fixtureRoot);
    const filePort = createLocalFilePort(repositoryRoot);
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: cursorHarnessAdapter,
    });
    const binding: Binding = {
      id: "self-dogfood-unslop",
      packageId: "pstack",
      artifactId: "unslop",
      projectRoot: repositoryRoot,
      harnessId: "cursor",
    };

    const plan = await reconciler.plan(snapshot, binding);

    expect(plan.status).not.toBe("blocked");
    expect(plan.targetPath).toBe(
      join(repositoryRoot, ".cursor/skills/unslop/SKILL.md"),
    );
  });
});
