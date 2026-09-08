import { describe, expect, it } from "vitest";

import { resolveCursorSkillTarget } from "../../src/adapters/harness/cursor";

describe("Cursor harness adapter", () => {
  it("projects a skill into the project-local Cursor skill root", () => {
    expect(resolveCursorSkillTarget("/tmp/omni-project", "unslop")).toBe(
      "/tmp/omni-project/.cursor/skills/unslop/SKILL.md",
    );
  });

  it("rejects a non-absolute project root", () => {
    expect(() => resolveCursorSkillTarget("relative/project", "unslop")).toThrow(
      "Project root must be absolute.",
    );
  });

  it.each(["", "../outside", "skills/unslop", "unslop\\nested"])(
    "rejects unsafe skill id %s",
    (skillId) => {
      expect(() => resolveCursorSkillTarget("/tmp/omni-project", skillId)).toThrow(
        "Skill id must be a single safe path segment.",
      );
    },
  );
});
