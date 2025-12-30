# Implementation Plan: Setup Command

## Overview

This plan implements the `setup` command for builder-doctor CLI. The implementation creates a new setup module and integrates it with the existing CLI argument parser.

## Tasks

- [x] 1. Create setup module
  - [x] 1.1 Create `src/setup.ts` with `runSetup()` function
    - Import `spawn` from `child_process`
    - Define the command configuration with npx and agent arguments
    - Implement promise-based spawn execution
    - Configure stdio to inherit for console output
    - Return success/failure result with exit code
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 4.4_

  - [x] 1.2 Add error handling to setup module
    - Handle spawn errors (e.g., npx not found)
    - Handle non-zero exit codes
    - Log appropriate error messages
    - _Requirements: 3.2, 3.3_

- [x] 2. Integrate setup command into CLI
  - [x] 2.1 Update `src/index.ts` to import and use setup module
    - Add import for `runSetup` from setup module
    - Add `setup` argument detection
    - Call `runSetup()` when setup argument is present
    - _Requirements: 1.1, 1.3_

  - [x] 2.2 Update help text to include setup command
    - Add setup to the Commands section
    - Add description explaining what setup does
    - Add example usage
    - _Requirements: 1.2_

- [x] 3. Checkpoint - Verify implementation
  - Ensure the CLI builds without errors
  - Manually test `builder-doctor setup` command
  - Verify help text displays correctly
  - Ask the user if questions arise

## Notes

- This feature primarily involves external process execution, so automated testing is limited
- Manual verification is recommended for the full integration
- The implementation uses `stdio: 'inherit'` for simplest output streaming
