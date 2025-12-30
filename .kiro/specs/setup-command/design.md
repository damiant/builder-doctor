# Design Document: Setup Command

## Overview

The setup command extends the builder-doctor CLI with a new `setup` argument that executes the Builder.io agent to analyze the current project and provide setup instructions. The implementation leverages Node.js child process spawning to run the npx command non-interactively and stream output to the console.

## Architecture

The feature follows the existing CLI architecture pattern:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│   CLI Parser    │────▶│  Setup Handler   │────▶│  Child Process      │
│  (index.ts)     │     │  (setup.ts)      │     │  (npx agent)        │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                               │                          │
                               │                          │
                               ▼                          ▼
                        ┌──────────────────┐     ┌─────────────────────┐
                        │  Console Output  │◀────│  stdout/stderr      │
                        └──────────────────┘     └─────────────────────┘
```

## Components and Interfaces

### Setup Module (src/setup.ts)

A new module responsible for executing the Builder.io agent command.

```typescript
interface SetupOptions {
  verbose?: boolean;
}

interface SetupResult {
  success: boolean;
  exitCode: number;
}

function runSetup(options: SetupOptions): Promise<SetupResult>;
```

### CLI Integration (src/index.ts)

Modifications to the main entry point:
- Add `setup` to argument parsing
- Add `setup` to help text
- Call `runSetup()` when setup argument is present

## Data Models

### Setup Configuration

```typescript
const SETUP_CONFIG = {
  command: 'npx',
  args: [
    '@builder.io/agent',
    'code',
    '--prompt="Review the project and provide the commands to run that will install its dependencies (title it Setup Command). Also review the commands to run that will start the dev server (title it Dev Command). Display this as how to setup at https://builder.io/app/projects"'
  ]
};
```

### Process Spawn Options

```typescript
const spawnOptions: SpawnOptions = {
  stdio: 'inherit',  // Stream output directly to console
  shell: true        // Required for npx on some platforms
};
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Command Construction Consistency

*For any* invocation of the setup command, the spawned process SHALL always use the command `npx` with arguments `["@builder.io/agent", "code", "--prompt=..."]` where the prompt contains the exact specified text.

**Validates: Requirements 2.1, 2.2**

### Property 2: Non-Interactive Spawn Configuration

*For any* setup command execution, the spawn configuration SHALL specify options that prevent interactive input (shell: true, stdio configured for output only).

**Validates: Requirements 2.3, 4.1**

### Property 3: Output Streaming Configuration

*For any* setup command execution, the stdio configuration SHALL be set to stream both stdout and stderr to the console (either via 'inherit' or explicit piping).

**Validates: Requirements 3.1, 4.2, 4.3**

### Property 4: Exit Code Propagation

*For any* child process exit code, the setup result SHALL reflect success (true) when exit code is 0, and failure (false) with the actual exit code when non-zero.

**Validates: Requirements 3.2, 3.3**

### Property 5: Async Completion Guarantee

*For any* setup command execution, the returned promise SHALL only resolve after the child process has fully terminated.

**Validates: Requirements 4.4**

## Error Handling

| Error Condition | Handling Strategy |
|-----------------|-------------------|
| npx not found | Display error message indicating npx/npm is required |
| Agent package not found | Let npx handle the error, stream output to console |
| Process spawn failure | Catch error, log message, return failure result |
| Non-zero exit code | Return failure result with exit code |
| Process timeout | Not implemented (agent handles its own timeout) |

## Testing Strategy

### Unit Tests
- Verify help text includes setup command
- Verify argument parsing recognizes 'setup'
- Verify spawn is called with correct arguments (mocked)

### Property-Based Tests
Given the nature of this feature (external process execution), property-based testing is limited. The properties above are best verified through:
- Configuration inspection tests (verify spawn options)
- Integration tests with mocked child process

### Integration Tests
- End-to-end test running actual setup command (manual verification)
- Verify output streaming works correctly

### Test Framework
Use Node.js built-in test runner or Jest for unit tests. Property tests are not strongly applicable here due to the external process nature of the feature - the "properties" are more about configuration correctness than algorithmic behavior.
