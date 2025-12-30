#!/usr/bin/env node

import { checkRules } from "./rules";
import { check } from "./network";
import { runSetup } from "./setup";
import { runEnv } from "./env";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
builder-doctor - A CLI tool for Builder.io diagnostics

Usage: builder-doctor [options] [commands]

Commands:
  network     Check connectivity to Builder.io services
  rules       Check Builder.io rules configuration
  setup       Run Builder.io agent to analyze project and provide setup instructions
  env         Display all environment variables sorted alphabetically

Options:
  --verbose   Show detailed output for each check
  --help, -h  Show this help message

Examples:
  builder-doctor              Run all checks
  builder-doctor network      Run only network checks
  builder-doctor rules        Run only rules checks
  builder-doctor setup        Get project setup instructions from Builder.io agent
  builder-doctor env          Display environment variables
  builder-doctor --verbose    Run all checks with detailed output
`);
  process.exit(0);
}

const verbose = args.includes("--verbose");
const rules = args.includes("rules");
const network = args.includes("network");
const setup = args.includes("setup");
const env = args.includes("env");
const all = !rules && !network && !setup && !env;

async function main() {
  try {
    if (all || network) {
      console.log(`Checking connectivity to Builder.io services...`);

      await check({
        host: "firestore.googleapis.com",
        url: "https://firestore.googleapis.com/",
        verbose,
        expectedStatus: 404,
        expectedContent: "<span id=logo aria-label=Google>",
      });

      await check({
        host: "firebasestorage.googleapis.com",
        url: "https://firebasestorage.googleapis.com/",
        verbose,
        expectedStatus: 404,
        expectedContent: "<span id=logo aria-label=Google>",
      });

      await check({
        host: "builder.io",
        url: "https://www.builder.io/",
        verbose,
        expectedStatus: 200,
        expectedContent: "<body>",
      });

      await check({
        host: "builder.io app",
        url: "https://builder.io/content",
        verbose,
        expectedStatus: 200,
        expectedContent: "<body>",
      });

      await check({
        host: "cdn.builder.io",
        url: "https://cdn.builder.io/static/media/builder-logo.bff0faae.png",
        verbose,
        expectedStatus: 200,
        expectedHeader: "content-type",
        expectedHeaderValue: "image/png",
      });

      await check({
        host: "*.builder.codes",
        url: "https://stuff.builder.codes/",
        verbose,
        expectedStatus: 404,
        expectedHeader: "server",
        expectedHeaderValue: "Google Frontend",
      });

      await check({
        host: "*.builder.my",
        url: "https://www.builder.my/",
        verbose,
        expectedStatus: 200,
        expectedHeader: "x-powered-by",
        expectedHeaderValue: "Next.js",
      });

      await check({
        host: "*.fly.dev",
        url: "https://status.flyio.net/",
        verbose,
        expectedStatus: 200,
        message: " (Unknown status)",
      });

      await check({
        host: "ai.builder.io",
        url: "https://ai.builder.io/",
        verbose,
        expectedStatus: 200,
      });

      await check({
        host: "34.136.119.149",
        verbose,
        message: " (ping)",
        additionalErrorInfo:
          "This is the Static IP address that Builder.io uses",
        ping: true,
      });
    }

    if (all || rules) {
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
