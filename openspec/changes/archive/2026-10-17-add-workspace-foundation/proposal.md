## Why

The agreed stack and roadmap exist, but the repository has no runnable application or reproducible development workflow. Establish a small, cross-platform foundation so subsequent product changes can use a working Next.js app, local database, and shared quality checks.

## What Changes

- Create a private pnpm workspace with `apps/web` and `packages/db`, a pinned package manager, a committed lockfile, and Node.js 24 LTS support.
- Add a strict TypeScript Next.js 16 App Router application using React 19, Turbopack, Tailwind CSS 4, and the agreed shadcn/ui Base UI and Lucide conventions. Provide a minimal, accessible, responsive shell without placeholder product features.
- Establish the server-only SQLite/better-sqlite3 and Drizzle boundary, a configurable local data directory, safe database initialization, and committed migration workflows. Leave product tables to their feature changes.
- Configure Oxfmt, Oxlint, `tsc --noEmit`, Vitest/Vite, React Testing Library, and temporary SQLite integration tests.
- Provide documented root commands for install, database setup, development, checks, and production-style local execution; validate them in GitHub Actions on macOS, Linux, and Windows.

This proposal authorizes a future implementation of the foundation only. Creating these planning artifacts does not implement it. Board tracking, ingestion, refresh tasks, discovery, AI, documents, and application tracking remain separate changes. Introduce their packages and dependencies when used rather than scaffolding them now.

## Capabilities

### New Capabilities

- `workspace-foundation`: Reproducible pnpm/Node setup, workspace boundaries, root commands, and a minimal local web application shell.
- `local-database-foundation`: Consistent local paths, server-only SQLite access, safe initialization, and Drizzle migration behavior.
- `workspace-quality`: Independent formatting, lint, type, and test commands with cross-platform continuous integration.

### Modified Capabilities

None. There are no implemented capability specs yet; the existing planning baseline remains the source of the agreed direction.

## Impact

- Adds root workspace/tool configuration, contributor setup documentation, `apps/web`, `packages/db`, and GitHub Actions workflows during implementation.
- Introduces the dependencies needed by these two workspaces only. TanStack Query/Form, nuqs, AI SDK, document generation, and provider integrations retain their agreed places in the stack but need no unused setup in this change.
- Creates a local SQLite file and its sidecar files only through explicit database setup or runtime database access. Source, builds, formatting, type checking, and ordinary tests must not mutate the user's database.
- Requires validating better-sqlite3 installation and migration execution on all supported systems before claiming the foundation ready. No external database, agent credentials, separate worker, or build orchestrator is required.

See the agreed [stack](../../../tech-stack.md), [architecture](../../../architecture.md), and [workspace foundation roadmap](../../../roadmap.md#workspace-foundation).
