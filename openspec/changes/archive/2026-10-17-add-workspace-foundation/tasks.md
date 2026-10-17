## Workspace and runtime

- [x] Pin compatible Node.js 24, pnpm, and required dependency versions; create the private root manifest, workspace configuration, and single lockfile, including the narrow native-build allowlist required by the chosen pnpm version.
- [x] Create `@job-board/web` at `apps/web` and `@job-board/db` at `packages/db`; declare `workspace:*` consumption and explicit source exports without adding unused workspaces or a package build pipeline.
- [x] Add strict root/workspace TypeScript configurations that cover source, tests, and tooling, with settings appropriate for Next.js and directly executed Node database tooling.

## Local web shell

- [x] Establish the Next.js 16/React 19 App Router app, Turbopack build, Tailwind CSS 4, and minimal shadcn/ui Base UI conventions; create the responsive semantic empty-workspace page and only the components/icons it uses.
- [x] Add an accessible error boundary with retry and review narrow-screen layout, keyboard behavior, labels, and focus styles; do not add placeholder feature routes or simulate asynchronous work.
- [x] Wire database composition through a lazy server-only app entry point and configure native-module handling; confirm the app consumes the declared workspace exports without database access during type generation or builds.
- [x] Expose cross-platform root `dev`, `build`, and `start` commands with loopback defaults and no separate worker or API process.

## Local persistence

- [x] Implement the shared workspace/data-path resolver for the default `.data/job-board.sqlite` and `JOB_BOARD_DATA_DIR`, covering root/workspace invocations, relative and absolute overrides, spaces, and invalid explicit configuration.
- [x] Add the better-sqlite3/Drizzle connection factory with foreign keys, WAL, a bounded busy timeout, lazy app reuse, and explicit cleanup for tools/tests; preserve existing data on failure.
- [x] Add the empty schema entry point, Drizzle Kit configuration, `db:generate`, and explicit `db:migrate` command. Verify the pinned Drizzle format, support first setup with no domain migrations, reject invalid or missing existing history, and avoid automatic schema push/reset or runtime migration.
- [x] Add Git/tool ignores for local data, SQLite sidecars, private environment files, generated app types/builds, caches, and coverage while retaining schema/migration source and safe configuration examples.

## Quality checks and focused tests

- [x] Configure Oxfmt and Oxlint plus root `format`, `format:check`, and `lint` commands; explicitly enable supported TypeScript, React, Next.js, accessibility, and Vitest coverage and document material gaps.
- [x] Add `typecheck` using Next route-type generation followed by `tsc --noEmit` across both workspaces and relevant configuration; verify it works without a prior app build or database.
- [x] Configure Vitest/Vite for Node and jsdom/React Testing Library, with a non-watch root `test` command and one meaningful error-boundary retry interaction test.
- [x] Add temporary SQLite helpers and a Drizzle-generated test-only migration fixture. Test path resolution, empty initialization, repeat migration/data preservation, missing or failing history, foreign keys, bounded write contention, and handle cleanup; never use the user's default database or live services.

## Contributor workflow and CI

- [x] Document prerequisites and the clone/install/migrate/dev and build/start workflows in the root README, plus process-environment data configuration, quality commands, and native-install troubleshooting for all three systems. No AI setup is required.
- [x] Add GitHub Actions jobs for macOS, Linux, and Windows with pinned Node/pnpm, frozen installation, all quality commands, real native SQLite/migration tests, temporary-path database setup/replay, and production builds; fail on unsupported native installation rather than skipping checks.
- [x] Run the local checks and a production build from a clean generated-output state, verify database commands use isolated paths and are repeatable, and review package/server boundaries. Record any checks that cannot run locally; cross-platform support remains unverified until all three CI jobs pass. Do not start browser verification or leave a development server running without user authorization.

## Implementation verification

Completed on macOS arm64 with Node.js 24.19.0 and pnpm 10.28.0 on 2026-10-17:

- Frozen dependency installation succeeded. Writable temporary package/native build caches were used within the sandbox; global configuration was not changed.
- `pnpm format:check`, `pnpm lint`, and `pnpm typecheck` passed. Type checking regenerated Next types after removing generated types and incremental state, without an existing database.
- `pnpm test` passed all 21 tests across five files, including keyboard retry, real native SQLite, pending migration replay, rollback, changed or out-of-order history rejection, retained data, and bounded contention.
- `pnpm db:generate` confirmed an empty product schema. Root `pnpm db:migrate` succeeded twice in an isolated temporary directory with spaces; tests also exercised direct CLI invocation from root and app directories.
- `pnpm build` passed using Turbopack. A temporary server-component probe also built against the native workspace exports without creating data, and a client-import probe correctly failed on `server-only`. Probe source was removed.
- The lazy app connection reused its handle and passed explicit close/garbage-collection checks with better-sqlite3 13.0.3. An older driver tried during implementation exhibited a native cleanup crash and was replaced before final verification.
- Git ignores exclude local SQLite/sidecar files, private environment files, and generated outputs while retaining migration source and `.env.example`. The default `.data` directory was never created.

The build immediately following the intentionally failing client-import probe encountered a Turbopack cache panic. Clean server-probe and final application builds passed after removing the generated output.

Not run: browser/visual verification, live development/start sessions, or the GitHub Actions matrix. Narrow-screen layout and focus styles were reviewed in source; the retry interaction was tested in jsdom. Linux and Windows behavior, and clean hosted macOS installation, remain unverified until the three CI jobs pass. No development server was left running and no default or user database was accessed.

Publishing follow-up: the [first hosted CI run](https://github.com/vladikopl01/job-board/actions/runs/39034122105) passed on Linux and macOS. Windows failed before application checks because pnpm 10.28.0's bundled node-gyp 11.5 could not detect Visual Studio 2026 on `windows-latest`. The matrix now uses `windows-2022` with Visual Studio 2022; its complete checks must pass before Windows support is confirmed.
