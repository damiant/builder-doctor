# Implementation Plan: Env Command

## Overview

Implement the `env` command for builder-doctor CLI that displays all environment variables sorted alphabetically in `NAME=value` format.

## Tasks

- [x] 1. Create env module with core functionality
  - [x] 1.1 Create `src/env.ts` with `EnvOptions` and `EnvResult` interfaces
    - Define interfaces matching the design document
    - _Requirements: 1.1_
  - [x] 1.2 Implement `formatEnvOutput` function
    - Format variables as `NAME=value` pairs, one per line
    - Sort alphabetically by variable name
    - _Requirements: 1.2, 1.3_
  - [x] 1.3 Implement `runEnv` function
    - Read all environment variables from `process.env`
    - Filter out undefined values
    - Call `formatEnvOutput` and print to stdout
    - Return success result
    - _Requirements: 1.1, 3.3_

- [x] 2. Integrate env command into CLI
  - [x] 2.1 Update `src/index.ts` to import and wire up env command
    - Add import for `runEnv` from `./env`
    - Add `env` argument detection
    - Update `all` check to exclude env command
    - Call `runEnv` when env argument is present
    - _Requirements: 3.1, 3.2_
  - [x] 2.2 Update help text to include env command
    - Add `env` to the Commands section
    - Add description explaining the command displays environment variables
    - Add example usage
    - _Requirements: 2.1, 2.2_

- [x] 3. Checkpoint - Verify implementation
  - Ensure the CLI builds successfully with `npm run build`
  - Manually test `builder-doctor env` command
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- The implementation follows the existing pattern from `setup.ts`
- No external dependencies required - uses built-in `process.env`
- Property-based tests can be added later if needed
