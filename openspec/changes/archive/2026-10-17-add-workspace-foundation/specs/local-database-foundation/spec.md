## Purpose

Establish safe, predictable local persistence and migration behavior without introducing product-domain tables before their features are implemented.

## ADDED Requirements

### Requirement: Stable configurable data location

The system SHALL default to `<workspace-root>/.data/job-board.sqlite`. `JOB_BOARD_DATA_DIR` SHALL override the data directory: absolute paths remain absolute and relative paths resolve against the workspace root. Application execution and database tooling SHALL resolve the same location when invoked from the repository root or either workspace directory. Invalid explicitly supplied configuration SHALL fail clearly instead of falling back to another database.

#### Scenario: Default path from different entry points

- **WHEN** the application and root database command are run without an override
- **THEN** both resolve the same database under the workspace's `.data` directory
- **AND** neither places data inside application source, migration source, or build output

#### Scenario: Explicit path with spaces

- **WHEN** the user configures a valid absolute or workspace-relative data directory containing spaces
- **THEN** application access and database tooling use that directory on every supported operating system

#### Scenario: Invalid configured path

- **WHEN** the explicitly configured data directory is empty, unusable, or cannot be created or written
- **THEN** database setup or access fails with an actionable local error
- **AND** no alternative database is silently created

### Requirement: Non-destructive database initialization

Explicit database setup or runtime database access SHALL create the data directory and SQLite file when absent. Opening an existing database SHALL preserve its content. Failed initialization SHALL report the error and release resources it opened; it SHALL NOT delete, replace, or reset an existing database.

#### Scenario: First setup without a domain schema

- **WHEN** a user runs `pnpm db:migrate` on a fresh clone before any product migrations exist
- **THEN** the command creates a usable local SQLite database and succeeds with no domain tables

#### Scenario: Repeated setup

- **WHEN** database setup runs again against an existing valid database
- **THEN** existing content remains intact and already applied migrations are not reapplied

#### Scenario: Existing database cannot be opened

- **WHEN** database access encounters a corrupt file, permission failure, or incompatible local database
- **THEN** access fails clearly and preserves the existing file for user-directed recovery
- **AND** no automatic reset or replacement occurs

### Requirement: Reviewed forward migrations

Schema changes SHALL be generated into committed, reviewable migrations. `pnpm db:migrate` SHALL apply pending migrations in order, record successful application, and exit unsuccessfully on a migration failure. A missing initial migration history SHALL be a valid no-op before any domain schema exists; malformed or incomplete existing migration history SHALL be an error. Application imports, builds, and ordinary requests SHALL NOT generate or automatically apply schema migrations.

#### Scenario: Apply a pending migration once

- **WHEN** a committed pending migration is applied to an initialized test database and the command is run again
- **THEN** the migration's changes are present and the second run leaves the data unchanged

#### Scenario: Migration execution fails

- **WHEN** a pending migration fails
- **THEN** the command exits nonzero, reports which migration failed, and does not report that migration or later migrations as successfully applied
- **AND** it does not reset the database or invoke an alternative schema-push operation

### Requirement: Connection safety

Each database connection SHALL enforce foreign keys, use WAL journaling, and have a finite busy timeout. Lock contention that outlasts that timeout SHALL return an error rather than waiting indefinitely. Explicitly closed connections SHALL release native handles so temporary files can be removed on supported systems.

#### Scenario: Invalid relational write

- **WHEN** a test schema has an enforced foreign key and a write refers to a nonexistent parent
- **THEN** the database rejects the write

#### Scenario: Conflicting write holds a lock

- **WHEN** a second connection cannot acquire a write lock within the configured timeout
- **THEN** it fails with a bounded database error
- **AND** the first connection's committed data remains intact

### Requirement: Local data stays outside version control

The default data directory, SQLite files and sidecar files, generated build output, and private environment files SHALL be excluded from version control. Schema definitions, migration history, and non-secret configuration examples SHALL remain tracked.

#### Scenario: Database setup in a checkout

- **WHEN** a contributor initializes the default database
- **THEN** the database and its WAL/SHM files do not appear as files eligible for a normal Git add
- **AND** committed migration source remains eligible for version control
