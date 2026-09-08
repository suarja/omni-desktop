import { describe, expect, it } from "vitest";

import {
  assertMaterializableArtifact,
  createArtifact,
  createPackageRecord,
  createSourceSnapshot,
  hashContent,
} from "../../src/domain/records";

const skillInput = {
  id: "unslop",
  kind: "skill",
  relativePath: "skills/unslop/SKILL.md",
  content: "---\nname: unslop\ndescription: Keep code clean.\n---\n",
  executionClass: "static",
  metadata: {
    name: "unslop",
    description: "Keep code clean.",
    providerMetadata: {
      "disable-model-invocation": true,
    },
    invocationPolicy: "user-only",
  },
};
const packageIdentity = {
  externalId: "pstack",
  version: "0.1.0",
};

describe("domain records", () => {
  it("hashes identical content deterministically with SHA-256", () => {
    expect(hashContent("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("creates a static skill with normalized metadata and content hash", () => {
    const artifact = createArtifact(skillInput);

    expect(artifact).toMatchObject({
      id: "unslop",
      kind: "skill",
      relativePath: "skills/unslop/SKILL.md",
      executionClass: "static",
      metadata: skillInput.metadata,
    });
    expect(artifact.contentHash).toBe(hashContent(skillInput.content));
    expect(assertMaterializableArtifact(artifact)).toBe(artifact);
  });

  it("rejects a skill without name or description metadata", () => {
    expect(() =>
      createArtifact({
        ...skillInput,
        metadata: { name: "unslop" },
      }),
    ).toThrow("Skill artifacts require a name and description.");
  });

  it.each(["/absolute/SKILL.md", "../outside/SKILL.md", "skills/../outside.md"])(
    "rejects unsafe artifact path %s",
    (relativePath) => {
      expect(() => createArtifact({ ...skillInput, relativePath })).toThrow(
        "Artifact paths must stay relative to the package root.",
      );
    },
  );

  it("rejects unsupported artifact kinds", () => {
    expect(() =>
      createArtifact({
        ...skillInput,
        kind: "unknown-kind",
      }),
    ).toThrow("Unsupported artifact kind: unknown-kind.");
  });

  it("rejects a supplied hash that does not match content", () => {
    expect(() =>
      createArtifact({
        ...skillInput,
        contentHash: "0".repeat(64),
      }),
    ).toThrow("Artifact content hash does not match content.");
  });

  it("rejects a supplied hash with an invalid SHA-256 format", () => {
    expect(() =>
      createArtifact({
        ...skillInput,
        contentHash: "not-a-hash",
      }),
    ).toThrow("Artifact content hash must be a lowercase SHA-256 hash.");
  });

  it("blocks executable artifacts from materialization", () => {
    const hook = createArtifact({
      id: "check",
      kind: "hook",
      relativePath: "hooks/check.sh",
      content: "#!/usr/bin/env bash\nexit 0\n",
      executionClass: "executable",
    });

    expect(() => assertMaterializableArtifact(hook)).toThrow(
      "Executable artifacts require an approved provider action.",
    );
  });

  it("blocks non-skill artifacts from materialization even when static", () => {
    const resource = createArtifact({
      id: "guide",
      kind: "resource",
      relativePath: "references/guide.md",
      content: "Reference material.",
      executionClass: "static",
    });

    expect(() => assertMaterializableArtifact(resource)).toThrow(
      "Only static skill artifacts can be materialized in P0.",
    );
  });

  it.each(["/absolute/source", "../outside", "pstack/../outside"])(
    "rejects unsafe package source path %s",
    (sourcePath) => {
      const artifact = createArtifact(skillInput);

      expect(() =>
        createPackageRecord({
          id: "pstack",
          ...packageIdentity,
          provider: "cursor",
          manifestPath: "pstack/.cursor-plugin/plugin.json",
          sourcePath,
          requestedRevision: "main",
          resolvedRevision: "abc123",
          artifacts: [artifact],
        }),
      ).toThrow("Package source paths must stay relative to the source root.");
    },
  );

  it("preserves package provenance and revisions", () => {
    const artifact = createArtifact(skillInput);
    const packageRecord = createPackageRecord({
      id: "pstack",
      ...packageIdentity,
      provider: "cursor",
      manifestPath: "pstack/.cursor-plugin/plugin.json",
      sourcePath: "./pstack",
      requestedRevision: "main",
      resolvedRevision: "abc123",
      license: "MIT",
      artifacts: [artifact],
    });
    const snapshot = createSourceSnapshot({
      sourceId: "cursor-official",
      provider: "cursor",
      locator: "https://github.com/cursor/plugins",
      revision: "abc123",
      packages: [packageRecord],
    });

    expect(snapshot).toEqual({
      sourceId: "cursor-official",
      provider: "cursor",
      locator: "https://github.com/cursor/plugins",
      revision: "abc123",
      packages: [
        {
          id: "pstack",
          externalId: "pstack",
          provider: "cursor",
          version: "0.1.0",
          manifestPath: "pstack/.cursor-plugin/plugin.json",
          sourcePath: "./pstack",
          requestedRevision: "main",
          resolvedRevision: "abc123",
          license: "MIT",
          artifacts: [
            {
              id: "unslop",
              kind: "skill",
              relativePath: "skills/unslop/SKILL.md",
              content: skillInput.content,
              contentHash:
                "b5d63463360b3f6975caf9e0b173109cae989baa1c002fd34f09cc13c7f80103",
              executionClass: "static",
              metadata: skillInput.metadata,
            },
          ],
        },
      ],
    });
  });

  it("rejects a package with an invalid nested artifact record", () => {
    const artifact = createArtifact(skillInput);

    expect(() =>
      createPackageRecord({
        id: "pstack",
        ...packageIdentity,
        provider: "cursor",
        manifestPath: "pstack/.cursor-plugin/plugin.json",
        sourcePath: "./pstack",
        requestedRevision: "main",
        resolvedRevision: "abc123",
        artifacts: [
          {
            ...artifact,
            contentHash: "invalid",
          },
        ],
      }),
    ).toThrow("Artifact content hash must be a lowercase SHA-256 hash.");
  });

  it("rejects a snapshot with an invalid nested package record", () => {
    const artifact = createArtifact(skillInput);
    const packageRecord = createPackageRecord({
      id: "pstack",
      ...packageIdentity,
      provider: "cursor",
      manifestPath: "pstack/.cursor-plugin/plugin.json",
      sourcePath: "./pstack",
      requestedRevision: "main",
      resolvedRevision: "abc123",
      artifacts: [artifact],
    });

    expect(() =>
      createSourceSnapshot({
        sourceId: "cursor-official",
        provider: "cursor",
        locator: "https://github.com/cursor/plugins",
        revision: "abc123",
        packages: [
          {
            ...packageRecord,
            provider: "claude" as "cursor",
          },
        ],
      }),
    ).toThrow("Package provider must be cursor.");
  });

  it("rejects duplicate artifact ids in a package", () => {
    const artifact = createArtifact(skillInput);

    expect(() =>
      createPackageRecord({
        id: "pstack",
        ...packageIdentity,
        provider: "cursor",
        manifestPath: "pstack/.cursor-plugin/plugin.json",
        sourcePath: "./pstack",
        requestedRevision: "main",
        resolvedRevision: "abc123",
        artifacts: [artifact, artifact],
      }),
    ).toThrow("Package artifact ids must be unique.");
  });

  it("rejects duplicate package ids in a source snapshot", () => {
    const artifact = createArtifact(skillInput);
    const packageRecord = createPackageRecord({
      id: "pstack",
      ...packageIdentity,
      provider: "cursor",
      manifestPath: "pstack/.cursor-plugin/plugin.json",
      sourcePath: "./pstack",
      requestedRevision: "main",
      resolvedRevision: "abc123",
      artifacts: [artifact],
    });

    expect(() =>
      createSourceSnapshot({
        sourceId: "cursor-official",
        provider: "cursor",
        locator: "https://github.com/cursor/plugins",
        revision: "abc123",
        packages: [packageRecord, packageRecord],
      }),
    ).toThrow("Source package ids must be unique.");
  });
});
