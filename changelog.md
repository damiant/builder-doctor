1.0.21
- Added `mcp` command to add or remove the Builder MCP server entry in an agent's MCP configuration file. Supported agents: `claude` (`~/.claude/settings.local.json`), `cursor` (`~/.cursor/mcp.json`), `copilot` (`.vscode/mcp.json`), `code_puppy` (`~/.code_puppy/mcp_servers.json`), or omit the agent to write a local `mcp.json`.

1.0.19
- Added `--agent` option to `install-skill` to control the target folder (e.g. `--agent github` installs to `.github/skills/` instead of `.builder/skills/`)

1.0.17
- install-skill command now supports installing multiple skills in one invocation (e.g. `npx builder-doctor install-skill skill-a skill-b`)

1.0.11
- Updated check for cdn.builder.io

1.0.10
- Added builderio.xyz to checks on network

1.0.9
- Added identitytoolkit.googleapis.com to checks on network

1.0.4
- Find .agent/rules folder as an issue

1.0.3
- Add checks for rules files
- Added ai.builder.io as a check

1.0.2
- Add ping to static ip address 34.136.119.149 as a check
