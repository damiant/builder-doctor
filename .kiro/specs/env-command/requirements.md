# Requirements Document

## Introduction

This feature adds an `env` command to the builder-doctor CLI tool that outputs environment variable names and values. This is useful for diagnostics and troubleshooting Builder.io configuration issues by displaying relevant environment settings.

## Glossary

- **CLI**: Command Line Interface - the builder-doctor tool
- **Environment_Variable**: A key-value pair stored in the operating system's environment
- **Env_Command**: The new command that displays environment variables

## Requirements

### Requirement 1: Display Environment Variables

**User Story:** As a developer, I want to run an `env` command, so that I can see environment variable names and values for diagnostics purposes.

#### Acceptance Criteria

1. WHEN a user runs `builder-doctor env` THEN THE CLI SHALL display all environment variable names and their values
2. WHEN displaying environment variables THEN THE CLI SHALL format output as `NAME=value` pairs, one per line
3. WHEN the env command runs THEN THE CLI SHALL sort variables alphabetically by name for consistent output

### Requirement 2: Help Documentation

**User Story:** As a developer, I want the `env` command to be documented in the help output, so that I can discover and understand how to use it.

#### Acceptance Criteria

1. WHEN a user runs `builder-doctor --help` THEN THE CLI SHALL include the `env` command in the commands list
2. WHEN displaying help THEN THE CLI SHALL show a description for the `env` command explaining its purpose

### Requirement 3: Command Integration

**User Story:** As a developer, I want the `env` command to work consistently with other CLI commands, so that I have a predictable experience.

#### Acceptance Criteria

1. WHEN the `env` command is specified THEN THE CLI SHALL only run the env command and not other checks
2. WHEN no command is specified THEN THE CLI SHALL NOT include env output in the default "all checks" behavior
3. WHEN the env command completes THEN THE CLI SHALL exit with code 0 on success
