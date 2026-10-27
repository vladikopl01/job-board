## Context

See [proposal.md](proposal.md) for motivation. The foundation provides `apps/web`, source-exported `@job-board/db`, a lazy server-only connection, and explicit Drizzle migration commands. The product schema is empty. The app has an empty home page, and Vitest currently discovers database tests and app component tests only.

The accepted [architecture](../../../architecture.md#company-boards-and-provider-adapters) separates source-specific parsing from application workflows and persistence. This change introduces source identification; the complete-snapshot adapter contract and normalized posting format belong to the indexed-openings change.

## Goals / Non-Goals

**Goals:** Make board identity deterministic, keep duplicate prevention authoritative in SQLite, separate user labels from provider identity, and preserve records through reversible archival. Keep registration usable offline and the local API safe against cross-origin writes.

**Non-Goals:** No provider reachability check, metadata scraping, postings, job counts, refresh/task machinery, AI, source replacement, hard deletion, or speculative package scaffolding. Registration does not imply that a board exists. No browser automation is added or run without separate user authorization.

## Decisions

### A small source-identification workspace

Introduce `packages/job-boards` as `@job-board/job-boards`, with strict TypeScript and public source exports. Its Ashby and Lever recognizers produce the same identity shape: provider, hosted-site hostname, opaque board key, and canonical URL. Keep a small provider registry behind one public URL-identification entry point, rather than a plugin framework. No app/database imports, filesystem access, HTTP client, or throwing placeholder fetch methods belong here.

The app consumes it through `workspace:*`. Add it to Next's source-package handling and root Vitest discovery, and include its own type-check script in the existing recursive command. The current package-specific test include must be widened so new provider tests cannot silently go unexecuted. There is no separate package build or new orchestrator.

Defining a complete posting schema or snapshot interface now would be unused design: add those to this same package with the first real feed implementations. The shared output shape in this change covers the provider responsibility already being exercised.

### Conservative URL normalization, without network discovery

Use the platform URL parser and an exact host allowlist. Accept these board-root forms only:

| Provider | Input form | Stored regional identity |
| --- | --- | --- |
| Ashby | `https://jobs.ashbyhq.com/<board-key>` | `jobs.ashbyhq.com` |
| Lever | `https://jobs.lever.co/<board-key>` | `jobs.lever.co` |
| Lever | `https://jobs.eu.lever.co/<board-key>` | `jobs.eu.lever.co` |

[Ashby's public documentation](https://developers.ashbyhq.com/docs/public-job-posting-api#how-to-find-your-jobs-page-name) identifies the board name in the hosted URL, including a mixed-case example. [Lever's official documentation](https://github.com/lever/postings-api#sites) distinguishes its global and EU hosted sites. Preserve board-key case and regional host; neither documentation establishes that arbitrary case variants or regional sites can be merged.

Trim outer whitespace; reject embedded control characters and backslashes. Require HTTPS, no username/password, and no non-default port. Allow one board-key segment with an optional trailing slash, using ASCII unreserved characters (`A–Z`, `a–z`, digits, `-._~`), with `.` and `..` rejected. Decode percent-encoded unreserved characters once; reject malformed escapes, encoded separators, and other encoded/reserved characters. Reject deep posting/application paths. The 2048-character URL input bound also bounds key length.

Normalize host and default HTTPS port through the URL parser, drop query/fragment, and rebuild the canonical board-root URL. Never retain the raw URL with tracking/query data. Host suffix matching, custom domains, redirects, scheme guessing, and following a pasted job URL to find its board are excluded. Show supported examples on validation failure.

Registration performs no outbound request. Requiring a live check would add provider failures, network delay, and fetch security work before any indexed data exists. The first successful indexing snapshot can establish availability later. Do not add a misleading verified flag or label.

### A durable board row with immutable source fields

Add a `boards` table in the database package and generate its migration with the pinned Drizzle Kit. Use the existing connection/migration path without a parallel repository or migration framework.

| Field | Meaning |
| --- | --- |
| `id` | Server-generated UUID, independent of provider keys. |
| `provider`, `sourceHost`, `boardKey` | Normalized source identity. |
| `canonicalUrl` | Canonical HTTPS root derived during registration. |
| `displayName` | User-owned company label, trimmed and limited to 1–120 characters. |
| `createdAt`, `updatedAt` | UTC creation and effective-change timestamps. |
| `archivedAt` | Nullable UTC timestamp; null means active. |

Enforce a unique constraint on `(provider, sourceHost, boardKey)` across every row, not just active rows. A friendly name is not unique: a company can have several legitimate sources. Client checks improve feedback but cannot enforce uniqueness against simultaneous tabs. Handle only the specific unique-source constraint as a duplicate; do not convert unrelated database failures into duplicate responses.

Creation writes all normalized source fields together. Subsequent updates permit only the display name and explicit archive state. Keep company renaming separate from source replacement so future job/application relationships cannot silently move to another employer. Correct an incorrectly saved source by archiving it and adding the correct one. Do not precreate posting, task, refresh-status, or company-entity tables.

Archive sets `archivedAt`, restore clears it, and both retain the row and its UUID. Repeating the current state is a successful no-op with unchanged timestamps. `updatedAt` changes only for an effective name/state change. This is a current-state record, not a new audit-log feature; later linked job/application rows remain independent of archive state.

### Feature-owned API and validation

Keep shared Zod 4 input/output schemas near the board feature in `apps/web`, separate from server imports. The form and route use the same constraints, while the server independently normalizes the submitted URL and assigns identity/timestamps. JSON responses use serialized UTC timestamps, never native driver objects.

Use Node-runtime Route Handlers, with uncached local reads:

| Endpoint | Contract |
| --- | --- |
| `GET /api/boards` | Return all active and archived records, ordered by creation descending with an ID tie-breaker. No write or outbound fetch. |
| `POST /api/boards` | Accept `{ displayName, url }`; return the created board with 201. |
| `PATCH /api/boards/[id]` | Accept a nonempty subset of `{ displayName, archived }`; return the resulting board with 200. |

Reject unknown input keys rather than accepting source-identity updates. UUID validation distinguishes malformed identifiers from well-formed missing records. Do not expose DELETE or toggle semantics.

Return a consistent error envelope with a code, safe message, and field errors when relevant: invalid input/JSON is 400, invalid origin/host is 403, missing records are 404, duplicate source is 409, non-JSON mutation content is 415, and unexpected local-storage failures are 500. Duplicate responses include the existing board identifier and archive state, enabling a locate/restore action without an implicit write. Missing/unmigrated schema is a local setup failure, not an empty board list; provide a safe setup hint mentioning `pnpm db:migrate` when appropriate.

Validate mutation origin against the request's local origin and require a loopback hostname (`127.0.0.1`, `localhost`, or IPv6 loopback). Reject missing/mismatched Origin and non-loopback Host before database access. Do not enable credentialed CORS or accept form-encoded state changes. This protects the first real local write API without adding an account system. Keep error responses free of SQL, stack traces, and machine paths.

Feature services use parameterized Drizzle operations through the existing app database boundary. Keep transactions short; there is no network work to hold outside them. Use explicit state assignments and an atomic update when patching multiple fields. Preserve the stored record on any validation, uniqueness, or database failure.

### A focused boards screen using the agreed client tools

Add `/boards` with a semantic heading, an add form, and active/archived list views. Replace the home page's claim that company boards are coming later with a working management link; do not add job or notification routes. Render names as text, wrap long names/URLs on small screens, and give each per-board action an accessible name.

Introduce TanStack Query 5 for local list reads/mutations and TanStack Form for add/rename forms, with app-owned Zod validation. Pin compatible versions during implementation and use the already selected shadcn/Base UI components only as needed. A small app Query provider is sufficient; no global state library is required.

Return a server-renderable page shell containing the client feature. Load local data through the API without a build-time database read or an RSC hydration/prefetch layer. Show real query loading/failure states. A mutation confirms its write before the displayed list changes; use its returned row to update/invalidate affected cached data. Avoid optimistic archive/removal and mutation retries that might confuse an uncertain creation result with another add attempt.

Keep entered form values and the last confirmed list on failure. Disable the relevant pending submission/action, announce outcomes accessibly, and keep all operations keyboard usable. Duplicate active boards can be located; duplicates that are archived offer an explicit restore action. Safe canonical links open in a new tab with an accessible indication and `noopener noreferrer`.

The active/archived selection is transient React state, defaulting to active on a new visit. This feature introduces no URL search-parameter contract; nuqs stays reserved for a feature that actually adds URL state. No refreshing badge, job count, or provider-health indicator is displayed without its underlying feature.

### Focused verification through the existing toolchain

Test normalization with a compact table of supported examples, canonical equivalence, case/region preservation, and rejected URL boundaries. These tests perform no network requests.

Use real temporary SQLite connections and the new production migration to verify persistence across reopen, label updates, duplicate constraints across active/archived records, and archive/restore identity and idempotency. Keep the existing generated fixture tests for generic migration rollback/history behavior. Route tests exercise validation, duplicate/not-found responses, rejected origins, and safe errors; if replacing the app connection accessor for isolation, return a real temporary Drizzle connection rather than mocking SQL.

Use React Testing Library for meaningful keyboard form validation/submission, duplicate restoration, and failed mutation recovery. Mock the local HTTP boundary in component tests rather than contacting providers. Root Vitest discovery, type checking, formatting, linting, builds, and all three CI jobs must include the new workspace. A clean build must still succeed without opening a database. Browser/visual checks require separate authorization and must not be reported as completed by DOM tests.

## Risks / Trade-offs

- A syntactically valid source may be nonexistent or mistyped → explain that registration saves a source; availability belongs to indexing.
- Provider slugs may have aliases or undocumented case behavior → retain source case, canonicalize only established equivalences, and do not merge identities using company names or guesses.
- Custom domains, deep links, and keys outside the conservative grammar are rejected → show the supported hosted-root examples; broaden recognition only with a concrete provider contract and tests.
- Two tabs can race to create or update a board → enforce unique identity in SQLite, use explicit idempotent states, and refresh local query data after confirmed writes. Conflicting label edits use the last committed value; no conflict-resolution system is added.
- A dependency or source-export change can exclude provider tests or leak server code → extend test discovery and public exports explicitly, then run the complete root checks and production build.

## Migration Plan

Introduce the provider workspace and feature dependencies, generate/review the first board-table migration, then implement services/API and UI. Existing foundation databases retain their files and migration history; contributors run `pnpm db:migrate` explicitly before using the feature. Do not run schema changes during imports, builds, or ordinary requests.

Document supported URLs, offline registration, duplicate handling, immutable sources, and archive/restore behavior. Verify the same migration and feature checks on macOS, Linux, and Windows using isolated data. If source must be rolled back, disable/revert the feature while retaining the additive board table and local data; do not add an automatic down/reset migration.

These are planned implementation checks. This proposal does not install dependencies, change the schema, call a provider, or implement the feature.
