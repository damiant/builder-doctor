# builder-doctor

A CLI tool for Builder.io diagnostics.

## Installation

```bash
npm install -g builder-doctor
```

Or run directly with npx:

```bash
npx builder-doctor
```

## Usage

```bash
builder-doctor [options] [commands]
```

### Options

- `--verbose` - Show detailed output for each check
- `--source <owner/repo>` - Override the install source repository for `install-skill`, `skills`, and `install-plugin`
- `BUILDER_SKILLS_SOURCE=<owner/repo>` - Environment variable to set the default source repository (overridden by `--source`)
- `--help, -h` - Show help message

### Running Default Checks

Running without any command will execute both network and rules checks:

```bash
npx builder-doctor
npx builder-doctor --verbose  # with detailed output
```

### Displaying Help

To view the help message:

```bash
npx builder-doctor help
npx builder-doctor --help
npx builder-doctor -h
```

## Commands

### network

Check connectivity to Builder.io services.

```bash
npx builder-doctor network
```

The tool performs diagnostic checks for valid HTTP or ping responses to test network connectivity to:

- firestore.googleapis.com
- firebasestorage.googleapis.com
- identitytoolkit.googleapis.com
- builder.io (Website)
- api.builder.io
- builder.io (Web application)
- cdn.builder.io (Content Network)
- *.builder.codes
- *.builder.my
- builderio.xyz (Cloud Containers)
- 34.136.119.149 (Static IP address used by Builder.io)

The tool cannot verify connectivity to (but you should):
- *.fly.dev

### rules

Analyze your Builder.io rules configuration.

```bash
npx builder-doctor rules
```

The tool analyzes your `.builderrules`, `agents.md`, and rules in `.builder/rules` or `.cursor/rules`. Recommendations are made to:

- Find where there are too many rules being applied at once causing the AI to ignore some rules
- Detect SKILL.md files in incorrect locations (should be in `.builder/skills`)
- Detect AGENTS.md and CLAUDE.md files with conflicting content
- Common missing front matter like `description` where needed
- Overuse of `alwaysApply`
- Rule files with incorrect extensions (should be `.mdc` instead of `.md`, except for `RULE.md`)
- Common incorrect namings of `agents.md` and `.builderrules` (including `.builderrule` and `.builderules`)

### setup

Run the Builder.io agent to analyze your project and provide setup instructions.

```bash
npx builder-doctor setup
```

This command uses the Builder.io agent to review your project and provide:
- Setup commands to install dependencies
- Dev commands to start the development server

The output is brief and formatted for easy reading.

### env

Display all environment variables sorted alphabetically.

```bash
npx builder-doctor env
npx builder-doctor env --verbose  # shows count of variables
```

Outputs all environment variables in `NAME=value` format, one per line, sorted alphabetically. Useful for debugging environment configuration issues.

### install-skill

Install a skill from `https://github.com/BuilderIO/builder-agent-skills` into `.builder/skills/<skill-name>`.

```bash
npx builder-doctor install-skill skill-creator
```

If files already exist for that skill, they are overwritten.

### skills

List available skills from `https://github.com/BuilderIO/builder-agent-skills`.

```bash
npx builder-doctor skills
```

Only folders that contain a `SKILL.md` file are included in the output.

### install-plugin

Install a plugin from `https://github.com/BuilderIO/builder-agent-plugins`.

```bash
npx builder-doctor install-plugin my-plugin
```

Plugin contents are extracted into the `.builder` root (for example: `skills`, `agents`, `rules`, etc).

## Examples

```bash
builder-doctor                  # Run network and rules checks
builder-doctor network          # Run only network checks
builder-doctor rules            # Run only rules checks
builder-doctor setup            # Get project setup instructions
builder-doctor env              # Display environment variables
builder-doctor install-skill skill-creator                       # Install a skill into .builder/skills
builder-doctor install-skill skill-creator --source myorg/myrepo # Install a skill from a custom source
builder-doctor skills                                            # List available skills (requires SKILL.md)
builder-doctor skills --source myorg/myrepo                      # List available skills from a custom source
BUILDER_SKILLS_SOURCE=myorg/myrepo builder-doctor skills         # Use env var as the default source
builder-doctor install-plugin my-plugin                          # Install a plugin into .builder
builder-doctor install-plugin my-plugin --source myorg/myrepo    # Install a plugin from a custom source
builder-doctor --verbose                                         # Run all checks with detailed output
```