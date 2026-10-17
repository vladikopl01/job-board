## Context

The repository contains an agreed [stack](../../tech-stack.md), [architecture](../../architecture.md), and [roadmap](../../roadmap.md), but no application code or dependency manifests. See [proposal.md](proposal.md) for motivation and scope. This is the first implementation proposal; creating it does not execute its tasks.

The application runs as a persistent local Node.js server on macOS, Linux, and Windows. There is no existing database schema or deployed data to migrate.

## Goals / Non-Goals

**Goals:** Make a fresh clone installable, runnable, and checkable; establish the server/database boundary and a migration workflow; keep the foundation small enough that feature changes can extend it without replacing it.

**Non-Goals:** Do not introduce product tables, feed adapters, task scheduling, AI execution, application packages, account infrastructure, a separate worker, or speculative shared packages. Do not preinstall unused form, query, or URL-state integrations just to mirror the full stack document. These remain agreed choices for their consuming features.

## Decisions

### Two workspaces, source exports, no build orchestrator

Use a private root package, `pnpm-workspace.yaml`, and one committed `pnpm-lock.yaml`. Start with:

```text
apps/web/              @job-board/web: Next.js app and server composition
packages/db/           @job-board/db: connection, paths, schema, migrations, tests
```

Declare the database dependency with `workspace:*` and explicit package exports. Export TypeScript source to Next.js and Vitest; use Next's workspace transpilation configuration if needed. Do not add an independent package bundler, published-package workflow, Turborepo, or Nx for two workspaces. Packages do not import `apps/web`, and imports do not reach through private package paths.

A root TypeScript base configuration serves the two workspaces; each owns its environment-specific settings. Use strict checking and type-only imports. Directly executed database tooling uses erasable TypeScript and explicit file extensions compatible with [Node's built-in type stripping](https://nodejs.org/docs/latest-v24.x/api/typescript.html), avoiding a separate script runner. `tsc --noEmit` remains the type checker.

Pin a compatible pnpm release in `packageManager`, a Node 24 version in the runtime-version file and CI, and compatible exact dependency versions in manifests and the lockfile during implementation. Declare the supported Node major in `engines`. Verify compatibility before selecting patches rather than copying untested version numbers into this proposal. Commit the version-appropriate [pnpm build-script allowlist](https://pnpm.io/cli/approve-builds) needed by trusted native dependencies; do not enable arbitrary dependency scripts or change global pnpm configuration.

### Framework-owned app build and a minimal shell

Use Next.js 16 App Router with React 19 and Turbopack, not a parallel Vite app build. Use Tailwind CSS 4, system fonts, and locally owned shadcn/ui components based on Base UI where a component is actually needed. Use Lucide for any needed icons; do not import an unused component catalogue or icon library into the page.

The root page contains semantic landmarks, a heading, and an honest empty-workspace message. Add only working navigation and controls. Keep spacing, focus states, labels, and layout usable from 320 CSS pixels upwards. Provide an accessible route error boundary with retry; use loading UI only for actual asynchronous work, without artificial delays or simulated data. A meaningful component interaction, such as the error boundary's retry, can exercise the DOM test setup without testing static markup for its own sake.

Default development and production-style local commands bind to `127.0.0.1`. Responsive layouts support different local browser sizes; network hosting and authentication are outside this foundation.

Database composition in the app lives behind an explicit `server-only` entry point. The reusable database package remains usable by Node tooling and Vitest; do not put a Next-only import in a shared entry point that would break those consumers. Keep better-sqlite3 native loading in Node, outside browser bundles, and use the pinned Next version's native-module externalization support. Opening a database must be lazy, not an import or build side effect. A server-only composition module does not require adding a public database-status endpoint.

### One local path policy for application and tooling

Default to `<workspace-root>/.data/job-board.sqlite`. The only initial override is `JOB_BOARD_DATA_DIR`, supplied in the process environment for both app and tooling. Resolve a relative override against the workspace root; reject an explicitly empty value. Do not invent a second database URL or app-specific override.

Use a small shared resolver with Node path APIs. For documented commands launched from the repository root or either workspace, find the enclosing `pnpm-workspace.yaml`; do not assume the current directory is the root or derive it from a compiled `.next` file's location. Fail clearly when the workspace cannot be identified. Document that an override must reach both processes; an app-only Next environment file does not configure the database CLI. No custom environment-file loader is needed for the default setup.

Create parent directories recursively only when initializing/accessing the database. Ignore `.data`, SQLite files and their sidecars, private environment files, build output, coverage, and caches in Git and relevant tools. Keep migration source and configuration examples tracked. CI and tests supply their own temporary paths; neither uses the default user data root.

### Drizzle owns schema evolution; initialization stays non-destructive

`packages/db` owns the Drizzle schema entry point, committed migration directory, Drizzle Kit configuration, and a small explicit migration entry point. Use Drizzle for schema, queries, and transactions. Driver connection configuration is not a reason to add handwritten schema SQL.

The connection factory opens better-sqlite3 and configures foreign keys, WAL mode, and a finite busy timeout (start with 5 seconds). It returns the Drizzle handle with explicit connection cleanup for tooling/tests. Close a newly opened native handle if configuration fails. Keep transactions short. The app can reuse a lazy process-local connection across requests and development reloads; avoid an unbounded connection per request or a singleton accidentally shared across different test paths.

Use [Drizzle Kit generation](https://orm.drizzle.team/docs/drizzle-kit-generate) to produce reviewable migrations when real schema changes exist. `db:migrate` resolves the shared path, creates/opens the database, and uses Drizzle's better-sqlite3 migrator for committed migrations. Close its connection when done. Application requests do not apply migrations; there is no `push`, reset, or delete-and-recreate fallback in setup.

There are no domain tables in this change. Before the first generated migration exists, setup creates the SQLite file and treats the absent/valid empty migration history as a successful no-op. An existing database with applied migrations is not an initial empty-history case: absent source history must fail. Once history exists, validate it through the pinned Drizzle migration format and surface missing, malformed, or incomplete files as errors. Do not catch every migration error and reinterpret it as an empty schema. Do not add a dummy table, empty SQL migration, or custom production migration ledger just to make initialization appear useful.

Pin and check the actual Drizzle version's empty-history behavior during implementation. This determines a small bootstrap guard, not a different persistence architecture. Exercise non-empty migrations using a checked-in, Drizzle-generated **test fixture** and the same migration runner. The fixture is never a production migration. Verify replay, preservation of existing fixture data, and failure reporting with real temporary SQLite files.

### Root commands are the contributor interface

Use pnpm workspace commands and Node APIs rather than POSIX-only shell utilities or inline shell environment assignments.

| Command | Contract |
| --- | --- |
| `pnpm install` | Install the pinned workspace graph; CI uses `--frozen-lockfile`. |
| `pnpm dev` | Start the app's local development server on loopback. |
| `pnpm build` | Build the Next.js app, including consumed package source, without database access. |
| `pnpm start` | Serve the built app locally on loopback. |
| `pnpm db:generate` | Generate migrations from the database package schema for review. |
| `pnpm db:migrate` | Initialize the selected local database and apply pending committed migrations. |
| `pnpm format` / `pnpm format:check` | Write formatting / report formatting differences using Oxfmt. |
| `pnpm lint` | Run the explicitly configured Oxlint rules without fixing files. |
| `pnpm typecheck` | Generate Next route types, then run `tsc --noEmit` for both workspaces and relevant tool/test configuration. |
| `pnpm test` | Run Vitest once; return the suite's exit code. |

Type checking prepares route types with [`next typegen`](https://nextjs.org/docs/app/api-reference/cli/next#next-typegen-options), so it works before `dev` or `build`. Do not use `tsx` as a type checker or add a second compiler. Document prerequisites, clone/install/migrate/dev, build/start, data paths, native-install troubleshooting, and check commands in the root README. No AI setup is part of getting started.

### Focused Oxc and Vitest configuration

Use root Oxfmt and Oxlint configuration with scoped overrides as needed. Explicitly select supported TypeScript, React, Next.js, accessibility, and Vitest rules; verify names and coverage against the pinned [Oxlint configuration](https://oxc.rs/docs/guide/usage/linter/config). Do not assume the default rules provide framework coverage. Include tool/test source and exclude generated files, local data, and caches without excluding an entire workspace. Avoid adding ESLint, Prettier, or deprecated `next lint` scripts alongside Oxc.

Use Vitest with Vite for test transformation, Node for database tests, and jsdom/React Testing Library for meaningful client interactions. Do not attempt to render asynchronous Server Components in the component suite. Keep one small configuration, using test projects only if distinct environments require them. Do not add browser automation or run browser verification under this change without the user's separate agreement.

Focused database tests cover path consistency/overrides, first setup, migration replay and failure, retained data, connection constraints, bounded contention, and explicit cleanup. Use unique temporary directories and close all native handles before cleanup, including failure paths on Windows. Build and type checking cover the package-consumption boundary; review the app's import graph and explicit server-only guard rather than writing tests that duplicate Next.js internals.

### One cross-platform CI matrix

Run GitHub Actions for pull requests and pushes on macOS, Linux, and Windows, using Node 24 and the repository-pinned pnpm release. On each system perform a frozen install, checks, tests, temporary database setup/migration replay, and a production build. The SQLite integration suite must actually load the native module; do not replace it with mocks or skip it on a failing OS.

Set CI's data override using workflow environment configuration and a runner temporary directory. Do not rely on development data, run an agent, fetch job feeds, or require secrets. Reuse dependency caches without relying on generated app types or a database from a previous job. Do not add a persistent preview server or deployment workflow.

## Risks / Trade-offs

- Native SQLite binaries or install-script policies can differ across systems → pin compatible versions, allow only necessary trusted builds, and require all three CI jobs to exercise the native driver.
- Source exports work only with compatible consumers → verify Next, Vitest, Drizzle tooling, and Node entry points; keep exports explicit and avoid a package build pipeline until a real consumer needs it.
- Database paths can drift with working directories → share the root/path resolver and test root and workspace invocations, relative overrides, and paths containing spaces.
- Empty migration histories vary across Drizzle versions → verify the pinned format and narrowly handle the pre-schema case while rejecting invalid existing history.
- Oxc rule coverage may differ from older ESLint guidance → explicitly configure available rules and document material coverage gaps rather than silently claiming equivalence.

These are implementation verification items. No dependency installation, runtime validation, or cross-platform CI execution has been completed by creating this proposal.

## Migration Plan

Implement workspace metadata and commands, then the shell and database tooling, followed by quality configuration and CI. There is no existing application schema to transform. Keep implementation tasks unchecked until their actual checks pass.

For a fresh clone, install dependencies, run `db:migrate`, and start development; production-style local use runs `build` before `start`. Future feature changes add domain schema and generated migrations. Reverting source/tooling changes must leave the local data directory intact; this change introduces no automatic database rollback or reset command.
