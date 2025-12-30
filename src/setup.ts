import { spawn } from "child_process";

export interface SetupOptions {
  verbose?: boolean;
}

export interface SetupResult {
  success: boolean;
  exitCode: number;
}

const SETUP_CONFIG = {
  command: "npx",
  args: [
    "@builder.io/agent",
    "code",
    '--prompt="Review the project and provide the commands to run that will install its dependencies (title it Setup Command). Also review the commands to run that will start the dev server (title it Dev Command). Display this as how to setup at https://builder.io/app/projects"',
  ],
};

export async function runSetup(options: SetupOptions = {}): Promise<SetupResult> {
  return new Promise((resolve) => {
    const { command, args } = SETUP_CONFIG;

    if (options.verbose) {
      console.log(`Executing: ${command} ${args.join(" ")}`);
    }

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
    });

    child.on("error", (error) => {
      console.error(`Failed to start setup process: ${error.message}`);
      if (error.message.includes("ENOENT")) {
        console.error("npx/npm is required but was not found. Please ensure Node.js and npm are installed.");
      }
      resolve({ success: false, exitCode: 1 });
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0) {
        console.error(`Setup command exited with code ${exitCode}`);
      }
      resolve({ success: exitCode === 0, exitCode });
    });
  });
}
