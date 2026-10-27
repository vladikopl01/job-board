## MODIFIED Requirements

### Requirement: Independent diagnostic commands

Formatting, linting, type checking, and tests SHALL have separate root commands covering the relevant files in all workspaces, including provider source and tests. `format:check`, `lint`, `typecheck`, and `test` SHALL report failures with nonzero exit codes without rewriting source. `format` SHALL be the explicit formatting write command. Generated output, local data, dependencies, and tool caches SHALL be excluded from source checks.

#### Scenario: Incorrectly formatted supported source

- **WHEN** `pnpm format:check` finds a formatting violation in a workspace source file
- **THEN** it exits nonzero and identifies the affected file without changing it

#### Scenario: Type error in either workspace

- **WHEN** `pnpm typecheck` encounters an application or database-package type error
- **THEN** it exits nonzero even if formatting, linting, or tests would otherwise pass

#### Scenario: Generated route types on a clean checkout

- **WHEN** type checking runs before any development server or application build
- **THEN** the command prepares the framework's generated types as needed and checks the application and database workspace successfully
- **AND** it does not require a pre-existing local database

#### Scenario: Type error in the provider workspace

- **WHEN** `pnpm typecheck` encounters a type error in the job-board provider workspace
- **THEN** the root command exits nonzero even if application and database types pass

#### Scenario: Provider contract test fails

- **WHEN** a checked-in URL identity test in the provider workspace fails
- **THEN** `pnpm test` discovers that test and exits nonzero
- **AND** the test does not need a live employer feed
