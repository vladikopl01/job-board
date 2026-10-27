## Provider identity and workspace coverage

- [ ] Add the private source-exported `@job-board/job-boards` workspace, its strict TypeScript configuration and app dependency; wire Next package handling and widen root Vitest discovery so provider source/tests participate in the existing commands.
- [ ] Implement the small shared URL-identification contract and Ashby/Lever recognizers, including Lever global/EU hosts, conservative key validation, canonicalization, and safe validation errors without network access or unused snapshot methods.
- [ ] Add focused provider tests for accepted examples, canonical equivalence, default ports, retained path case and regional identity, malformed escapes, encoded separators, deep links, credentials, unsafe schemes, and lookalike hosts.

## Local board persistence

- [ ] Define the board table, stable internal UUID, source fields, display name, timestamps, nullable archive timestamp, and unique source constraint; generate and review the first product migration through Drizzle Kit without altering applied history.
- [ ] Implement feature-owned Drizzle operations for list/create/rename/archive/restore through the existing server-only database entry; keep sources immutable, preserve identities/data, distinguish duplicate constraints from other failures, and make repeated state assignments no-ops.
- [ ] Exercise the real production migration and operations in temporary SQLite databases: first migration and replay, reopen persistence, duplicate attempts across active/archived states and competing connections, independent regional/provider identities, rename validation, and archive/restore timestamps and retained UUIDs.

## Validated local API

- [ ] Pin compatible TanStack Query 5 and TanStack Form dependencies plus app Zod 4; define feature-local shared input/output/error schemas without server-only imports in browser modules.
- [ ] Add Node-runtime `GET`/`POST /api/boards` and `PATCH /api/boards/[id]`, with uncached reads, independent server normalization, strict payload/UUID validation, explicit archive state, stable responses, and actionable local setup failures. Do not expose source replacement or DELETE.
- [ ] Guard mutations with JSON content-type and same-origin/loopback host checks before database access; reject malformed requests safely and keep database paths, SQL, and stack traces out of responses.
- [ ] Add route/service tests for successful writes, duplicate active/archived responses, explicit restoration, unknown/malformed IDs, rejected origins/hosts and content types, failed writes, and missing-schema errors using real isolated persistence where database behavior is asserted.

## Board management interface

- [ ] Add the small Query provider and feature client boundary; implement `/boards` local list loading with separate active/archived views, accurate empty/error/retry states, and confirmed-write cache updates without employer fetches or optimistic state changes.
- [ ] Build the add/rename forms with TanStack Form and shared validation, accessible labels/error associations, retained input on failure, pending submission protection, and useful duplicate/archived-record actions.
- [ ] Add explicit archive/restore actions and safe canonical source links; connect working navigation from the home page and replace its outdated company-board placeholder copy. Review wrapping, visible focus, keyboard access, and action labels at narrow widths without adding future feature routes or fake job/refresh indicators.
- [ ] Add focused DOM interaction tests for keyboard validation/submission, duplicate-to-explicit-restore behavior, and failed mutation recovery while retaining entered values and last confirmed list data; mock only the local HTTP boundary in component tests.

## Verification and contributor guidance

- [ ] Document supported root URLs, manual company labels, offline/unverified registration, immutable source identity, duplicate handling, explicit migration setup, and reversible archival in the README; update the roadmap's implementation status only after the feature is implemented.
- [ ] Run frozen installation, formatting, lint, type checks, all discovered tests, and a production build with no default database access. Verify the new package stays browser-safe and database imports stay server-only; use only isolated paths for database checks.
- [ ] Verify the expanded checks and real board migration on macOS, Linux, and Windows CI; record any unavailable checks accurately. Do not run browser verification or leave a development server running without separate authorization.
