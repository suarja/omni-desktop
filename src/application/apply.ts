import type { ApplyReceipt, FileAction, FilePort, Plan } from "../ports";
import { hashContent } from "../domain/records";

export type ApplyFailure = Readonly<{
  action: FileAction;
  reason: string;
}>;

export type ApplyResult = Readonly<{
  status: "applied" | "noop" | "blocked" | "failed";
  completed: readonly ApplyReceipt[];
  failed: readonly ApplyFailure[];
  reason?: string;
}>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected filesystem error.";
}

function blocked(reason: string): ApplyResult {
  return {
    status: "blocked",
    completed: [],
    failed: [],
    reason,
  };
}

function failed(action: FileAction, reason: string): ApplyResult {
  return {
    status: "failed",
    completed: [],
    failed: [{ action, reason }],
  };
}

export async function applyPlan(
  filePort: FilePort,
  plan: Plan,
  approved: boolean,
): Promise<ApplyResult> {
  if (approved !== true) {
    return blocked("Explicit approval is required before applying a plan.");
  }
  if (plan.status === "drifted") {
    return blocked("Cannot apply a drifted plan.");
  }
  if (plan.status === "blocked") {
    return blocked("Cannot apply a blocked plan.");
  }
  if (plan.status === "noop") {
    return {
      status: "noop",
      completed: [],
      failed: [],
    };
  }

  for (const action of plan.actions) {
    try {
      if (hashContent(action.content) !== action.contentHash) {
        return failed(action, "File action content hash does not match content.");
      }

      const observedContent = await filePort.read(action.path);
      const observedHash =
        observedContent === null ? undefined : hashContent(observedContent);
      if (action.expectedHash !== undefined && observedHash !== action.expectedHash) {
        return failed(action, "Expected hash mismatch; refusing to apply the plan.");
      }
      if (action.kind === "update" && observedContent === null) {
        return failed(action, "Update action requires an existing target.");
      }
      if (
        action.kind === "create" &&
        observedContent !== null &&
        observedHash !== action.contentHash
      ) {
        return failed(action, "Target already exists with different content.");
      }
    } catch (error: unknown) {
      return failed(action, errorMessage(error));
    }
  }

  const completed: ApplyReceipt[] = [];
  for (const action of plan.actions) {
    try {
      completed.push(await filePort.apply(action));
    } catch (error: unknown) {
      return {
        status: "failed",
        completed,
        failed: [{ action, reason: errorMessage(error) }],
      };
    }
  }

  return {
    status: "applied",
    completed,
    failed: [],
  };
}
