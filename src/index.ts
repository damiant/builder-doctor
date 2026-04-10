#!/usr/bin/env node

import { checkRules } from "./rules";
import { runSetup } from "./setup";
import { runEnv } from "./env";
import { runNetwork } from "./network";
import { runInstallPlugin, runInstallSkill } from "./install";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const rules = args.includes("rules");
const network = args.includes("network");
const setup = args.includes("setup");
const env = args.includes("env");
const showHelp =
  args.includes("--help") || args.includes("-h") || args.includes("help");
const installSkill = args[0] === "install-skill";
const installSkillName = installSkill ? args[1] : undefined;
const installPlugin = args[0] === "install-plugin";
const installPluginName = installPlugin ? args[1] : undefined;
const source = getOptionValue("--source");
const all =
  !rules &&
  !network &&
  !setup &&
  !env &&
  !showHelp &&
  !installSkill &&
  !installPlugin;
const nonInteractive = !process.stdin.isTTY || !process.stdout.isTTY;
const nonInteractiveMessage =
  `Ask the user (using AskUserQuestion) whether they would like to 1. Install the skill creator 2. Install a skill, 3. Install a plugin, 4. Review rules for issues. ` +
  `If 1 is chosen then run npx builder-doctor install-skill skill-creator, ` +
  `if 2 is chosen then ask the user to enter the skill they would like to install and then run npx builder-doctor install-skill <skill-name>, ` +
  `if 3 is chosen then ask the user to enter the plugin they would like to install and then run npx builder-doctor install-plugin <plugin-name>, ` +
  `If 4 is chosen then run npx builder-doctor rules`;

if (showHelp) {
  console.log(`
builder-doctor - A CLI tool for Builder.io diagnostics

Usage: builder-doctor [options] [commands]

Commands:
  network     Check connectivity to Builder.io services
  rules       Check Builder.io rules configuration
  setup       Run Builder.io agent to analyze project and provide setup instructions
  env         Display all environment variables sorted alphabetically
  install-skill <skill-name>    Install a skill from BuilderIO/builder-agent-skills
  install-plugin <plugin-name>  Install a plugin from BuilderIO/builder-agent-plugins
  help                           Show this help message

Options:
  --verbose            Show detailed output for each check
  --source <owner/repo>  Override skill/plugin source repository (GitHub owner/repository)
  --help, -h           Show this help message

Examples:
  builder-doctor              Run rules and network checks
  builder-doctor help         Show this help message
  builder-doctor network      Run only network checks
  builder-doctor rules        Run only rules checks
  builder-doctor setup        Get project setup instructions from Builder.io agent
  builder-doctor env          Display environment variables
  builder-doctor install-skill skill-creator                           Install a skill into .builder/skills
  builder-doctor install-skill skill-creator --source damiant/builder-vpp  Install a skill from a custom source
  builder-doctor install-plugin my-plugin                              Install a plugin into .builder
  builder-doctor install-plugin my-plugin --source damiant/builder-vpp      Install a plugin from a custom source
  builder-doctor --verbose                                             Run rules and network checks with detailed output
`);
  process.exit(0);
}

async function main() {
  if (nonInteractive && args.length === 0) {
    console.log(nonInteractiveMessage);
    return;
  }

  try {
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
        source,
        verbose,
      });
    }

    if (installPlugin) {
      if (!installPluginName) {
        console.error(
          "Missing plugin name. Usage: builder-doctor install-plugin <plugin-name>",
        );
        process.exit(1);
      }

      await runInstallPlugin({
        pluginName: installPluginName,
        source,
        verbose,
      });
    }
  } catch (error) {
    console.error("An error occurred:", error);
    process.exit(1);
  }
}

main();

function getOptionValue(optionName: string): string | undefined {
  const optionIndex = args.indexOf(optionName);
  if (optionIndex === -1) {
    return undefined;
  }

  const optionValue = args[optionIndex + 1];
  if (!optionValue || optionValue.startsWith("--")) {
    throw new Error(`Missing value for ${optionName}. Usage: ${optionName} <owner/repo>`);
  }

  return optionValue;
}
