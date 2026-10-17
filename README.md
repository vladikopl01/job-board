# Job board

A local job-search workspace. The foundation currently provides a responsive empty workspace, local SQLite setup, and contributor tooling. Company boards, indexing, notifications, and application assistance are planned in [OpenSpec](openspec/roadmap.md).

## Run locally

Install Node.js **24.19.0** (also recorded in `.nvmrc`) and pnpm **10.28.0**. With that Node version active, you can install pnpm using:

```sh
npm install --global pnpm@10.28.0
```

Clone this repository with Git and open a terminal in its root. The following commands are the same on macOS, Linux, and Windows:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Development and production-style local start bind to loopback by default. No agent, credentials, or external database is required.

For a production-style local run, stop the development server, then run:

```sh
pnpm build
pnpm start
```

## Workspace

| Path          | Responsibility                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web`    | Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui with Base UI, and local server composition. |
| `packages/db` | SQLite/better-sqlite3 connection, Drizzle schema, migration tooling, and isolated database tests.      |
| `openspec`    | Agreed stack, architecture, roadmap, and feature changes.                                              |

The app consumes `@job-board/db` through workspace exports. Packages expose TypeScript source without a separate package build. Database code in the app goes through `src/server/database.ts`, whose server-only guard keeps it out of client components. The connection is lazy; importing modules, generating types, and building the app do not create a database.

Turbopack builds the app. Vite serves Vitest's test transformations. Form, query, URL-state, AI, provider, and document packages will be introduced with the features that use them.

## Local data and migrations

The default file is `<repository-root>/.data/job-board.sqlite`. SQLite uses foreign keys, WAL journaling, and a five-second busy timeout. Local data, SQLite sidecars, private environment files, and build output are gitignored.

To choose another directory, set **`JOB_BOARD_DATA_DIR` in the process environment** before running both the app and database commands. Absolute paths are preserved; relative paths resolve against the repository root, including paths containing spaces. An app-only Next `.env` file does not configure the database CLI. Empty or unusable overrides fail instead of silently selecting another file.

Run commands from the repository root or a workspace directory so the shared resolver can find `pnpm-workspace.yaml`. The data directory must be writable and support SQLite's local file locking.

The initial schema has no product tables. `pnpm db:migrate` creates the local database and handles the empty initial migration history. Future feature changes define their tables in `packages/db/src/schema.ts`, then generate and review migrations:

```sh
pnpm db:generate
pnpm db:migrate
```

Commit the generated SQL and metadata in `packages/db/drizzle`. Do not edit applied migrations: setup checks their history and hashes. Schema migrations run only through the explicit command; requests and builds do not apply them. Setup does not reset or replace an existing database on failure. Restore missing migration source and resolve the reported error before retrying.

`packages/db/test/fixtures` contains a separate generated schema and migrations for tests. They are never applied to the application database. To regenerate the fixture after intentionally changing its schema, run `pnpm --filter @job-board/db exec drizzle-kit generate --config test/fixtures/drizzle.config.ts` and review the result.

## Quality checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use `pnpm format` to write Oxfmt formatting changes. The other diagnostic commands leave source unchanged. `typecheck` generates Next route types before running `tsc --noEmit`, so it works on a clean checkout. `test` runs once and exits.

Oxlint explicitly enables supported TypeScript, React, Next.js, accessibility, and Vitest checks. It uses the configured native rules, without ESLint compatibility or additional type-aware lint plugins. Type checking remains a separate command; linting and DOM tests do not provide visual accessibility verification.

Tests use real native SQLite connections in unique temporary directories, close handles before cleanup, and exercise migration replay, rollback, retained data, path configuration, foreign keys, and bounded contention. The retry interaction uses React Testing Library with jsdom. Tests do not need job feeds, an agent, or the user's database.

[GitHub Actions](.github/workflows/ci.yml) repeats installation, quality checks, native database tests/setup, and the production build on macOS, Linux, and Windows. Cross-platform support is confirmed only when the matrix passes; creating the workflow does not execute it.

## Native SQLite installation

Use the pinned Node and pnpm versions before installing. The repository allows install scripts only for better-sqlite3, esbuild, and sharp. Do not enable all dependency scripts globally.

better-sqlite3 uses a prebuilt binary where available and otherwise builds locally. A source build needs Python and a C++ toolchain: Xcode Command Line Tools on macOS, compiler/make tools on Linux, or Visual Studio Build Tools with C++ support on Windows. See [node-gyp's platform prerequisites](https://github.com/nodejs/node-gyp#installation).

After changing Node versions, reinstall/rebuild the native dependency with the selected runtime (`pnpm rebuild better-sqlite3`). Cache permission errors concern the package manager/native build cache; choose a writable cache or fix its permissions, rather than changing the application's data path or deleting its database.

## Planning

Read the [technology stack](openspec/tech-stack.md), [architecture](openspec/architecture.md), and [roadmap](openspec/roadmap.md). The [archived workspace-foundation change](openspec/changes/archive/2026-10-17-add-workspace-foundation/proposal.md) defines this implementation's scope. Later features should use separate OpenSpec changes.
