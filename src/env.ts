export interface EnvOptions {
  verbose?: boolean;
}

export interface EnvResult {
  success: boolean;
  variables: Record<string, string>;
}

/**
 * Formats environment variables as NAME=value pairs, one per line, sorted alphabetically.
 */
export function formatEnvOutput(variables: Record<string, string>): string {
  const sortedKeys = Object.keys(variables).sort();
  return sortedKeys.map((key) => `${key}=${variables[key]}`).join("\n");
}

/**
 * Retrieves and displays all environment variables, sorted alphabetically.
 */
export function runEnv(options: EnvOptions = {}): EnvResult {
  const variables: Record<string, string> = {};

  // Read all environment variables, filtering out undefined values
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) {
      variables[key] = value;
    }
  }

  if (options.verbose) {
    console.log(`Found ${Object.keys(variables).length} environment variables`);
  }

  // Format and print to stdout
  const output = formatEnvOutput(variables);
  if (output) {
    console.log(output);
  }

  return { success: true, variables };
}
