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

## Development

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Test locally:

```bash
node dist/index.js
```

## Publishing to npm

1. Make sure you're logged in to npm:
   ```bash
   npm login
   ```

2. Publish the package:
   ```bash
   npm publish
   ```

After publishing, users can run:
```bash
npx builder-doctor
```
