import { createHash } from "node:crypto";

const ARTIFACT_KINDS = [
  "skill",
  "hook",
  "agent",
  "command",
  "mcp-server",
  "resource",
] as const;
const EXECUTION_CLASSES = ["static", "executable"] as const;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];
export type ExecutionClass = (typeof EXECUTION_CLASSES)[number];
export type InvocationPolicy = "default" | "user-only";
export type ProviderMetadata = Readonly<Record<string, string | boolean>>;
export type SkillMetadata = Readonly<{
  name: string;
  description: string;
  providerMetadata?: ProviderMetadata;
  invocationPolicy?: InvocationPolicy;
}>;

export type ArtifactInput = Readonly<{
  id: string;
  kind: string;
  relativePath: string;
  content: string;
  contentHash?: string;
  executionClass: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type PackageArtifact = Readonly<{
  id: string;
  kind: ArtifactKind;
  relativePath: string;
  content: string;
  contentHash: string;
  executionClass: ExecutionClass;
  metadata?: SkillMetadata;
}>;

export type PackageInput = Readonly<{
  id: string;
  externalId: string;
  version: string;
  provider: string;
  manifestPath: string;
  sourcePath: string;
  requestedRevision: string;
  resolvedRevision: string;
  license?: string;
  artifacts: readonly unknown[];
}>;

export type PackageRecord = Readonly<{
  id: string;
  externalId: string;
  version: string;
  provider: "cursor";
  manifestPath: string;
  sourcePath: string;
  requestedRevision: string;
  resolvedRevision: string;
  license?: string;
  artifacts: readonly PackageArtifact[];
}>;

export type SourceSnapshotInput = Readonly<{
  sourceId: string;
  provider: string;
  locator: string;
  revision: string;
  packages: readonly unknown[];
}>;

export type SourceSnapshot = Readonly<{
  sourceId: string;
  provider: "cursor";
  locator: string;
  revision: string;
  packages: readonly PackageRecord[];
}>;

function requireText(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function readText(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  return requireText(value, label);
}

function readContent(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} is required.`);
  }

  return value;
}

function isArtifactKind(value: string): value is ArtifactKind {
  return ARTIFACT_KINDS.some((kind) => kind === value);
}

function isExecutionClass(value: string): value is ExecutionClass {
  return EXECUTION_CLASSES.some((executionClass) => executionClass === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeProviderMetadata(value: unknown): ProviderMetadata | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("Skill provider metadata must be a record.");
  }

  const entries = Object.entries(value);
  if (
    entries.some(
      ([, entryValue]) =>
        typeof entryValue !== "string" && typeof entryValue !== "boolean",
    )
  ) {
    throw new Error("Skill provider metadata values must be strings or booleans.");
  }

  return Object.fromEntries(entries) as ProviderMetadata;
}

function normalizeSkillMetadata(value: unknown): SkillMetadata {
  if (!isRecord(value)) {
    throw new Error("Skill artifacts require a name and description.");
  }

  if (
    typeof value.name !== "string" ||
    typeof value.description !== "string" ||
    !value.name.trim() ||
    !value.description.trim()
  ) {
    throw new Error("Skill artifacts require a name and description.");
  }

  const name = readText(value.name, "Skill name");
  const description = readText(value.description, "Skill description");
  const providerMetadata = normalizeProviderMetadata(value.providerMetadata);
  const invocationPolicy = value.invocationPolicy;
  if (
    invocationPolicy !== undefined &&
    invocationPolicy !== "default" &&
    invocationPolicy !== "user-only"
  ) {
    throw new Error(`Unsupported skill invocation policy: ${String(invocationPolicy)}.`);
  }

  return {
    name,
    description,
    ...(providerMetadata ? { providerMetadata } : {}),
    ...(invocationPolicy ? { invocationPolicy } : {}),
  };
}

function normalizeRelativePath(value: string): string {
  const normalized = requireText(value, "Artifact path").replaceAll("\\", "/");
  const segments = normalized.split("/");
  const isWindowsAbsolute = /^[a-zA-Z]:\//.test(normalized);
  if (
    normalized.startsWith("/") ||
    isWindowsAbsolute ||
    segments.some((segment) => segment === ".." || segment === ".")
  ) {
    throw new Error("Artifact paths must stay relative to the package root.");
  }

  return normalized;
}

function normalizeSourcePath(value: string): string {
  const normalized = requireText(value, "Package source path").replaceAll("\\", "/");
  const pathWithoutPrefix = normalized.startsWith("./")
    ? normalized.slice(2)
    : normalized;
  const segments = pathWithoutPrefix.split("/");
  const isWindowsAbsolute = /^[a-zA-Z]:\//.test(pathWithoutPrefix);
  if (
    pathWithoutPrefix.startsWith("/") ||
    isWindowsAbsolute ||
    segments.some((segment) => segment === ".." || segment === ".")
  ) {
    throw new Error("Package source paths must stay relative to the source root.");
  }

  return normalized;
}

function normalizePackageArtifact(value: unknown): PackageArtifact {
  if (typeof value !== "object" || value === null) {
    throw new Error("Package artifacts must be records.");
  }

  const artifact = value as Record<string, unknown>;
  const id = readText(artifact.id, "Artifact id");
  const kind = readText(artifact.kind, "Artifact kind");
  if (!isArtifactKind(kind)) {
    throw new Error(`Unsupported artifact kind: ${kind}.`);
  }
  const relativePath = normalizeRelativePath(
    readText(artifact.relativePath, "Artifact path"),
  );
  const content = readContent(artifact.content, "Artifact content");
  const contentHash = readText(artifact.contentHash, "Artifact content hash");
  if (!SHA256_PATTERN.test(contentHash)) {
    throw new Error("Artifact content hash must be a lowercase SHA-256 hash.");
  }
  if (hashContent(content) !== contentHash) {
    throw new Error("Artifact content hash does not match content.");
  }
  const executionClass = readText(
    artifact.executionClass,
    "Artifact execution class",
  );
  if (!isExecutionClass(executionClass)) {
    throw new Error(`Unsupported execution class: ${executionClass}.`);
  }

  const metadata = kind === "skill" ? normalizeSkillMetadata(artifact.metadata) : undefined;

  return {
    id,
    kind,
    relativePath,
    content,
    contentHash,
    executionClass,
    ...(metadata ? { metadata } : {}),
  };
}

function normalizePackageRecord(value: unknown): PackageRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Source packages must be records.");
  }

  const packageValue = value as Record<string, unknown>;
  const id = readText(packageValue.id, "Package id");
  const externalId = readText(packageValue.externalId, "Package external id");
  const version = readText(packageValue.version, "Package version");
  const provider = readText(packageValue.provider, "Package provider");
  if (provider !== "cursor") {
    throw new Error("Package provider must be cursor.");
  }
  if (!Array.isArray(packageValue.artifacts) || packageValue.artifacts.length === 0) {
    throw new Error("Packages require at least one artifact.");
  }
  const artifacts = packageValue.artifacts.map(normalizePackageArtifact);
  if (new Set(artifacts.map((artifact) => artifact.id)).size !== artifacts.length) {
    throw new Error("Package artifact ids must be unique.");
  }

  const license =
    packageValue.license === undefined
      ? undefined
      : readText(packageValue.license, "Package license");
  return {
    id,
    externalId,
    version,
    provider: "cursor",
    manifestPath: normalizeRelativePath(
      readText(packageValue.manifestPath, "Package manifest path"),
    ),
    sourcePath: normalizeSourcePath(
      readText(packageValue.sourcePath, "Package source path"),
    ),
    requestedRevision: readText(
      packageValue.requestedRevision,
      "Requested revision",
    ),
    resolvedRevision: readText(
      packageValue.resolvedRevision,
      "Resolved revision",
    ),
    ...(license ? { license } : {}),
    artifacts,
  };
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export function createArtifact(input: ArtifactInput): PackageArtifact {
  const id = requireText(input.id, "Artifact id");
  if (!isArtifactKind(input.kind)) {
    throw new Error(`Unsupported artifact kind: ${input.kind}.`);
  }
  if (!isExecutionClass(input.executionClass)) {
    throw new Error(`Unsupported execution class: ${input.executionClass}.`);
  }

  const relativePath = normalizeRelativePath(input.relativePath);
  const contentHash = hashContent(input.content);
  if (input.contentHash !== undefined) {
    if (!SHA256_PATTERN.test(input.contentHash)) {
      throw new Error("Artifact content hash must be a lowercase SHA-256 hash.");
    }
    if (input.contentHash !== contentHash) {
      throw new Error("Artifact content hash does not match content.");
    }
  }

  const metadata =
    input.kind === "skill" ? normalizeSkillMetadata(input.metadata) : undefined;

  return {
    id,
    kind: input.kind,
    relativePath,
    content: input.content,
    contentHash,
    executionClass: input.executionClass,
    ...(metadata ? { metadata } : {}),
  };
}

export function assertMaterializableArtifact(
  artifact: PackageArtifact,
): PackageArtifact {
  if (artifact.executionClass !== "static") {
    throw new Error("Executable artifacts require an approved provider action.");
  }
  if (artifact.kind !== "skill") {
    throw new Error("Only static skill artifacts can be materialized in P0.");
  }

  return artifact;
}

export function createPackageRecord(input: PackageInput): PackageRecord {
  return normalizePackageRecord(input);
}

export function createSourceSnapshot(input: SourceSnapshotInput): SourceSnapshot {
  const sourceId = readText(input.sourceId, "Source id");
  const provider = readText(input.provider, "Source provider");
  if (provider !== "cursor") {
    throw new Error("Source provider must be cursor.");
  }
  if (!Array.isArray(input.packages) || input.packages.length === 0) {
    throw new Error("Source snapshots require at least one package.");
  }
  const packages = input.packages.map(normalizePackageRecord);
  if (new Set(packages.map((pkg) => pkg.id)).size !== packages.length) {
    throw new Error("Source package ids must be unique.");
  }

  return {
    sourceId,
    provider: "cursor",
    locator: readText(input.locator, "Source locator"),
    revision: readText(input.revision, "Source revision"),
    packages,
  };
}
