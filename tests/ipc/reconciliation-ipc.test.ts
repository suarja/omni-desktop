import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  IPC_CHANNELS,
  parseApplyPlanRequest,
  parseApplyResult,
  parsePlanPreview,
  parseSourceCatalog,
  type ApplyPlanRequest,
} from "../../src/shared/ipc";

type Handler = (event: unknown, request?: unknown) => Promise<unknown>;

const handlers = new Map<string, Handler>();

async function loadHandlers(
  assertTrustedSender: (event: unknown) => void = () => undefined,
): Promise<typeof import("../../src/main/ipc")> {
  handlers.clear();
  vi.doMock("electron", () => ({
    ipcMain: {
      handle: vi.fn((channel: string, handler: Handler) => {
        handlers.set(channel, handler);
      }),
    },
  }));

  const module = await import("../../src/main/ipc");
  module.registerIpcHandlers(assertTrustedSender);
  return module;
}

function handlerFor(channel: string): Handler {
  const handler = handlers.get(channel);
  if (!handler) {
    throw new Error(`No IPC handler registered for ${channel}.`);
  }
  return handler;
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("electron");
  handlers.clear();
});

describe("typed IPC parsers", () => {
  it("accepts a complete preview and preserves nested plan data", () => {
    const preview = {
      sourceId: "cursor-official",
      sourceRevision: "fixture",
      packageId: "pstack",
      packageExternalId: "pstack",
      packageVersion: "0.1.0",
      artifactId: "unslop",
      artifactKind: "skill",
      artifactName: "unslop",
      executionClass: "static",
      compatibility: "compatible",
      risk: "low",
      projectRoot: "/tmp/project",
      plan: {
        id: "plan-id",
        bindingId: "binding-id",
        status: "ready",
        targetPath: "/tmp/project/.cursor/skills/unslop/SKILL.md",
        actions: [
          {
            kind: "create",
            path: "/tmp/project/.cursor/skills/unslop/SKILL.md",
            content: "content",
            contentHash: "hash",
          },
        ],
      },
    };

    expect(parsePlanPreview(preview)).toEqual(preview);
  });

  it("rejects malformed response shapes at the preload boundary", () => {
    expect(() => parseSourceCatalog({ projectRoot: "/tmp/project" })).toThrow(
      "source catalog response is invalid",
    );
    expect(() =>
      parsePlanPreview({
        sourceId: "cursor-official",
        sourceRevision: "fixture",
        packageId: "pstack",
        packageExternalId: "pstack",
        packageVersion: "0.1.0",
        artifactId: "unslop",
        artifactKind: "skill",
        executionClass: "static",
        compatibility: "unknown",
        risk: "low",
        projectRoot: "/tmp/project",
        plan: { actions: [] },
      }),
    ).toThrow("Compatibility is invalid");
    expect(() => parseApplyResult({ status: "applied" })).toThrow(
      "apply response is invalid",
    );
  });

  it("keeps explicit approval false in a valid apply request", () => {
    const request: ApplyPlanRequest = {
      projectRoot: "/tmp/project",
      plan: {
        sourceId: "cursor-official",
        sourceRevision: "fixture",
        packageId: "pstack",
        packageExternalId: "pstack",
        packageVersion: "0.1.0",
        artifactId: "unslop",
        artifactKind: "skill",
        executionClass: "static",
        compatibility: "compatible",
        risk: "low",
        projectRoot: "/tmp/project",
        plan: {
          id: "plan-id",
          bindingId: "binding-id",
          status: "noop",
          actions: [],
        },
      },
      approved: false,
    };

    expect(parseApplyPlanRequest(request)).toEqual(request);
  });
});

describe("main IPC reconciliation flow", () => {
  it("lists the fixture, previews a create, applies it, and returns noop", async () => {
    await loadHandlers();
    const projectRoot = await mkdtemp(join(tmpdir(), "omni-ipc-"));

    try {
      const catalog = parseSourceCatalog(
        await handlerFor(IPC_CHANNELS.listSources)({}),
      );
      const source = catalog.sources[0];
      const packageRecord = source?.packages[0];
      const artifact = packageRecord?.artifacts.find(
        (entry) => entry.id === "unslop",
      );

      expect(source?.provider).toBe("cursor");
      expect(packageRecord?.externalId).toBe("pstack");
      expect(artifact?.executionClass).toBe("static");
      if (!source || !packageRecord || !artifact) {
        throw new Error("Fixture catalog is missing the expected skill.");
      }

      const request = {
        sourceId: source.id,
        packageId: packageRecord.id,
        artifactId: artifact.id,
        projectRoot,
      };
      const preview = parsePlanPreview(
        await handlerFor(IPC_CHANNELS.createPlan)({}, request),
      );

      expect(preview.plan.status).toBe("ready");
      expect(preview.plan.actions).toHaveLength(1);
      expect(preview.plan.actions[0]?.kind).toBe("create");
      expect(preview.plan.targetPath).toBe(
        join(projectRoot, ".cursor/skills/unslop/SKILL.md"),
      );

      const applyRequest: ApplyPlanRequest = {
        projectRoot,
        plan: preview,
        approved: true,
      };
      const applied = parseApplyResult(
        await handlerFor(IPC_CHANNELS.applyPlan)({}, applyRequest),
      );
      expect(applied.status).toBe("applied");
      expect(applied.completed).toHaveLength(1);
      await expect(
        readFile(join(projectRoot, ".cursor/skills/unslop/SKILL.md"), "utf8"),
      ).resolves.toContain("name: unslop");

      const secondPreview = parsePlanPreview(
        await handlerFor(IPC_CHANNELS.createPlan)({}, request),
      );
      expect(secondPreview.plan.status).toBe("noop");
      const secondResult = parseApplyResult(
        await handlerFor(IPC_CHANNELS.applyPlan)({}, {
          projectRoot,
          plan: secondPreview,
          approved: true,
        }),
      );
      expect(secondResult.status).toBe("noop");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  it("runs the sender guard before executing a handler", async () => {
    const guard = vi.fn(() => {
      throw new Error("untrusted");
    });
    await loadHandlers(guard);

    await expect(
      handlerFor(IPC_CHANNELS.listSources)({ senderFrame: { url: "evil:" } }),
    ).rejects.toThrow("untrusted");
    expect(guard).toHaveBeenCalledTimes(1);
  });
});
