import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { hashContent } from "../../src/domain/records";
import { createLocalFilePort } from "../../src/adapters/filesystem/local-files";
import type { FileAction } from "../../src/ports";

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "omni-local-files-"));
  temporaryRoots.push(root);
  return root;
}

function action(
  path: string,
  content: string,
  kind: FileAction["kind"] = "create",
  expectedHash?: string,
): FileAction {
  return {
    kind,
    path,
    ...(expectedHash ? { expectedHash } : {}),
    content,
    contentHash: hashContent(content),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("local filesystem port", () => {
  it("creates a file and reads it back", async () => {
    const root = await createRoot();
    const target = join(root, ".cursor/skills/unslop/SKILL.md");
    const port = createLocalFilePort(root);

    const receipt = await port.apply(action(target, "skill content"));

    expect(receipt).toMatchObject({
      path: target,
      kind: "create",
      contentHash: hashContent("skill content"),
      changed: true,
    });
    expect(receipt.backupPath).toBeUndefined();
    expect(await port.read(target)).toBe("skill content");
  });

  it("backs up the previous content before an update", async () => {
    const root = await createRoot();
    const target = join(root, ".cursor/skills/unslop/SKILL.md");
    const port = createLocalFilePort(root);
    const previousContent = "previous";

    await port.apply(action(target, previousContent));
    const receipt = await port.apply(
      action(target, "updated", "update", hashContent(previousContent)),
    );

    expect(receipt.backupPath).toBeDefined();
    expect(relative(root, receipt.backupPath ?? "")).toMatch(
      /^\.omni\/backups\//,
    );
    expect(await readFile(receipt.backupPath ?? "", "utf8")).toBe(previousContent);
    expect(await port.read(target)).toBe("updated");
  });

  it("backs up an existing empty file before an update", async () => {
    const root = await createRoot();
    const target = join(root, "empty.md");
    const port = createLocalFilePort(root);

    await port.apply(action(target, ""));
    const receipt = await port.apply(action(target, "next", "update", hashContent("")));

    expect(receipt.backupPath).toBeDefined();
    expect(await readFile(receipt.backupPath ?? "", "utf8")).toBe("");
    expect(await port.read(target)).toBe("next");
  });

  it("rejects an expected hash mismatch without changing the target", async () => {
    const root = await createRoot();
    const target = join(root, "skill.md");
    const port = createLocalFilePort(root);

    await port.apply(action(target, "current"));
    await expect(
      port.apply(action(target, "updated", "update", hashContent("wrong"))),
    ).rejects.toThrow("Expected hash mismatch");

    expect(await port.read(target)).toBe("current");
  });

  it("rejects traversal and symlink escapes", async () => {
    const root = await createRoot();
    const outsideRoot = await createRoot();
    const port = createLocalFilePort(root);

    await expect(
      port.apply(action(join(root, "..", "outside.md"), "outside")),
    ).rejects.toThrow("project root");

    await mkdir(join(outsideRoot, "external"));
    await symlink(join(outsideRoot, "external"), join(root, "linked"), "dir");
    await expect(
      port.apply(action(join(root, "linked", "skill.md"), "outside")),
    ).rejects.toThrow("project root");
  });

  it("does not overwrite an existing file with an unguarded create", async () => {
    const root = await createRoot();
    const target = join(root, "skill.md");
    const port = createLocalFilePort(root);

    await writeFile(target, "existing");
    await expect(port.apply(action(target, "replacement"))).rejects.toThrow(
      "already exists",
    );
    expect(await port.read(target)).toBe("existing");
  });

  it("treats an identical repeated apply as unchanged", async () => {
    const root = await createRoot();
    const target = join(root, "skill.md");
    const port = createLocalFilePort(root);
    const createAction = action(target, "same content");

    await port.apply(createAction);
    const receipt = await port.apply(createAction);

    expect(receipt.changed).toBe(false);
    expect(receipt.backupPath).toBeUndefined();
  });
});
