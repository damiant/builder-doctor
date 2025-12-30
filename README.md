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
- `--help, -h` - Show help message

### Running All Checks

Running without any command will execute both network and rules checks:

```bash
npx builder-doctor
npx builder-doctor --verbose  # with detailed output
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
- builder.io
- ai.builder.io
- builder.io app
- cdn.builder.io
- *.builder.codes
- *.builder.my
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
- Common missing front matter like `description` where needed
- Overuse of `alwaysApply`
- Common incorrect namings of `agents.md` and `.builderrules`

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

## Examples

```bash
builder-doctor                  # Run network and rules checks
builder-doctor network          # Run only network checks
builder-doctor rules            # Run only rules checks
builder-doctor setup            # Get project setup instructions
builder-doctor env              # Display environment variables
builder-doctor --verbose        # Run all checks with detailed output
```

