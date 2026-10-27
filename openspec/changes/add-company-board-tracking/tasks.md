## Provider identity and workspace coverage

- [x] Add the private source-exported `@job-board/job-boards` workspace, its strict TypeScript configuration and app dependency; wire Next package handling and widen root Vitest discovery so provider source/tests participate in the existing commands.
- [x] Implement the small shared URL-identification contract and Ashby/Lever recognizers, including Lever global/EU hosts, conservative key validation, canonicalization, and safe validation errors without network access or unused snapshot methods.
- [x] Add focused provider tests for accepted examples, canonical equivalence, default ports, retained path case and regional identity, malformed escapes, encoded separators, deep links, credentials, unsafe schemes, and lookalike hosts.

## Local board persistence

- [x] Define the board table, stable internal UUID, source fields, display name, timestamps, nullable archive timestamp, and unique source constraint; generate and review the first product migration through Drizzle Kit without altering applied history.
- [x] Implement feature-owned Drizzle operations for list/create/rename/archive/restore through the existing server-only database entry; keep sources immutable, preserve identities/data, distinguish duplicate constraints from other failures, and make repeated state assignments no-ops.
- [x] Exercise the real production migration and operations in temporary SQLite databases: first migration and replay, reopen persistence, duplicate attempts across active/archived states and competing connections, independent regional/provider identities, rename validation, and archive/restore timestamps and retained UUIDs.

## Validated local API

- [x] Pin compatible TanStack Query 5 and TanStack Form dependencies plus app Zod 4; define feature-local shared input/output/error schemas without server-only imports in browser modules.
- [x] Add Node-runtime `GET`/`POST /api/boards` and `PATCH /api/boards/[id]`, with uncached reads, independent server normalization, strict payload/UUID validation, explicit archive state, stable responses, and actionable local setup failures. Do not expose source replacement or DELETE.
- [x] Guard mutations with JSON content-type and same-origin/loopback host checks before database access; reject malformed requests safely and keep database paths, SQL, and stack traces out of responses.
- [x] Add route/service tests for successful writes, duplicate active/archived responses, explicit restoration, unknown/malformed IDs, rejected origins/hosts and content types, failed writes, and missing-schema errors using real isolated persistence where database behavior is asserted.

## Board management interface

- [x] Add the small Query provider and feature client boundary; implement `/boards` local list loading with separate active/archived views, accurate empty/error/retry states, and confirmed-write cache updates without employer fetches or optimistic state changes.
- [x] Build the add/rename forms with TanStack Form and shared validation, accessible labels/error associations, retained input on failure, pending submission protection, and useful duplicate/archived-record actions.
- [x] Add explicit archive/restore actions and safe canonical source links; connect working navigation from the home page and replace its outdated company-board placeholder copy. Review wrapping, visible focus, keyboard access, and action labels at narrow widths without adding future feature routes or fake job/refresh indicators.
- [x] Add focused DOM interaction tests for keyboard validation/submission, duplicate-to-explicit-restore behavior, and failed mutation recovery while retaining entered values and last confirmed list data; mock only the local HTTP boundary in component tests.

## Verification and contributor guidance

- [x] Document supported root URLs, manual company labels, offline/unverified registration, immutable source identity, duplicate handling, explicit migration setup, and reversible archival in the README; update the roadmap's implementation status only after the feature is implemented.
- [x] Run frozen installation, formatting, lint, type checks, all discovered tests, and a production build with no default database access. Verify the new package stays browser-safe and database imports stay server-only; use only isolated paths for database checks.
- [ ] Verify the expanded checks and real board migration on macOS, Linux, and Windows CI; record any unavailable checks accurately. Do not run browser verification or leave a development server running without separate authorization.

## Verification record

Local verification on macOS, 2026-10-27, with Node.js 24.19.0 and pnpm 10.28.0:

- Frozen dependency installation, Oxfmt, Oxlint, root type checking, and strict OpenSpec validation pass.
- All 132 tests across 10 files pass, including URL recognition, real production migrations, service/route behavior, and seven UI interaction cases.
- Production build passes without warnings and without creating a database or data directory at its isolated configured path. Runtime checkout discovery is excluded from Turbopack asset tracing; its existing path tests pass.
- The actual migration CLI initializes and replays successfully in temporary storage. The user's default database has not been opened or migrated.
- Browser bundle inspection confirms provider URL handling is included without database/filesystem import markers. Source review confirms the server-only database boundary.
- The existing macOS/Linux/Windows CI matrix includes the new package, tests, and production migration. Its execution for these uncommitted changes remains pending; local macOS checks do not establish Linux or Windows verification.
- Browser/visual verification was not authorized or run. No development server was started, and no commit or push was made for this change.

## Commit readiness update

Local verification on 2026-10-27 after the name-suggestion and UI refinements:

- All 116 current tests pass with `pnpm exec vitest run --maxWorkers=2 --testTimeout=15000`; workspace and root TypeScript checks pass without running Next type generation or a build against the existing dev output.
- The implemented capability specs are synced, including the subsequent board-management refinements. Their completed changes are archived separately.
- Cross-platform CI execution remains the only unchecked task. The configured jobs need a pushed commit before Linux and Windows results can be recorded.
