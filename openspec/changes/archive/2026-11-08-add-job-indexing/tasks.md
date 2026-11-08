## Provider snapshots

- [x] Define the shared normalized posting/snapshot and safe failure contracts in `packages/job-boards`, with a separate server export and browser-safe existing exports.
- [x] Add bounded provider transport with fixed API origins, disabled redirects, cancellation, shared attempt budgets, response-size limits, and safe rate-limit/retry timing extraction.
- [x] Implement Ashby envelope validation, listed-posting selection, stable external-reference validation/fallback, complete content retention, and conservative workplace mapping.
- [x] Implement Lever global/EU traversal through an explicit empty page, advancing by actual page count, rejecting duplicate references, and assembling all description sections without duplication.
- [x] Add controlled adapter fixtures covering both providers, Lever EU routing and short pages, optional fields, multi-location/compensation data, ambiguous identity, unsafe links/HTML, malformed/empty responses, duplicates, redirects, cancellation, and bounded failures. Keep CI independent of live providers.

## Local persistence and identity

- [x] Extend the Drizzle schema with postings, refresh task records, board last-success/generation metadata, current-reference and active-task uniqueness, and indexes for local list/task reads. Generate a new migration without modifying existing migrations.
- [x] Verify fresh migration and upgrade from the current board schema in temporary SQLite files, preserving existing board identities/archive state and checking current-reference constraints. Verify prior board operations still work with the additive schema for the documented runtime rollback.
- [x] Implement atomic snapshot reconciliation with content hashes, correct observation/content timestamps, new UUIDs, retained missing records, successful task/board metadata, and ownership/generation checks inside the commit.
- [x] Add temporary-SQLite lifecycle tests for continuous edits, board-scoped references, observed disappearance/reappearance, valid empty snapshots, unchanged data after failure, and transaction rollback.
- [x] Implement the atomic Treat as new correction and test concurrent/stale corrections and overlap with refresh, ensuring one current mapping and preserved historical records.

## Refresh coordination

- [x] Implement persisted enqueue/coalescing and active-board validation with immediate transactions, cooldown handling, safe per-board batch outcomes, and no provider access during acceptance.
- [x] Implement bounded in-server coordination with atomic ownership, at most two running attempts, fixed leases/deadlines, finite queue draining, cancellation, and conservative recovery of queued/stale-running work.
- [x] Integrate adapters with the refresh service, including a second complete Lever traversal when closures are proposed, matching reference sets, and shared attempt budgets before reconciliation.
- [x] Extend actual archive/restore transitions to advance the board generation and cancel unfinished work atomically; preserve idempotent requests, offline registration/restoration, and retained availability history.
- [x] Test competing coordinators/tabs, queue draining beyond capacity, independent board failures, cooldowns, stale/unexpired ownership, interrupted retries, archive/restore races, and late result rejection with controlled clocks/fetches and temporary SQLite.

## Local API and browser lifecycle

- [x] Add shared Zod request/response contracts and guarded Node refresh POST routes, plus read-only task status queries. Persist acceptance before using an awaited Next.js `after` coordinator callback; reuse no-store responses and sanitized error handling.
- [x] Add local paginated job list/detail services and GET routes with stable ordering, Open/History semantics, bounded projections, validated identifiers/query values, and not-found/error results. Add the guarded replacement POST route.
- [x] Add focused route tests proving rejected origins/inputs have no writes or provider calls, GETs stay read-only, accepted work is coalesced, archived/missing targets are handled, and replacement conflicts preserve data.
- [x] Request refresh once per initial browser document from a persistent client boundary without blocking local reads. Guard Strict Mode replay; keep navigation, focus, reconnect, prefetch, and restoration from independently starting provider work.
- [x] Add task polling and affected-query invalidation with terminal-state handling, local-data retention, and scheduling failure/cooldown retry feedback. Test the lifecycle distinction between local query activity and provider refresh requests.

## Browsing and board feedback

- [x] Add Jobs navigation and a responsive Open/History list, using nuqs for view/page state and bounded pagination. Distinguish fresh/not-indexed, empty, loading, local-error, and background-refresh states.
- [x] Add retained local details with complete readable description sections, original source metadata, accurate availability context, and validated external links. Render server-sanitized source HTML with an inert plain-text fallback, without remote embedded content.
- [x] Add an accessible confirmed Treat as new action for eligible details, including cancel/failure focus behavior and navigation to the returned replacement UUID.
- [x] Add icon-labeled Refresh to active board cards with concise task state, last success, and actionable failures. Keep archived actions limited to Restore and preserve inline rename behavior and the shared toolbar.
- [x] Reuse installed shadcn primitives; if a missing primitive is needed, review CLI dry-run/diff and install only through the configured CLI. Add focused interaction tests for local-data retention, pagination/history, safe details, refresh feedback, and keyboard confirmation; preserve reduced motion and the 320 CSS pixel layout.

## Documentation and verification

- [x] Update local-run documentation and canonical planning status for the implemented index, explicit migration/first refresh, provider limits, restart recovery, snapshot limitations, and deferred unread/discovery features.
- [x] Run formatting, lint, type checking, focused/full existing tests, and the application build using temporary data and isolated build output as appropriate; avoid the user's database and running dev server. Record actual results and unresolved limitations.
- [x] Extend the existing macOS/Linux/Windows CI checks to cover adapter imports, migration upgrades, reconciliation, task coordination, and relevant app checks; do not claim cross-platform readiness until the matrix passes.
- [x] Validate this OpenSpec change and review the implementation against its scenarios before marking tasks complete. Keep archive/commit as separate user-directed actions.

## Review refinements

- [x] Move refresh activity beside the view tabs using a CLI-installed Spinner, and add a secondary Refresh all beside New board with shared pending state and manual-source batch requests.
- [x] Show successful unchanged/cached job counts without another migration; keep per-board cooldowns, failure outcomes, and retained history accurate.
- [x] Fix History loading inside its busy panel, restore outline link-button class merging, and link job-card company names to deferred company-page routes without prefetch.
- [x] Cover delayed History results, unchanged refresh counts, manual batch requests and duplicate-click prevention with focused tests, then rerun the quality checks and isolated build.
- [x] Restore the original header link styling, add a shared not-found presentation, and use CLI-installed breadcrumbs for posting details.
- [x] Preserve source headings, links, paragraph/list spacing, and plain-only Lever sections through shared assembly and server-side sanitization. Recover retained Lever sections offline without writes or a migration.
- [x] Group job facts responsively, format workplace/employment labels and compensation summaries/ranges/tiers, and avoid displaying raw JSON.
- [x] Test formatted details, sanitized API output, read-only Lever recovery, readable compensation and labels, breadcrumb navigation, and missing-posting navigation.
- [x] Limit toolbar refresh activity to accepted app-visit/manual batches, keep per-board progress in buttons, and animate completion text for identical results with reduced motion respected.
- [x] Install Skeleton through the reviewed shadcn CLI and compose initial loading states for Boards, Jobs/History, and posting details without hiding confirmed background data.
- [x] Stretch job-detail links across cards while preserving company links, add the at prefix, align detail badges to the company baseline, and move board management actions right of Refresh.
- [x] Align action icons before labels, audit app-authored external-link indicators, and cover skeleton loading, card link separation, and standalone refresh feedback with focused interaction tests.
- [x] Return the last successful result separately from the latest attempt so stats remain visible during queued/running/failed work and page revisits; animate only completed updates without remounting text.
- [x] Keep list skeletons inside their selected content panels, render actual tabs/actions immediately, summarize five comma-separated card locations with the remaining count, and keep compensation in the normal facts grid. Retain the posting-details route skeleton.
- [x] Stretch board company links across cards while preserving source links, independent action controls, disabled-button hit areas, and inline rename keyboard behavior.
- [x] Verify persistent result retention using temporary SQLite, pending-state continuity and reduced-motion animation behavior using React tests, and immediately available list controls alongside pending card queries. Confirm New board remains usable during loading and Jobs restores URL-selected tabs before results arrive.

## First indexing on registration

- [x] Atomically save each new board and its first queued refresh, run the existing coordinator after the registration response, update help and documentation, and verify automatic Ashby/Lever indexing, offline failure retention, duplicate/rejected registration, and transaction rollback using temporary SQLite.

## Validation record

Verified first indexing on registration locally on macOS with Node 24.19.0 and pnpm 10.28.0 on 2026-10-28. The full suite passes all 199 tests across 21 files; the 31 route/service tests also pass after tightening the rollback assertion. These cover post-response Ashby/Lever indexing, offline board retention and manual retry, duplicate/rejected registration, and atomic rollback when the first task cannot be saved. Formatting and lint pass. Fresh route type generation, workspace/root type checking, and the production build pass in an isolated copy without creating a database or touching the user's data, development output, or running server. Strict OpenSpec validation and diff whitespace checks pass. No browser verification was performed for this addition; the remote operating-system CI matrix was not run. Startup refresh behavior is unchanged.

Verified locally on macOS with Node 24.19.0 and pnpm 10.28.0 on 2026-10-27:

- `pnpm format:check` and `pnpm lint` pass with no warnings.
- `pnpm test --maxWorkers=4` passes all 185 tests across 20 files. Provider fixtures require no network; migration/reconciliation/coordination tests use real SQLite in unique temporary workspaces. Coverage includes upgrading the existing board schema, replay, rollback, source reference reuse, queue limits, cooldowns, archive/restore fencing, conservative interruption recovery, formatted/sanitized descriptions, retained Lever section recovery, readable compensation/labels, comma-separated five-location summaries, breadcrumbs, not-found navigation, content-only list skeletons alongside real tabs/actions, New board during a pending read, URL-selected Jobs tabs before results arrive, independent card/company links, batch-only activity, persistent successful results through pending/failed refreshes, and completion-only motion with reduced-motion support. A prior default-parallel run hit the existing native CLI test's five-second timeout; the complete bounded-worker run passes without increasing test timeouts.
- `pnpm typecheck` (including fresh Next route types) and `pnpm build` pass in an isolated copy with shared installed dependencies and separate build output. The build creates no database. The user's database, current development output, and running server were not used or changed.
- Browser-safe and server `@job-board/job-boards` exports import successfully under Node. CI runs this import check and the expanded suite on macOS, Linux, and Windows; that remote matrix has not been run for these uncommitted changes.
- `openspec validate add-job-indexing --strict` and `git diff --check` pass. Implementation was reviewed against the proposal's provider, identity, refresh, archive, local-read, and browsing scenarios.

No browser or computer-use verification was performed. Keyboard/dialog and status behavior is covered by React interaction tests; visual behavior at 320 CSS pixels was reviewed in the layout code but has not been inspected in a browser. Offset pagination remains subject to the documented source limitation despite the conservative Lever closure check. Oversized or changing feeds fail safely without partial indexing.

Existing shadcn primitives were reused, and Spinner, Breadcrumb, and Skeleton were installed through the configured CLI after reviewing their dry-runs and diffs. No primitive was hand-edited apart from repository formatting. Spinner/Breadcrumb SVG status/current-page roles have narrowly scoped lint-rule overrides, documented in the README. Original header link styling is restored. Description/fact and loading/refresh presentation changes need no additional migration. Database migration remains an explicit user command. This change was archived on 2026-11-08 after syncing its delta specs to the main specs.


## Archive verification

Verified on 2026-11-08 with Node 24.19.0 and pnpm 10.28.0: all 199 tests across 21 files, formatting, lint, route type generation, workspace/root type checking, browser-safe/server provider imports, and the production Turbopack build pass. Implementation checks ran in a temporary copy with isolated build output and temporary test databases; the configured application data directory was not created. The user's database, development output, and running server were untouched. No browser verification or remote operating-system CI matrix was run.

All 46 implementation tasks are complete. The board-refresh, job-indexing, and job-browsing capabilities were added to the main specs, and the three company-board-tracking delta requirements were merged while preserving all unrelated requirements and prior scenarios. Strict main-spec validation and a full delta comparison passed before archival.
