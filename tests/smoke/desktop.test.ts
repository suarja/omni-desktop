import { afterEach, describe, expect, it, vi } from "vitest";

import { getDesktopApi } from "../../src/renderer/App";
import { IPC_CHANNELS } from "../../src/shared/ipc";
import type {
  ApplyPlanRequest,
  CreatePlanRequest,
  DesktopApi,
} from "../../src/shared/ipc";

const createRequest: CreatePlanRequest = {
  sourceId: "cursor-official",
  packageId: "pstack",
  artifactId: "unslop",
  projectRoot: "/tmp/omni-project",
};

const planPreview = {
  sourceId: "cursor-official",
  sourceRevision: "fixture",
  packageId: "pstack",
  packageExternalId: "pstack",
  packageVersion: "0.1.0",
  artifactId: "unslop",
  artifactKind: "skill",
  artifactName: "unslop",
  artifactDescription: "Remove AI tells from writing.",
  executionClass: "static",
  compatibility: "compatible",
  risk: "low",
  projectRoot: "/tmp/omni-project",
  plan: {
    id: "binding-plan",
    bindingId: "binding-plan",
    status: "ready",
    targetPath: "/tmp/omni-project/.cursor/skills/unslop/SKILL.md",
    actions: [
      {
        kind: "create",
        path: "/tmp/omni-project/.cursor/skills/unslop/SKILL.md",
        content: "---\nname: unslop\n---",
        contentHash: "a".repeat(64),
      },
    ],
  },
} as const;

const catalog = {
  projectRoot: "/tmp/omni-project",
  sources: [
    {
      id: "cursor-official",
      provider: "cursor",
      locator: "/tmp/fixture",
      revision: "fixture",
      defaultProjectRoot: "/tmp/omni-project",
      packages: [
        {
          id: "pstack",
          externalId: "pstack",
          version: "0.1.0",
          provider: "cursor",
          sourcePath: "./pstack",
          artifacts: [
            {
              id: "unslop",
              kind: "skill",
              relativePath: "skills/unslop/SKILL.md",
              contentHash: "a".repeat(64),
              executionClass: "static",
              name: "unslop",
              description: "Remove AI tells from writing.",
            },
          ],
        },
      ],
    },
  ],
} as const;

const applyRequest: ApplyPlanRequest = {
  projectRoot: "/tmp/omni-project",
  plan: planPreview,
  approved: true,
};

describe("desktop preload contract", () => {
  let previousWindow: PropertyDescriptor | undefined;

  afterEach(() => {
    if (previousWindow) {
      Object.defineProperty(globalThis, "window", previousWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }
    previousWindow = undefined;
    vi.resetModules();
    vi.doUnmock("electron");
  });

  it("exposes typed catalogue, preview, and apply operations", async () => {
    const exposeInMainWorld = vi.fn();
    const invoke = vi.fn((channel: string): Promise<unknown> => {
      if (channel === IPC_CHANNELS.listSources) {
        return Promise.resolve(catalog);
      }
      if (channel === IPC_CHANNELS.createPlan) {
        return Promise.resolve(planPreview);
      }

      return Promise.resolve({
        status: "applied",
        completed: [
          {
            path: "/tmp/omni-project/.cursor/skills/unslop/SKILL.md",
            kind: "create",
            contentHash: "a".repeat(64),
            changed: true,
          },
        ],
        failed: [],
      });
    });

    vi.doMock("electron", () => ({
      contextBridge: { exposeInMainWorld },
      ipcRenderer: { invoke },
    }));

    await import("../../src/preload/index");

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorld).toHaveBeenCalledWith("omni", expect.any(Object));

    const api = exposeInMainWorld.mock.calls[0]?.[1] as DesktopApi | undefined;
    expect(api).toBeDefined();
    if (!api) {
      throw new Error("The preload API was not exposed.");
    }

    expect(Object.keys(api).sort()).toEqual(["applyPlan", "createPlan", "listSources"]);

    previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { omni: api },
    });

    await expect(api.listSources()).resolves.toEqual(catalog);
    await expect(api.createPlan(createRequest)).resolves.toEqual(planPreview);
    await expect(api.applyPlan(applyRequest)).resolves.toEqual({
      status: "applied",
      completed: [
        {
          path: "/tmp/omni-project/.cursor/skills/unslop/SKILL.md",
          kind: "create",
          contentHash: "a".repeat(64),
          changed: true,
        },
      ],
      failed: [],
    });
    expect(getDesktopApi()).toBe(api);

    expect(invoke).toHaveBeenNthCalledWith(1, IPC_CHANNELS.listSources);
    expect(invoke).toHaveBeenNthCalledWith(2, IPC_CHANNELS.createPlan, createRequest);
    expect(invoke).toHaveBeenNthCalledWith(3, IPC_CHANNELS.applyPlan, applyRequest);
  });
});
