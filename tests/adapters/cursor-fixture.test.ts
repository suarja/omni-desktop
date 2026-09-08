import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { readCursorFixtureSnapshot } from "../../src/adapters/source/cursor-fixture";

const fixtureRoot = fileURLToPath(
  new URL("../../fixtures/cursor-pstack/", import.meta.url),
);

describe("Cursor fixture source adapter", () => {
  it("normalizes the marketplace, plugin, skill, and hook without executing them", async () => {
    const snapshot = await readCursorFixtureSnapshot(fixtureRoot);
    const repeatedSnapshot = await readCursorFixtureSnapshot(fixtureRoot);
    const packageRecord = snapshot.packages[0];
    const skill = packageRecord?.artifacts.find((artifact) => artifact.id === "unslop");
    const hook = packageRecord?.artifacts.find((artifact) => artifact.id === "example.sh");

    expect(snapshot).toMatchObject({
      sourceId: "cursor-official",
      provider: "cursor",
      locator: resolve(fixtureRoot),
      revision: "fixture",
    });
    expect(packageRecord).toMatchObject({
      id: "pstack",
      externalId: "pstack",
      provider: "cursor",
      version: "0.1.0",
      manifestPath: "pstack/.cursor-plugin/plugin.json",
      sourcePath: "./pstack",
      requestedRevision: "fixture",
      resolvedRevision: "fixture",
      license: "MIT",
    });
    expect(skill).toMatchObject({
      id: "unslop",
      kind: "skill",
      relativePath: "skills/unslop/SKILL.md",
      executionClass: "static",
      metadata: {
        name: "unslop",
        description: "Keep generated code concise, clear, and maintainable.",
        providerMetadata: {
          "disable-model-invocation": true,
        },
        invocationPolicy: "user-only",
      },
    });
    expect(skill?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(hook).toMatchObject({
      id: "example.sh",
      kind: "hook",
      relativePath: "hooks/example.sh",
      executionClass: "executable",
    });
    expect(repeatedSnapshot).toEqual(snapshot);
  });

  it("rejects a plugin source that escapes the selected root through a symlink", async () => {
    const sourceRoot = await mkdtemp(join(tmpdir(), "omni-cursor-source-"));
    const outsideRoot = await mkdtemp(join(tmpdir(), "omni-cursor-outside-"));

    try {
      await mkdir(join(sourceRoot, ".cursor-plugin"));
      await writeFile(
        join(sourceRoot, ".cursor-plugin", "marketplace.json"),
        JSON.stringify({
          name: "cursor-fixture",
          plugins: [{ name: "outside", source: "./plugin" }],
        }),
      );
      await mkdir(join(outsideRoot, "plugin"));
      await symlink(join(outsideRoot, "plugin"), join(sourceRoot, "plugin"), "dir");

      await expect(readCursorFixtureSnapshot(sourceRoot)).rejects.toThrow(
        "Fixture paths must stay inside the source root.",
      );
    } finally {
      await Promise.all([
        rm(sourceRoot, { recursive: true, force: true }),
        rm(outsideRoot, { recursive: true, force: true }),
      ]);
    }
  });
});
