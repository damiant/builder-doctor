#!/usr/bin/env node

import { checkRules } from "./rules";
import { runSetup } from "./setup";
import { runEnv } from "./env";
import { runNetwork } from "./network";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const rules = args.includes("rules");
const network = args.includes("network");
const setup = args.includes("setup");
const env = args.includes("env");
const showHelp = args.includes("--help") || args.includes("-h") || args.includes("help");
const all = !rules && !network && !setup && !env && !showHelp;

if (showHelp) {
  console.log(`
builder-doctor - A CLI tool for Builder.io diagnostics

Usage: builder-doctor [options] [commands]

Commands:
  network     Check connectivity to Builder.io services
  rules       Check Builder.io rules configuration
  setup       Run Builder.io agent to analyze project and provide setup instructions
  env         Display all environment variables sorted alphabetically
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
  builder-doctor --verbose    Run rules and network checks with detailed output
`);
  process.exit(0);
}



async function main() {
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
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
