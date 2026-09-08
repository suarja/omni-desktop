import { readdir, readFile, realpath } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";

import {
  createArtifact,
  createPackageRecord,
  createSourceSnapshot,
  type ArtifactInput,
  type SkillMetadata,
  type SourceSnapshot,
} from "../../domain/records";
import type { SourceAdapter } from "../../ports";

type JsonObject = Record<string, unknown>;

function isRecord(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${label} is required.`);
  }

  return value.trim();
}

function toPosixPath(value: string): string {
  return value.split(sep).join("/");
}

function assertWithinRoot(root: string, candidate: string): void {
  const distance = relative(root, candidate);
  if (distance === ".." || distance.startsWith(`..${sep}`) || distance.startsWith(sep)) {
    throw new Error("Fixture paths must stay inside the source root.");
  }
}

async function resolveExistingWithinRoot(
  root: string,
  relativePath: string,
): Promise<string> {
  const absoluteRoot = await realpath(root);
  const candidate = resolve(absoluteRoot, relativePath);
  assertWithinRoot(absoluteRoot, candidate);
  const existingCandidate = await realpath(candidate);
  assertWithinRoot(absoluteRoot, existingCandidate);

  return existingCandidate;
}

async function readJson(filePath: string): Promise<JsonObject> {
  const parsed: unknown = JSON.parse(await readFile(filePath, "utf8"));
  if (!isRecord(parsed)) {
    throw new Error(`Expected a JSON object at ${filePath}.`);
  }

  return parsed;
}

async function readDirectory(filePath: string): Promise<import("node:fs").Dirent[]> {
  try {
    const entries = await readdir(filePath, { withFileTypes: true });
    return entries.sort((left, right) => (left.name < right.name ? -1 : 1));
  } catch (error: unknown) {
    if (isRecord(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

async function listFiles(root: string, current: string): Promise<string[]> {
  let resolvedCurrent: string;
  try {
    resolvedCurrent = await resolveExistingWithinRoot(root, relative(root, current));
  } catch (error: unknown) {
    if (isRecord(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }

  const entries = await readDirectory(resolvedCurrent);
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error("Fixture symlinks are not supported.");
    }
    const entryPath = join(resolvedCurrent, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(root, entryPath)));
    } else if (entry.isFile()) {
      files.push(toPosixPath(relative(root, entryPath)));
    }
  }

  return files;
}

function parseSkillFrontmatter(content: string): SkillMetadata {
  const lines = content.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    throw new Error("Skill files must start with YAML frontmatter.");
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (end < 0) {
    throw new Error("Skill frontmatter must have a closing delimiter.");
  }

  const fields = new Map<string, string>();
  for (const line of lines.slice(1, end)) {
    const separator = line.indexOf(":");
    if (separator > 0) {
      fields.set(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
  }

  const providerMetadataEntries = [...fields.entries()]
    .filter(([key]) => key !== "name" && key !== "description")
    .map(([key, value]) => [
      key,
      value === "true" ? true : value === "false" ? false : value,
    ] as const);
  const providerMetadata = Object.fromEntries(providerMetadataEntries);
  const invocationPolicy =
    providerMetadata["disable-model-invocation"] === true ? "user-only" : undefined;

  return {
    name: readString(fields.get("name"), "Skill name"),
    description: readString(fields.get("description"), "Skill description"),
    ...(providerMetadataEntries.length > 0 ? { providerMetadata } : {}),
    ...(invocationPolicy ? { invocationPolicy } : {}),
  };
}

async function readPluginArtifacts(pluginRoot: string): Promise<ArtifactInput[]> {
  const artifactInputs: ArtifactInput[] = [];
  const skillFiles = await listFiles(pluginRoot, join(pluginRoot, "skills"));
  for (const relativePath of skillFiles.filter((path) => basename(path) === "SKILL.md")) {
    const content = await readFile(join(pluginRoot, relativePath), "utf8");
    const metadata = parseSkillFrontmatter(content);
    artifactInputs.push({
      id: metadata.name,
      kind: "skill",
      relativePath,
      content,
      executionClass: "static",
      metadata,
    });
  }

  const hookFiles = await listFiles(pluginRoot, join(pluginRoot, "hooks"));
  for (const relativePath of hookFiles) {
    artifactInputs.push({
      id: basename(relativePath),
      kind: "hook",
      relativePath,
      content: await readFile(join(pluginRoot, relativePath), "utf8"),
      executionClass: "executable",
    });
  }

  return artifactInputs;
}

export async function readCursorFixtureSnapshot(sourceRoot: string): Promise<SourceSnapshot> {
  const absoluteRoot = resolve(sourceRoot);
  const marketplacePath = await resolveExistingWithinRoot(
    absoluteRoot,
    ".cursor-plugin/marketplace.json",
  );
  const marketplace = await readJson(marketplacePath);
  if (!Array.isArray(marketplace.plugins)) {
    throw new Error("Cursor marketplace plugins must be an array.");
  }

  const packages = [];
  for (const entry of marketplace.plugins) {
    if (!isRecord(entry)) {
      throw new Error("Cursor marketplace entries must be objects.");
    }
    const sourcePath = readString(entry.source, "Cursor plugin source");
    const pluginRoot = await resolveExistingWithinRoot(absoluteRoot, sourcePath);
    const manifestRelativePath = toPosixPath(
      relative(absoluteRoot, join(pluginRoot, ".cursor-plugin/plugin.json")),
    );
    const manifest = await readJson(
      await resolveExistingWithinRoot(absoluteRoot, manifestRelativePath),
    );
    const pluginRootRelative = toPosixPath(relative(absoluteRoot, pluginRoot));
    const pluginName = readString(manifest.name, "Cursor plugin name");
    const version = readString(manifest.version, "Cursor plugin version");
    const artifactInputs = await readPluginArtifacts(pluginRoot);
    const artifacts = artifactInputs.map(createArtifact);

    packages.push(
      createPackageRecord({
        id: pluginName,
        externalId: readString(entry.name, "Cursor marketplace entry name"),
        version,
        provider: "cursor",
        manifestPath: manifestRelativePath,
        sourcePath: sourcePath.startsWith("./") ? sourcePath : `./${pluginRootRelative}`,
        requestedRevision: "fixture",
        resolvedRevision: "fixture",
        license: typeof manifest.license === "string" ? manifest.license : undefined,
        artifacts,
      }),
    );
  }

  return createSourceSnapshot({
    sourceId: readString(marketplace.name, "Cursor marketplace name"),
    provider: "cursor",
    locator: absoluteRoot,
    revision: "fixture",
    packages,
  });
}

export const cursorFixtureSourceAdapter: SourceAdapter = {
  readSnapshot: readCursorFixtureSnapshot,
};
