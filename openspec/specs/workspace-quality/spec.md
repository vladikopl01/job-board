# Workspace Quality Specification

## Purpose

Give contributors fast, independent quality checks and reproducible evidence that the local workspace works across its supported operating systems.

## Requirements

### Requirement: Independent diagnostic commands

Formatting, linting, type checking, and tests SHALL have separate root commands covering the relevant files in both workspaces. `format:check`, `lint`, `typecheck`, and `test` SHALL report failures with nonzero exit codes without rewriting source. `format` SHALL be the explicit formatting write command. Generated output, local data, dependencies, and tool caches SHALL be excluded from source checks.

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

### Requirement: Explicit lint coverage

Linting SHALL explicitly enable supported TypeScript, React, Next.js, accessibility, and test checks in their relevant files. Implementation documentation SHALL identify any required checks unavailable in the pinned linter rather than claiming unsupported rule coverage.

#### Scenario: Applicable configured rule is violated

- **WHEN** a source file violates an enabled framework, accessibility, or test rule applicable to that file
- **THEN** `pnpm lint` identifies the file and rule and exits unsuccessfully

### Requirement: Deterministic isolated tests

`pnpm test` SHALL execute the checked-in suite once and terminate. Database tests SHALL use real SQLite in unique temporary directories with the production connection and migration paths. They SHALL close handles and clean up their own files, and SHALL NOT read or mutate the user's database. Component tests SHALL support DOM-based interaction checks. Routine tests SHALL NOT require public feeds, AI credentials, or other external services.

#### Scenario: Run tests while local user data exists

- **WHEN** the suite runs in a checkout with an existing local database
- **THEN** the suite uses isolated test databases and leaves the user's data unchanged
- **AND** its database assertions exercise the actual connection and migration behavior rather than a mocked SQL implementation

#### Scenario: Test failure in automation

- **WHEN** a checked-in test fails
- **THEN** `pnpm test` exits nonzero without remaining in interactive watch mode

### Requirement: Cross-platform continuous integration

GitHub Actions SHALL validate clean installations on macOS, Linux, and Windows using the pinned package manager and Node.js 24. Each operating-system job SHALL verify native SQLite loading, isolated database setup and migrations, quality checks, tests, and an application production build. Automated database commands SHALL target temporary data directories. CI SHALL NOT require AI or application secrets.

#### Scenario: Successful platform job

- **WHEN** a clean operating-system job completes successfully
- **THEN** its frozen install, native database checks, migration checks, formatting, linting, type checking, tests, and production build have all succeeded

#### Scenario: Native SQLite installation fails on one system

- **WHEN** the native driver cannot install or load on a supported operating system
- **THEN** that job fails rather than skipping database checks or marking the platform supported
