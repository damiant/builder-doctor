# Design Document: Env Command

## Overview

The `env` command extends the builder-doctor CLI to display all environment variables for diagnostics purposes. It follows the existing command pattern established by `network`, `rules`, and `setup` commands, providing a simple way to inspect environment configuration.

## Architecture

The implementation follows the existing CLI architecture:

```
┌─────────────────┐     ┌─────────────────┐
│   index.ts      │────▶│    env.ts       │
│  (CLI Router)   │     │  (Env Module)   │
└─────────────────┘     └─────────────────┘
```

The `env` command will be implemented as a separate module (`env.ts`) that exports a `runEnv` function, consistent with the `runSetup` pattern in `setup.ts`.

## Components and Interfaces

### EnvOptions Interface

```typescript
interface EnvOptions {
  verbose?: boolean;
}
```

### EnvResult Interface

```typescript
interface EnvResult {
  success: boolean;
  variables: Record<string, string>;
}
```

### runEnv Function

```typescript
function runEnv(options: EnvOptions): EnvResult
```

Retrieves and displays all environment variables, sorted alphabetically.

**Behavior:**
- Returns all environment variables from `process.env`
- Sorts variables alphabetically by name
- Outputs each variable as `NAME=value` format to stdout

### formatEnvOutput Function

```typescript
function formatEnvOutput(variables: Record<string, string>): string
```

Formats environment variables as `NAME=value` pairs, one per line, sorted alphabetically.

## Data Models

### Environment Variable Representation

Environment variables are represented as key-value pairs using TypeScript's `Record<string, string>` type. The source is `process.env` which provides `Record<string, string | undefined>`.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: All variables are returned

*For any* environment, `runEnv` SHALL return all environment variables without filtering any out.

**Validates: Requirements 1.1**

### Property 2: Format output produces valid NAME=value pairs

*For any* set of environment variables, `formatEnvOutput` SHALL produce a string where each line contains exactly one `KEY=value` pair, and parsing the output back should recover the original key-value pairs.

**Validates: Requirements 1.2**

### Property 3: Output is sorted alphabetically

*For any* set of environment variables, the output lines SHALL be sorted alphabetically by variable name.

**Validates: Requirements 1.3**

### Property 4: runEnv always succeeds with valid result

*For any* environment (including empty), `runEnv` SHALL return `success: true` and a `variables` object.

**Validates: Requirements 1.1, 3.3**

## Error Handling

The `env` command has minimal error conditions since it reads from `process.env` which is always available:

- **Empty environment**: If no variables exist, display an informational message and return success
- **Undefined values**: Filter out any undefined values from `process.env` before processing

## Testing Strategy

### Unit Tests
- Verify help text includes `env` command (Requirement 2.1, 2.2)
- Verify CLI routing only runs env when specified (Requirement 3.1)
- Verify env is not included in default "all" behavior (Requirement 3.2)

### Property-Based Tests
Using a property-based testing library (e.g., fast-check for TypeScript):

- **Property 1**: Generate random environments, verify all variables returned
- **Property 2**: Generate random key-value pairs, verify format round-trip
- **Property 3**: Generate random environments, verify alphabetical sorting
- **Property 4**: Generate random environments, verify success result

Each property test should run minimum 100 iterations to ensure coverage across input space.

