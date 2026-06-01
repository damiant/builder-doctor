import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

const AUTH_COMMAND = "npx";
const AUTH_ARGS = ["--yes", "@builder.io/dev-tools@latest", "auth"];
const AUTH_STATUS_ARGS = [...AUTH_ARGS, "status"];
const NOT_AUTHENTICATED_MARKER = "Not Authenticated to Builder.io";

export async function promptForAuth(verbose: boolean): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return;
  }

  console.log("Checking Builder.io Authentication....");
  const status = await getAuthStatus(verbose);

  if (!status.includes(NOT_AUTHENTICATED_MARKER)) {
    console.log("Builder.io authenticated.");
    if (status.trim()) {
      console.log(status.trimEnd());
    }
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer: string;
  try {
    answer = (await rl.question("Authenticate with Builder.io? (Y/n) ")).trim();
  } finally {
    rl.close();
  }

  if (answer.toLowerCase() === "n" || answer.toLowerCase() === "no") {
    return;
  }

  await runAuth(verbose);
}

function getAuthStatus(verbose: boolean): Promise<string> {
  return new Promise((resolve) => {
    if (verbose) {
      console.log(`Executing: ${AUTH_COMMAND} ${AUTH_STATUS_ARGS.join(" ")}`);
    }

    const child = spawn(AUTH_COMMAND, AUTH_STATUS_ARGS, { shell: true });

    let output = "";
    child.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });

    child.on("error", (error) => {
      console.error(`Failed to check authentication status: ${error.message}`);
      if (error.message.includes("ENOENT")) {
        console.error(
          "npx/npm is required but was not found. Please ensure Node.js and npm are installed."
        );
      }
      resolve(output);
    });

    child.on("close", () => {
      resolve(output);
    });
  });
}

function runAuth(verbose: boolean): Promise<void> {
  return new Promise((resolve) => {
    if (verbose) {
      console.log(`Executing: ${AUTH_COMMAND} ${AUTH_ARGS.join(" ")}`);
    }

    const child = spawn(AUTH_COMMAND, AUTH_ARGS, {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      console.error(`Failed to start authentication process: ${error.message}`);
      if (error.message.includes("ENOENT")) {
        console.error(
          "npx/npm is required but was not found. Please ensure Node.js and npm are installed."
        );
      }
      resolve();
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0) {
        console.error(`Authentication command exited with code ${exitCode}`);
      }
      resolve();
    });
  });
}
