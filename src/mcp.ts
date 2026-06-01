import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { promptForAuth } from "./auth";

export type McpAction = "add" | "remove";

export interface McpOptions {
  action: McpAction;
  agent?: string;
  verbose?: boolean;
}

const SERVER_KEY = "builder-mcp";
const SERVER_COMMAND = "npx";
const SERVER_ARGS = ["@builder.io/dev-tools@latest", "mcp"];

interface McpTarget {
  agentLabel: string;
  filePath: string;
  containerKey: "mcpServers" | "servers" | "mcp_servers";
  serverEntry: Record<string, unknown>;
}

export async function runMcp(options: McpOptions): Promise<void> {
  const { action, agent, verbose = false } = options;

  const targets = resolveTargets(agent);

  for (const target of targets) {
    if (verbose) {
      console.log(
        `${action === "add" ? "Adding" : "Removing"} ${SERVER_KEY} ${
          action === "add" ? "to" : "from"
        } ${target.filePath}`
      );
    }

    if (action === "add") {
      addServer(target);
    } else {
      removeServer(target);
    }
  }

  if (action === "add") {
    await promptForAuth(verbose);
  }
}

function resolveTargets(agent: string | undefined): McpTarget[] {
  const standardEntry = {
    command: SERVER_COMMAND,
    args: [...SERVER_ARGS],
  };

  const stdioEntry = {
    type: "stdio",
    command: SERVER_COMMAND,
    args: [...SERVER_ARGS],
  };

  if (!agent) {
    return [
      {
        agentLabel: "local",
        filePath: path.join(process.cwd(), "mcp.json"),
        containerKey: "mcpServers",
        serverEntry: standardEntry,
      },
    ];
  }

  switch (agent) {
    case "claude":
      return [
        {
          agentLabel: "Claude",
          filePath: path.join(homedir(), ".claude", "settings.local.json"),
          containerKey: "mcpServers",
          serverEntry: standardEntry,
        },
      ];
    case "cursor":
      return [
        {
          agentLabel: "Cursor",
          filePath: path.join(homedir(), ".cursor", "mcp.json"),
          containerKey: "mcpServers",
          serverEntry: standardEntry,
        },
      ];
    case "copilot":
      return [
        {
          agentLabel: "Copilot",
          filePath: path.join(process.cwd(), ".vscode", "mcp.json"),
          containerKey: "servers",
          serverEntry: { ...stdioEntry },
        },
      ];
    case "code_puppy":
      return [
        {
          agentLabel: "Code Puppy",
          filePath: path.join(homedir(), ".code_puppy", "mcp_servers.json"),
          containerKey: "mcp_servers",
          serverEntry: {
            ...stdioEntry,
            enabled: true,
          },
        },
      ];
    case "wibey":
      return [
        {
          agentLabel: "Wibey",
          filePath: path.join(homedir(), ".wibey", "mcp.json"),
          containerKey: "servers",
          serverEntry: { ...stdioEntry },
        },
        {
          agentLabel: "Wibey",
          filePath: path.join(homedir(), ".vscode", "mcp.json"),
          containerKey: "servers",
          serverEntry: { ...stdioEntry },
        },
      ];
    default:
      throw new Error(
        `Unknown MCP agent "${agent}". Supported: claude, cursor, copilot, code_puppy, wibey, or omit for a local mcp.json.`
      );
  }
}

function addServer(target: McpTarget): void {
  const config = readJsonFile(target.filePath);

  const existingContainer = config[target.containerKey];
  const container =
    existingContainer && typeof existingContainer === "object" && !Array.isArray(existingContainer)
      ? (existingContainer as Record<string, unknown>)
      : {};

  container[SERVER_KEY] = target.serverEntry;
  config[target.containerKey] = container;

  writeJsonFile(target.filePath, config);

  console.log(
    `MCP support added for Builder to ${target.agentLabel} in ${target.filePath}`
  );
}

function removeServer(target: McpTarget): void {
  if (!existsSync(target.filePath)) {
    console.log(
      `No MCP configuration found for ${target.agentLabel} at ${target.filePath}`
    );
    return;
  }

  const config = readJsonFile(target.filePath);
  const container = config[target.containerKey];

  if (
    !container ||
    typeof container !== "object" ||
    Array.isArray(container) ||
    !(SERVER_KEY in (container as Record<string, unknown>))
  ) {
    console.log(
      `MCP support for Builder was not present in ${target.filePath}`
    );
    return;
  }

  delete (container as Record<string, unknown>)[SERVER_KEY];
  writeJsonFile(target.filePath, config);

  console.log(
    `MCP support removed for Builder from ${target.agentLabel} in ${target.filePath}`
  );
}

function readJsonFile(filePath: string): Record<string, unknown> {
  if (!existsSync(filePath)) {
    return {};
  }

  const raw = readFileSync(filePath, "utf8").trim();
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    throw new Error(`Expected a JSON object in ${filePath}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse JSON in ${filePath}: ${message}`);
  }
}

function writeJsonFile(filePath: string, data: Record<string, unknown>): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}
