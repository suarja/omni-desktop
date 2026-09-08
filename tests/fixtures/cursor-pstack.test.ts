import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const fixtureRoot = fileURLToPath(
  new URL("../../fixtures/cursor-pstack/", import.meta.url),
);

async function readJson(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
}

describe("Cursor pstack fixture", () => {
  it("contains a marketplace entry for the pstack plugin", async () => {
    const marketplace = await readJson(
      `${fixtureRoot}/.cursor-plugin/marketplace.json`,
    );
    const plugins = marketplace.plugins as Array<Record<string, unknown>>;

    expect(plugins).toContainEqual({
      name: "pstack",
      source: "./pstack",
    });
  });

  it("contains a plugin manifest and a skill with required frontmatter", async () => {
    const manifest = await readJson(
      `${fixtureRoot}/pstack/.cursor-plugin/plugin.json`,
    );
    const skill = await readFile(
      `${fixtureRoot}/pstack/skills/unslop/SKILL.md`,
      "utf8",
    );

    expect(manifest).toMatchObject({
      name: "pstack",
      version: "0.1.0",
    });
    expect(skill).toContain("name: unslop");
    expect(skill).toContain("description:");
  });

  it("keeps the executable fixture non-executable until a provider action is approved", async () => {
    const hookPath = `${fixtureRoot}/pstack/hooks/example.sh`;
    const hook = await readFile(hookPath, "utf8");
    const hookStats = await stat(hookPath);

    expect(hook).toContain("#!/usr/bin/env bash");
    expect(hookStats.mode & 0o111).toBe(0);
  });
});
