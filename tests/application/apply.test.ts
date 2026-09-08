import { describe, expect, it, vi } from "vitest";

import { applyPlan } from "../../src/application/apply";
import { hashContent } from "../../src/domain/records";
import type { ApplyReceipt, FileAction, FilePort, Plan } from "../../src/ports";

const action: FileAction = {
  kind: "create",
  path: "/tmp/omni-apply-project/skill.md",
  content: "skill content",
  contentHash: hashContent("skill content"),
};

function readyPlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    bindingId: "binding-1",
    status: "ready",
    actions: [action],
    ...overrides,
  };
}

function receipt(overrides: Partial<ApplyReceipt> = {}): ApplyReceipt {
  return {
    path: action.path,
    kind: action.kind,
    contentHash: action.contentHash,
    changed: true,
    ...overrides,
  };
}

function createFilePort(
  implementation: FilePort["apply"] = async () => receipt(),
): FilePort & {
  read: ReturnType<typeof vi.fn>;
  apply: ReturnType<typeof vi.fn>;
} {
  return {
    read: vi.fn(async () => null),
    apply: vi.fn(implementation),
  };
}

describe("bounded plan application", () => {
  it("requires explicit approval before applying any action", async () => {
    const filePort = createFilePort();

    const result = await applyPlan(filePort, readyPlan(), false);

    expect(result).toMatchObject({
      status: "blocked",
      completed: [],
      failed: [],
      reason: "Explicit approval is required before applying a plan.",
    });
    expect(filePort.apply).not.toHaveBeenCalled();
  });

  it("applies an approved ready plan and exposes recovery receipts", async () => {
    const filePort = createFilePort(async () =>
      receipt({ backupPath: "/tmp/omni-apply-project/.omni/backups/skill.bak" }),
    );

    const result = await applyPlan(filePort, readyPlan(), true);

    expect(result.status).toBe("applied");
    expect(result.completed).toEqual([
      receipt({ backupPath: "/tmp/omni-apply-project/.omni/backups/skill.bak" }),
    ]);
    expect(result.failed).toEqual([]);
    expect(filePort.apply).toHaveBeenCalledWith(action);
  });

  it("refuses drifted and blocked plans before any write", async () => {
    const filePort = createFilePort();

    const drifted = await applyPlan(
      filePort,
      readyPlan({ status: "drifted", actions: [] }),
      true,
    );
    const blocked = await applyPlan(
      filePort,
      readyPlan({ status: "blocked", actions: [] }),
      true,
    );

    expect(drifted).toMatchObject({
      status: "blocked",
      reason: "Cannot apply a drifted plan.",
    });
    expect(blocked).toMatchObject({
      status: "blocked",
      reason: "Cannot apply a blocked plan.",
    });
    expect(filePort.apply).not.toHaveBeenCalled();
  });

  it("returns noop without invoking the file port", async () => {
    const filePort = createFilePort();

    const result = await applyPlan(
      filePort,
      readyPlan({ status: "noop", actions: [] }),
      true,
    );

    expect(result).toMatchObject({ status: "noop", completed: [], failed: [] });
    expect(filePort.apply).not.toHaveBeenCalled();
  });

  it("reports a failed action and preserves completed receipts", async () => {
    const failure = new Error("filesystem unavailable");
    const filePort = createFilePort(async () => {
      throw failure;
    });

    const result = await applyPlan(filePort, readyPlan(), true);

    expect(result.status).toBe("failed");
    expect(result.completed).toEqual([]);
    expect(result.failed).toEqual([
      { action, reason: "filesystem unavailable" },
    ]);
  });

  it("preflights every action before allowing any write", async () => {
    const secondAction: FileAction = {
      kind: "update",
      path: "/tmp/omni-apply-project/second.md",
      expectedHash: hashContent("previous"),
      content: "second content",
      contentHash: hashContent("second content"),
    };
    const filePort = createFilePort();
    filePort.read.mockImplementation(async (path: string) =>
      path === action.path ? null : "unexpected local edit",
    );

    const result = await applyPlan(
      filePort,
      readyPlan({ actions: [action, secondAction] }),
      true,
    );

    expect(result).toMatchObject({
      status: "failed",
      completed: [],
      failed: [
        {
          action: secondAction,
          reason: "Expected hash mismatch; refusing to apply the plan.",
        },
      ],
    });
    expect(filePort.apply).not.toHaveBeenCalled();
  });
});
