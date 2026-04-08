import type { SkillSummary } from "./install-skill";

export function formatSkillInstallLines(skillsList: SkillSummary[]): string {
  return skillsList
    .map(
      ({ name, description }) =>
        `${name}\n` +
        "=".repeat(name.length) +
        `\n` +
        `${description}\n` +
        `Install with \`npx builder-doctor install-skill ${name}\`\n`,
    )
    .join("\n");
}

export function buildNonInteractiveMessage(skillsList: SkillSummary[]): string {
  const skillInstallLines = formatSkillInstallLines(skillsList);

  return (
    "Ask the user (using AskUserQuestion) whether they would like to install one of these skills or review rules for issues. " +
    "If a skill is chosen, run the corresponding install command below. If review rules is chosen, run npx builder-doctor rules.\n\n" +
    "Available skills:\n" +
    skillInstallLines
  );
}
