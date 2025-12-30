# Requirements Document

## Introduction

This feature adds a new `setup` command to the builder-doctor CLI tool. When invoked, the command executes `npx "@builder.io/agent" code` with a specific prompt that reviews the project and provides setup instructions for Builder.io integration. The command runs non-interactively and logs the output to the console.

## Glossary

- **CLI**: Command Line Interface - the builder-doctor tool that users interact with via terminal
- **Setup_Command**: The new `setup` argument that triggers the external agent execution
- **Agent**: The `@builder.io/agent` npm package that analyzes projects and provides guidance
- **Non_Interactive_Mode**: Execution mode where the command runs without requiring user input

## Requirements

### Requirement 1: Setup Command Registration

**User Story:** As a developer, I want to run `builder-doctor setup` so that I can get automated setup instructions for my project.

#### Acceptance Criteria

1. WHEN a user runs `builder-doctor setup` THEN THE CLI SHALL execute the setup command handler
2. WHEN a user runs `builder-doctor --help` THEN THE CLI SHALL display the setup command in the available commands list
3. WHEN the setup command is combined with other commands THEN THE CLI SHALL execute setup independently of other commands

### Requirement 2: External Agent Execution

**User Story:** As a developer, I want the setup command to run the Builder.io agent so that I can receive project-specific setup guidance.

#### Acceptance Criteria

1. WHEN the setup command is invoked THEN THE CLI SHALL execute `npx "@builder.io/agent" code` with the specified prompt
2. THE Setup_Command SHALL pass the prompt parameter: "Review the project and provide the commands to run that will install its dependencies (title it Setup Command). Also review the commands to run that will start the dev server (title it Dev Command). Display this as how to setup at https://builder.io/app/projects"
3. WHEN executing the agent THEN THE CLI SHALL run in Non_Interactive_Mode

### Requirement 3: Output Handling

**User Story:** As a developer, I want to see the agent's output in my terminal so that I can follow the setup instructions.

#### Acceptance Criteria

1. WHEN the agent produces output THEN THE CLI SHALL log the output to the console
2. WHEN the agent command completes successfully THEN THE CLI SHALL exit normally
3. IF the agent command fails THEN THE CLI SHALL display an error message and exit with a non-zero status code

### Requirement 4: Process Execution

**User Story:** As a developer, I want the setup command to run reliably so that I can trust the output.

#### Acceptance Criteria

1. THE Setup_Command SHALL spawn the npx process as a child process
2. WHEN the child process produces stdout THEN THE CLI SHALL stream it to the console
3. WHEN the child process produces stderr THEN THE CLI SHALL stream it to the console
4. THE Setup_Command SHALL wait for the child process to complete before exiting
