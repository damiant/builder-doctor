#!/usr/bin/env node

import { checkRules } from "./rules";
import { runSetup } from "./setup";
import { runEnv } from "./env";
import { runNetwork } from "./network";
import { listAvailableSkills, runInstallSkill } from "./install-skill";
import {
  buildNonInteractiveMessage,
  formatSkillInstallLines,
} from "./non-interactive-message";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const rules = args.includes("rules");
const network = args.includes("network");
const setup = args.includes("setup");
const env = args.includes("env");
const skills = args.includes("skills");
const showHelp =
  args.includes("--help") || args.includes("-h") || args.includes("help");
const installSkill = args[0] === "install-skill";
const installSkillName = installSkill ? args[1] : undefined;
const all =
  !rules && !network && !setup && !env && !skills && !showHelp && !installSkill;
const nonInteractive = !process.stdin.isTTY || !process.stdout.isTTY;

if (showHelp) {
  console.log(`
builder-doctor - A CLI tool for Builder.io diagnostics

Usage: builder-doctor [options] [commands]

Commands:
  network     Check connectivity to Builder.io services
  rules       Check Builder.io rules configuration
  setup       Run Builder.io agent to analyze project and provide setup instructions
  env         Display all environment variables sorted alphabetically
  skills      List installable skills from BuilderIO/builder-agent-skills
  install-skill <skill-name>  Install a skill from BuilderIO/builder-agent-skills
  help        Show this help message

Options:
  --verbose   Show detailed output for each check
  --help, -h  Show this help message

Examples:
  builder-doctor              Run rules and network checks
  builder-doctor help         Show this help message
  builder-doctor network      Run only network checks
  builder-doctor rules        Run only rules checks
  builder-doctor setup        Get project setup instructions from Builder.io agent
  builder-doctor env          Display environment variables
  builder-doctor skills       List all available skills and descriptions
  builder-doctor install-skill skill-creator  Install a skill into .builder/skills
  builder-doctor --verbose    Run rules and network checks with detailed output
`);
  process.exit(0);
}

async function main() {
  try {
    if (nonInteractive && args.length === 0) {
      const skillsList = await listAvailableSkills({ verbose });
      console.log(buildNonInteractiveMessage(skillsList));
      return;
    }

    if (skills) {
      const skillsList = await listAvailableSkills({ verbose });
      console.log(formatSkillInstallLines(skillsList));
      return;
    }

    if (network || all) {
      await runNetwork({ verbose });
    }

    if (rules || all) {
      await checkRules({
        verbose,
      });
    }

    if (setup) {
      const result = await runSetup({ verbose });
      if (!result.success) {
        process.exit(result.exitCode);
      }
    }

    if (env) {
      runEnv({ verbose });
    }

    if (installSkill) {
      if (!installSkillName) {
        console.error(
          "Missing skill name. Usage: builder-doctor install-skill <skill-name>",
        );
        process.exit(1);
      }

      await runInstallSkill({
        skillName: installSkillName,
        verbose,
      });
    }
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

main();
