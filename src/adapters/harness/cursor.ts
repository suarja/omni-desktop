import { isAbsolute, join } from "node:path";

import type { HarnessAdapter } from "../../ports";

const SAFE_SKILL_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

export function resolveCursorSkillTarget(
  projectRoot: string,
  skillId: string,
): string {
  if (!isAbsolute(projectRoot)) {
    throw new Error("Project root must be absolute.");
  }
  if (!SAFE_SKILL_ID.test(skillId) || skillId === "." || skillId === "..") {
    throw new Error("Skill id must be a single safe path segment.");
  }

  return join(projectRoot, ".cursor", "skills", skillId, "SKILL.md");
}

export const cursorHarnessAdapter: HarnessAdapter = {
  resolveSkillTarget: resolveCursorSkillTarget,
};
