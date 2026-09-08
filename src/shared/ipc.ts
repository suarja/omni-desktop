export const IPC_CHANNELS = {
  listSources: "omni:list-sources",
  createPlan: "omni:create-plan",
  applyPlan: "omni:apply-plan",
} as const;

export type ArtifactSummary = Readonly<{
  id: string;
  kind: "skill" | "hook" | "agent" | "command" | "mcp-server" | "resource";
  relativePath: string;
  contentHash: string;
  executionClass: "static" | "executable";
  name?: string;
  description?: string;
  invocationPolicy?: "default" | "user-only";
  providerMetadata?: Readonly<Record<string, string | boolean>>;
}>;

export type PackageSummary = Readonly<{
  id: string;
  externalId: string;
  version: string;
  provider: "cursor";
  sourcePath: string;
  license?: string;
  artifacts: readonly ArtifactSummary[];
}>;

export type SourceSummary = Readonly<{
  id: string;
  provider: "cursor";
  locator: string;
  revision: string;
  defaultProjectRoot: string;
  packages: readonly PackageSummary[];
}>;

export type SourceCatalog = Readonly<{
  projectRoot: string;
  sources: readonly SourceSummary[];
}>;

export type CreatePlanRequest = Readonly<{
  sourceId: string;
  packageId: string;
  artifactId: string;
  projectRoot: string;
}>;

export type PlanAction = Readonly<{
  kind: "create" | "update";
  path: string;
  expectedHash?: string;
  content: string;
  contentHash: string;
}>;

export type PlanPayload = Readonly<{
  id: string;
  bindingId: string;
  actions: readonly PlanAction[];
  status: "ready" | "drifted" | "blocked" | "noop";
  targetPath?: string;
  reason?: string;
}>;

export type PlanPreview = Readonly<{
  sourceId: string;
  sourceRevision: string;
  packageId: string;
  packageExternalId: string;
  packageVersion: string;
  artifactId: string;
  artifactKind: ArtifactSummary["kind"];
  artifactName?: string;
  artifactDescription?: string;
  executionClass: ArtifactSummary["executionClass"];
  compatibility: "compatible" | "provider-action";
  risk: "low" | "medium" | "high";
  projectRoot: string;
  plan: PlanPayload;
}>;

export type ApplyPlanRequest = Readonly<{
  projectRoot: string;
  plan: PlanPreview;
  approved: boolean;
}>;

export type ApplyReceipt = Readonly<{
  path: string;
  kind: "create" | "update";
  contentHash: string;
  changed: boolean;
  backupPath?: string;
}>;

export type ApplyFailure = Readonly<{
  path: string;
  kind: "create" | "update";
  reason: string;
}>;

export type ApplyResult = Readonly<{
  status: "applied" | "noop" | "blocked" | "failed";
  completed: readonly ApplyReceipt[];
  failed: readonly ApplyFailure[];
  reason?: string;
}>;

export interface DesktopApi {
  listSources(): Promise<SourceCatalog>;
  createPlan(request: CreatePlanRequest): Promise<PlanPreview>;
  applyPlan(request: ApplyPlanRequest): Promise<ApplyResult>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readText(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }

  return value;
}

function readOptionalText(value: unknown, label: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return readText(value, label);
}

function readEnum<T extends string>(
  value: unknown,
  values: readonly T[],
  label: string,
): T {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new Error(`${label} is invalid.`);
  }

  return value as T;
}

function parseMetadata(
  value: unknown,
): Readonly<Record<string, string | boolean>> | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error("Provider metadata must be an object.");
  }

  const entries = Object.entries(value);
  if (
    entries.some(
      ([, item]) => typeof item !== "string" && typeof item !== "boolean",
    )
  ) {
    throw new Error("Provider metadata values must be strings or booleans.");
  }

  return Object.fromEntries(entries) as Readonly<Record<string, string | boolean>>;
}

function parseArtifactSummary(value: unknown): ArtifactSummary {
  if (!isRecord(value)) {
    throw new Error("Artifact summary must be an object.");
  }

  const name = readOptionalText(value.name, "Artifact name");
  const description = readOptionalText(value.description, "Artifact description");
  const invocationPolicy =
    value.invocationPolicy === undefined
      ? undefined
      : readEnum(value.invocationPolicy, ["default", "user-only"] as const, "Invocation policy");
  const providerMetadata = parseMetadata(value.providerMetadata);
  const artifact: ArtifactSummary = {
    id: readText(value.id, "Artifact id"),
    kind: readEnum(
      value.kind,
      ["skill", "hook", "agent", "command", "mcp-server", "resource"],
      "Artifact kind",
    ),
    relativePath: readText(value.relativePath, "Artifact path"),
    contentHash: readText(value.contentHash, "Artifact hash"),
    executionClass: readEnum(
      value.executionClass,
      ["static", "executable"],
      "Execution class",
    ),
    ...(name ? { name } : {}),
    ...(description ? { description } : {}),
    ...(invocationPolicy ? { invocationPolicy } : {}),
    ...(providerMetadata ? { providerMetadata } : {}),
  };

  return artifact;
}

function parsePackageSummary(value: unknown): PackageSummary {
  if (!isRecord(value) || !Array.isArray(value.artifacts)) {
    throw new Error("Package summary is invalid.");
  }

  return {
    id: readText(value.id, "Package id"),
    externalId: readText(value.externalId, "Package external id"),
    version: readText(value.version, "Package version"),
    provider: readEnum(value.provider, ["cursor"], "Package provider"),
    sourcePath: readText(value.sourcePath, "Package source path"),
    ...(value.license === undefined
      ? {}
      : { license: readText(value.license, "Package license") }),
    artifacts: value.artifacts.map(parseArtifactSummary),
  };
}

function parseSourceSummary(value: unknown): SourceSummary {
  if (!isRecord(value) || !Array.isArray(value.packages)) {
    throw new Error("Source summary is invalid.");
  }

  return {
    id: readText(value.id, "Source id"),
    provider: readEnum(value.provider, ["cursor"], "Source provider"),
    locator: readText(value.locator, "Source locator"),
    revision: readText(value.revision, "Source revision"),
    defaultProjectRoot: readText(value.defaultProjectRoot, "Default project root"),
    packages: value.packages.map(parsePackageSummary),
  };
}

export function parseSourceCatalog(value: unknown): SourceCatalog {
  if (!isRecord(value) || !Array.isArray(value.sources)) {
    throw new Error("The source catalog response is invalid.");
  }

  return {
    projectRoot: readText(value.projectRoot, "Catalog project root"),
    sources: value.sources.map(parseSourceSummary),
  };
}

export function parseCreatePlanRequest(value: unknown): CreatePlanRequest {
  if (!isRecord(value)) {
    throw new Error("The create-plan request is invalid.");
  }

  return {
    sourceId: readText(value.sourceId, "Source id"),
    packageId: readText(value.packageId, "Package id"),
    artifactId: readText(value.artifactId, "Artifact id"),
    projectRoot: readText(value.projectRoot, "Project root"),
  };
}

function parsePlanAction(value: unknown): PlanAction {
  if (!isRecord(value)) {
    throw new Error("Plan action must be an object.");
  }

  return {
    kind: readEnum(value.kind, ["create", "update"], "Plan action kind"),
    path: readText(value.path, "Plan action path"),
    ...(value.expectedHash === undefined
      ? {}
      : { expectedHash: readText(value.expectedHash, "Expected hash") }),
    content: readText(value.content, "Plan action content"),
    contentHash: readText(value.contentHash, "Plan action hash"),
  };
}

function parsePlanPayload(value: unknown): PlanPayload {
  if (!isRecord(value) || !Array.isArray(value.actions)) {
    throw new Error("Plan payload is invalid.");
  }

  return {
    id: readText(value.id, "Plan id"),
    bindingId: readText(value.bindingId, "Binding id"),
    actions: value.actions.map(parsePlanAction),
    status: readEnum(
      value.status,
      ["ready", "drifted", "blocked", "noop"],
      "Plan status",
    ),
    ...(value.targetPath === undefined
      ? {}
      : { targetPath: readText(value.targetPath, "Target path") }),
    ...(value.reason === undefined
      ? {}
      : { reason: readText(value.reason, "Plan reason") }),
  };
}

export function parsePlanPreview(value: unknown): PlanPreview {
  if (!isRecord(value)) {
    throw new Error("The plan preview response is invalid.");
  }

  const artifactName = readOptionalText(value.artifactName, "Artifact name");
  const artifactDescription = readOptionalText(
    value.artifactDescription,
    "Artifact description",
  );

  return {
    sourceId: readText(value.sourceId, "Source id"),
    sourceRevision: readText(value.sourceRevision, "Source revision"),
    packageId: readText(value.packageId, "Package id"),
    packageExternalId: readText(value.packageExternalId, "Package external id"),
    packageVersion: readText(value.packageVersion, "Package version"),
    artifactId: readText(value.artifactId, "Artifact id"),
    artifactKind: readEnum(
      value.artifactKind,
      ["skill", "hook", "agent", "command", "mcp-server", "resource"],
      "Artifact kind",
    ),
    ...(artifactName ? { artifactName } : {}),
    ...(artifactDescription ? { artifactDescription } : {}),
    executionClass: readEnum(
      value.executionClass,
      ["static", "executable"],
      "Execution class",
    ),
    compatibility: readEnum(
      value.compatibility,
      ["compatible", "provider-action"],
      "Compatibility",
    ),
    risk: readEnum(value.risk, ["low", "medium", "high"], "Risk"),
    projectRoot: readText(value.projectRoot, "Project root"),
    plan: parsePlanPayload(value.plan),
  };
}

export function parseApplyPlanRequest(value: unknown): ApplyPlanRequest {
  if (!isRecord(value)) {
    throw new Error("The apply-plan request is invalid.");
  }
  if (typeof value.approved !== "boolean") {
    throw new Error("Approval must be a boolean.");
  }

  return {
    projectRoot: readText(value.projectRoot, "Project root"),
    plan: parsePlanPreview(value.plan),
    approved: value.approved,
  };
}

function parseReceipt(value: unknown): ApplyReceipt {
  if (!isRecord(value)) {
    throw new Error("Apply receipt must be an object.");
  }
  if (typeof value.changed !== "boolean") {
    throw new Error("Receipt changed flag must be a boolean.");
  }

  return {
    path: readText(value.path, "Receipt path"),
    kind: readEnum(value.kind, ["create", "update"], "Receipt kind"),
    contentHash: readText(value.contentHash, "Receipt hash"),
    changed: value.changed,
    ...(value.backupPath === undefined
      ? {}
      : { backupPath: readText(value.backupPath, "Backup path") }),
  };
}

function parseFailure(value: unknown): ApplyFailure {
  if (!isRecord(value)) {
    throw new Error("Apply failure must be an object.");
  }

  return {
    path: readText(value.path, "Failure path"),
    kind: readEnum(value.kind, ["create", "update"], "Failure kind"),
    reason: readText(value.reason, "Failure reason"),
  };
}

export function parseApplyResult(value: unknown): ApplyResult {
  if (!isRecord(value) || !Array.isArray(value.completed) || !Array.isArray(value.failed)) {
    throw new Error("The apply response is invalid.");
  }

  return {
    status: readEnum(
      value.status,
      ["applied", "noop", "blocked", "failed"],
      "Apply status",
    ),
    completed: value.completed.map(parseReceipt),
    failed: value.failed.map(parseFailure),
    ...(value.reason === undefined
      ? {}
      : { reason: readText(value.reason, "Apply reason") }),
  };
}
