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

