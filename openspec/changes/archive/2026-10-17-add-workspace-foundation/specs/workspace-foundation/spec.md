## Purpose

Provide a reproducible local development workspace and a minimal accessible web application that later job-search features can extend.

## ADDED Requirements

### Requirement: Reproducible cross-platform setup

The repository SHALL support the documented install, database setup, development, and production-style local run workflows on macOS, Linux, and Windows using Node.js 24 LTS and the repository-pinned pnpm version. Installation SHALL use one committed workspace lockfile and SHALL NOT require an AI account, external database, or hosted service.

#### Scenario: Fresh clone setup

- **WHEN** a contributor follows the documented prerequisites and setup commands on a supported operating system
- **THEN** dependencies install and the local application can start using only the documented local prerequisites
- **AND** the same commands apply on all supported systems without shell-specific substitutions

#### Scenario: Lockfile does not match manifests

- **WHEN** continuous integration performs a frozen installation with inconsistent manifests and lockfile
- **THEN** installation fails instead of silently changing the dependency resolution

### Requirement: Explicit workspace boundaries

The repository SHALL contain the web application at `apps/web` and database workspace at `packages/db`. The application SHALL consume the database workspace through its declared public exports and workspace dependency. Packages SHALL NOT import the application or depend on its private source paths.

#### Scenario: Resolve the database workspace

- **WHEN** the application, type checker, tests, or migration command resolves the database workspace
- **THEN** it resolves the declared local workspace exports without requiring an independently published package or a manually prepared package build

### Requirement: Consistent root commands

The repository SHALL expose documented root commands named `dev`, `build`, `start`, `db:generate`, `db:migrate`, `format`, `format:check`, `lint`, `typecheck`, and `test`. Build SHALL produce the application used by start. Development and start SHALL bind to loopback by default.

#### Scenario: Production-style local run

- **WHEN** the contributor completes database setup, runs `pnpm build`, and then runs `pnpm start`
- **THEN** the built application is served on the local machine without a separate API or worker service
- **AND** it is not exposed on non-loopback interfaces by default

### Requirement: Minimal accessible responsive shell

The application SHALL present a usable empty workspace with semantic page landmarks, a clear page heading, and an explanation that product features are not yet available. Any navigation and controls SHALL lead to implemented behavior, be keyboard accessible, and have accessible names and visible focus. The layout SHALL fit narrow and wide viewports without page-level horizontal scrolling at a 320 CSS pixel viewport width.

#### Scenario: Empty workspace on a narrow screen

- **WHEN** a user opens the root page with no product data on a narrow viewport
- **THEN** the heading and empty-state content remain readable without horizontal scrolling
- **AND** the page does not display fabricated job counts, sample applications, or nonfunctional feature actions

#### Scenario: Recoverable application error

- **WHEN** an unexpected route-rendering error reaches the application error boundary
- **THEN** the user receives an accessible error message and a retry action
- **AND** the page does not expose server stack traces or environment secrets

### Requirement: Server isolation and side-effect-free checks

Database and filesystem access SHALL execute only on the local Node server or explicit local tooling. Browser code SHALL NOT receive server-only modules or private configuration. Importing configuration, building, formatting, linting, and type checking SHALL NOT create or mutate the user's database; tests SHALL use isolated temporary data.

#### Scenario: Build before database setup

- **WHEN** a contributor builds and type-checks a clean checkout with no local data directory
- **THEN** both operations can complete without creating a database or requiring private runtime configuration

#### Scenario: Accidental browser import of database access

- **WHEN** a client component imports a server-only database entry point
- **THEN** the application build rejects the import instead of shipping database access or filesystem configuration to the browser
