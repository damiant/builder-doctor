#!/usr/bin/env node

import { checkRules } from "./rules";
import { check } from "./network";

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");

async function main() {
  try {
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
      additionalErrorInfo: "This is the Static IP address that Builder.io uses",
      ping: true,
    });

    await checkRules({
      verbose,
    });
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main();
