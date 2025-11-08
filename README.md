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

or for additional details (like responses and headers):
```bash
npx builder-doctor --verbose
```

## Network checks

```bash
npx builder-doctor network
```
The tool performs the following diagnostic checks for a valid http or ping response as a way to test network connectivity to:
- firestore.googleapis.com
- firebasestorage.googleapis.com
- builder.io
- ai.builder.io
- builder.io app
- cdn.builder.io
- *.builder.codes
- *.builder.my
- 34.136.119.149

The tool cannot verify connectivity to (but you should):
- *.fly.dev

## Rules checks

```bash
npx builder-doctor rules
```
The tool analyses your .builderrules, agents.md and rules in .builder/rules or .cursor/rules. Recommendations are made to:
- Find where there are too many rules being applied at once causing the AI to ignore some rules.
- Common missing front matter like `description` where needed
- Overuse of `alwaysApply`
- Common incorrect namings of agents.md and .builderrules

## ToDo
- Verify if frontmatter like alwaysApply is respected without reference in agents.md
- Verify if globs is respected without reference
- Verify if rules are found from current working directory or root of project

