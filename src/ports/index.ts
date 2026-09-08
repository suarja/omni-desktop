import type { SourceSnapshot } from "../domain/records";

export type Binding = Readonly<{
  id: string;
  packageId: string;
  artifactId: string;
  projectRoot: string;
  harnessId: "cursor";
  ownedContentHash?: string;
}>;

export type FileAction = Readonly<{
  kind: "create" | "update";
  path: string;
  expectedHash?: string;
  content: string;
  contentHash: string;
}>;

export type ApplyReceipt = Readonly<{
  path: string;
  kind: "create" | "update";
  contentHash: string;
  changed: boolean;
  backupPath?: string;
}>;

export type Plan = Readonly<{
  id: string;
  bindingId: string;
  actions: readonly FileAction[];
  status: "ready" | "drifted" | "blocked" | "noop";
  targetPath?: string;
  reason?: string;
}>;

export interface SourceAdapter {
  readSnapshot(sourceRoot: string): Promise<SourceSnapshot>;
}

export interface HarnessAdapter {
  resolveSkillTarget(projectRoot: string, skillId: string): string;
}

export interface FilePort {
  read(path: string): Promise<string | null>;
  apply(action: FileAction): Promise<ApplyReceipt>;
}

export interface Reconciler {
  plan(snapshot: SourceSnapshot, binding: Binding): Promise<Plan>;
}
