import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { cursorFixtureSourceAdapter } from "../../src/adapters/source/cursor-fixture";
import { cursorHarnessAdapter } from "../../src/adapters/harness/cursor";
import { hashContent, type SourceSnapshot } from "../../src/domain/records";
import { createReconciler } from "../../src/application/reconcile";
import type { Binding, FilePort } from "../../src/ports";

const fixtureRoot = fileURLToPath(
  new URL("../../fixtures/cursor-pstack/", import.meta.url),
);
const projectRoot = "/tmp/omni-reconcile-project";

async function readFixtureSnapshot(): Promise<SourceSnapshot> {
  return cursorFixtureSourceAdapter.readSnapshot(fixtureRoot);
}

function createFilePort(content: string | null): FilePort & { read: ReturnType<typeof vi.fn> } {
  return {
    read: vi.fn(async () => content),
    apply: vi.fn(async (action) => ({
      path: action.path,
      kind: action.kind,
      contentHash: action.contentHash,
      changed: true,
    })),
  };
}

function createBinding(overrides: Partial<Binding> = {}): Binding {
  return {
    id: "binding-unslop",
    packageId: "pstack",
    artifactId: "unslop",
    projectRoot,
    harnessId: "cursor" as const,
    ...overrides,
  };
}

describe("deterministic reconciler", () => {
  it("plans a create when the target is absent", async () => {
    const snapshot = await readFixtureSnapshot();
    const filePort = createFilePort(null);
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: cursorHarnessAdapter,
    });

    const plan = await reconciler.plan(snapshot, createBinding());
    const skill = snapshot.packages[0]?.artifacts.find(
      (artifact) => artifact.id === "unslop",
    );

    expect(plan).toMatchObject({
      id: "binding-unslop",
      bindingId: "binding-unslop",
      status: "ready",
      targetPath: `${projectRoot}/.cursor/skills/unslop/SKILL.md`,
      actions: [
        {
          kind: "create",
          path: `${projectRoot}/.cursor/skills/unslop/SKILL.md`,
          content: skill?.content,
          contentHash: skill?.contentHash,
        },
      ],
    });
  });

  it("returns noop when the materialized content hash matches", async () => {
    const snapshot = await readFixtureSnapshot();
    const skill = snapshot.packages[0]?.artifacts.find(
      (artifact) => artifact.id === "unslop",
    );
    const filePort = createFilePort(skill?.content ?? null);
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: cursorHarnessAdapter,
    });

    const plan = await reconciler.plan(snapshot, createBinding());

    expect(plan.status).toBe("noop");
    expect(plan.actions).toEqual([]);
    expect(plan.targetPath).toBe(
      `${projectRoot}/.cursor/skills/unslop/SKILL.md`,
    );
  });

  it("plans an update when the previous owned hash is still present", async () => {
    const snapshot = await readFixtureSnapshot();
    const skill = snapshot.packages[0]?.artifacts.find(
      (artifact) => artifact.id === "unslop",
    );
    if (!skill) {
      throw new Error("Fixture skill is missing.");
    }
    const previousContent = "---\nname: unslop\ndescription: Previous.\n---\n";
    const updatedSnapshot: SourceSnapshot = {
      ...snapshot,
      packages: [
        {
          ...snapshot.packages[0],
          artifacts: [
            {
              ...skill,
              content: "---\nname: unslop\ndescription: Updated.\n---\n",
              contentHash: hashContent(
                "---\nname: unslop\ndescription: Updated.\n---\n",
              ),
            },
            ...snapshot.packages[0].artifacts.filter(
              (artifact) => artifact.id !== "unslop",
            ),
          ],
        },
      ],
    };
    const filePort = createFilePort(previousContent);
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: cursorHarnessAdapter,
    });

    const plan = await reconciler.plan(
      updatedSnapshot,
      createBinding({
        ownedContentHash: hashContent(previousContent),
      }),
    );

    expect(plan.status).toBe("ready");
    expect(plan.actions[0]).toMatchObject({
      kind: "update",
      expectedHash: hashContent(previousContent),
      contentHash: updatedSnapshot.packages[0]?.artifacts[0]?.contentHash,
    });
  });

  it("reports drift instead of overwriting an unexpected local edit", async () => {
    const snapshot = await readFixtureSnapshot();
    const filePort = createFilePort("manually edited skill");
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: cursorHarnessAdapter,
    });

    const plan = await reconciler.plan(
      snapshot,
      createBinding({ ownedContentHash: hashContent("previous content") }),
    );

    expect(plan.status).toBe("drifted");
    expect(plan.actions).toEqual([]);
    expect(plan.reason).toContain("unexpected local content");
  });

  it("blocks executable artifacts before reading a target", async () => {
    const snapshot = await readFixtureSnapshot();
    const filePort = createFilePort(null);
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: cursorHarnessAdapter,
    });

    const plan = await reconciler.plan(snapshot, {
      ...createBinding(),
      artifactId: "example.sh",
    });

    expect(plan.status).toBe("blocked");
    expect(plan.reason).toContain("Executable artifacts");
    expect(filePort.read).not.toHaveBeenCalled();
  });

  it("blocks a harness target outside the project root", async () => {
    const snapshot = await readFixtureSnapshot();
    const filePort = createFilePort(null);
    const reconciler = createReconciler({
      filePort,
      harnessAdapter: {
        resolveSkillTarget: () => resolve(projectRoot, "../outside/SKILL.md"),
      },
    });

    const plan = await reconciler.plan(snapshot, createBinding());

    expect(plan.status).toBe("blocked");
    expect(plan.reason).toContain("project root");
    expect(filePort.read).not.toHaveBeenCalled();
  });
});
