import { randomUUID } from "node:crypto";
import {
  mkdir,
  readFile,
  realpath,
  rename,
  unlink,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { hashContent } from "../../domain/records";
import type { ApplyReceipt, FileAction, FilePort } from "../../ports";

function isOutsideRoot(root: string, candidate: string): boolean {
  const distance = relative(root, candidate);
  return (
    distance === ".." ||
    distance.startsWith(`..${sep}`) ||
    distance.startsWith(sep)
  );
}

async function realpathNearestExisting(path: string): Promise<string> {
  let current = path;
  while (true) {
    try {
      return await realpath(current);
    } catch (error: unknown) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      ) {
        throw error;
      }
      const parent = dirname(current);
      if (parent === current) {
        throw error;
      }
      current = parent;
    }
  }
}

async function ensureSafePath(projectRoot: string, targetPath: string): Promise<string> {
  if (!isAbsolute(targetPath)) {
    throw new Error("File paths must be absolute.");
  }

  const lexicalRoot = resolve(projectRoot);
  const lexicalTarget = resolve(targetPath);
  if (isOutsideRoot(lexicalRoot, lexicalTarget)) {
    throw new Error("File path must remain inside the project root.");
  }

  const realRoot = await realpath(lexicalRoot);
  const realTarget = await realpathNearestExisting(lexicalTarget);
  if (isOutsideRoot(realRoot, realTarget)) {
    throw new Error("File path must remain inside the project root.");
  }

  return lexicalTarget;
}

async function writeAtomically(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = join(
    dirname(path),
    `.${basename(path)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporaryPath, content, "utf8");
    await rename(temporaryPath, path);
  } catch (error: unknown) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}

function backupPath(projectRoot: string, targetPath: string, contentHash: string): string {
  const relativeTarget = relative(projectRoot, targetPath).split(sep).join("/");
  return join(projectRoot, ".omni", "backups", `${relativeTarget}.${contentHash}.bak`);
}

function unchangedReceipt(action: FileAction): ApplyReceipt {
  return {
    path: action.path,
    kind: action.kind,
    contentHash: action.contentHash,
    changed: false,
  };
}

export function createLocalFilePort(projectRoot: string): FilePort {
  if (!isAbsolute(projectRoot)) {
    throw new Error("Project root must be absolute.");
  }

  const root = resolve(projectRoot);

  return {
    async read(path) {
      const safePath = await ensureSafePath(root, path);
      try {
        return await readFile(safePath, "utf8");
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          return null;
        }
        throw error;
      }
    },

    async apply(action) {
      const safePath = await ensureSafePath(root, action.path);
      if (hashContent(action.content) !== action.contentHash) {
        throw new Error("File action content hash does not match content.");
      }

      let existingContent: string | null;
      try {
        existingContent = await readFile(safePath, "utf8");
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "ENOENT"
        ) {
          existingContent = null;
        } else {
          throw error;
        }
      }

      const existingHash =
        existingContent === null ? undefined : hashContent(existingContent);
      if (action.expectedHash !== undefined && existingHash !== action.expectedHash) {
        throw new Error("Expected hash mismatch; refusing to apply the action.");
      }
      if (action.kind === "update" && existingContent === null) {
        throw new Error("Update action requires an existing target.");
      }
      if (
        action.kind === "create" &&
        existingContent !== null &&
        existingHash !== action.contentHash
      ) {
        throw new Error("Target already exists with different content.");
      }
      if (existingHash === action.contentHash) {
        return unchangedReceipt(action);
      }

      const previousHash = existingHash;
      const previousContent = existingContent;
      const nextBackupPath = previousContent !== null
        ? backupPath(root, safePath, previousHash ?? hashContent(previousContent))
        : undefined;
      if (previousContent !== null && nextBackupPath) {
        const safeBackupPath = await ensureSafePath(root, nextBackupPath);
        await writeAtomically(safeBackupPath, previousContent);
      }

      await ensureSafePath(root, safePath);
      await writeAtomically(safePath, action.content);
      return {
        path: safePath,
        kind: action.kind,
        contentHash: action.contentHash,
        changed: true,
        ...(nextBackupPath ? { backupPath: nextBackupPath } : {}),
      };
    },
  };
}
