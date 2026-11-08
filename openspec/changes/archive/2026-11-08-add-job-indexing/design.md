## Context

See [proposal.md](proposal.md) for motivation and scope. Board registration, title editing, archival, the local mutation guard, and lazy database access already exist. `packages/job-boards` currently contains browser-safe source identification; `packages/db` contains the board schema and committed migration. There is no posting index or task executor yet.

The [architecture](../../../architecture.md) requires a persistent local Next.js Node server, SQLite, complete feed reconciliation, independent internal posting IDs, and immediate access to stored results. Keep these boundaries; add no worker process, hosted service, or AI prerequisite.

## Goals / Non-Goals

**Goals:** Make feed completeness explicit, keep provider transport independent of persistence, and make task ownership and index changes correct under concurrent requests, restarts, and archival.

**Non-Goals:** Build a generic task framework for future features, infer employer intent from description changes, or introduce storage for unread state, taxonomy, applications, or packages before their own changes. The minimal Jobs interface verifies that the index is useful; richer discovery remains separate.

## Decisions

### Shared snapshots with a server-only transport entry

Extend `packages/job-boards` with normalized posting types and a `./server` entry for adapters. Keep the existing root export browser-safe. The app's integration entry is marked `server-only`; the package does not import the app, open SQLite, or schedule tasks.

An adapter accepts a stored `BoardSource` and cancellation signal, then returns a fully validated snapshot or a typed failure. It never returns a partially successful list. Use Zod for consumed fields, allow and retain unknown source fields, and distinguish absent optional values from malformed supplied values. Missing or ambiguous identity, title, or required links fails the snapshot; an explicitly empty description remains empty.

Normalize into a common shape: opaque external reference, title, plain description and original HTML, job/application URLs, original locations and available address/country fields, workplace type, source department/team/employment information, compensation metadata, source timestamps, and raw provider JSON. Company display names continue to come from the tracked board. Index every role and department; do no AI classification or geographic eligibility inference.

Provider requests use fixed HTTPS API origins selected from the validated provider/regional source, with an encoded board key. Disable redirects and send no browser cookies, employer credentials, or local authentication. Use fetch and a non-executing HTML parser, not a browser or DOM script execution. Reuse the existing parse5 choice for HTML-to-text extraction through the package's server entry.

**Alternative considered:** Scrape board pages or let each adapter persist records. Public feeds avoid page-layout coupling, while a shared persistence service makes completeness and identity rules consistent.

### Provider behavior verified before implementation

The following documentation and read-only probes were reviewed on 2026-10-27. Observed response counts are investigation evidence, not expected production counts or test assertions.

| Source | Fetch and interpretation |
| --- | --- |
| Ashby | `GET https://api.ashbyhq.com/posting-api/job-board/{key}?includeCompensation=true`. Validate the versioned jobs envelope as one response; no pagination is documented. Exclude explicit `isListed: false` postings. Prefer `workplaceType`; `isRemote: true` alone cannot distinguish remote from hybrid, so leave that distinction unknown. Retain compensation and all supplied locations. |
| Lever global / EU | Use `https://api.lever.co/v0/postings/{key}` or `https://api.eu.lever.co/v0/postings/{key}` with `mode=json`, `limit=100`, and increasing `skip`. Continue until an empty array, advancing by the actual count received. A short nonempty page is not proof of exhaustion. Preserve location/workplace and salary metadata. Assemble the description, structured lists, additional information, and salary text without duplicating opening/body sections. |

Sources: [Ashby public job postings API](https://developers.ashbyhq.com/docs/public-job-posting-api), [official Lever postings API](https://github.com/lever/postings-api).

Ashby's live response contained an `id`, although its documented field list does not promise one. Accept that reference when supplied; otherwise extract an unambiguous reference from a canonical Ashby job URL. If both are usable they must agree. Do not manufacture an identity from a title or description. Lever supplies its posting identifier. The Ramp probe returned 173 postings, and the MoonPay probe returned 20; a separate two-item Lever pagination probe reached an explicit empty page. These checks do not establish behavior for every board or the EU instance.

Completeness requires valid transport, envelope, every included posting, unique references, and traversal exhaustion. Initial limits are a 20-second request timeout, 90-second total board attempt, 20 MiB aggregate response-body budget, 10,000 postings per traversal, and 202 Lever page requests per attempt, including any confirmation traversal. Reaching a limit fails the attempt; it never converts a partial list into success. Keep limits centralized and testable. Do not automatically retry transport failures or 429s; persist a valid `Retry-After` deadline on the failed task. Enqueueing checks unexpired board cooldowns: a single-board manual request returns 429 with retry timing, while a manual/app-visit batch reports that board deferred and continues with other boards.

Lever's offset pagination has no documented snapshot token. If a candidate traversal would close any current posting, the app's refresh service asks the adapter for one more complete traversal and requires matching sets of discoverable references before reconciling; use content from the second traversal. Both traversals share the same attempt budgets. The adapter still knows nothing about local records. A changed set, duplicate reference, failed page, or exceeded budget fails the whole attempt. This is our conservative closure check, not a provider guarantee of an atomic snapshot. A single-response Ashby feed needs no second traversal.

**Alternatives considered:** Stopping at a short page risks truncation. Silently deduplicating overlaps hides unstable pagination. Closing on one changing offset traversal risks false removals; repeated retries or a second traversal on every import add unnecessary traffic. One confirmation only when closures are proposed bounds the extra work.

### Posting identity and atomic reconciliation

Add a `postings` table through Drizzle with an internal UUID, board foreign key, external reference, normalized content, retained source data, content hash, first/last-seen times, content-update time, and nullable unavailability time/reason. Use `missing` and `superseded` reasons; board archival is a separate property of the board. Store times in UTC using the existing database convention.

A partial unique index on `(boardId, externalReference)` for current postings permits multiple historical incarnations but only one current mapping. Provider references are opaque correlation keys and never the internal primary key. Use typed JSON columns for variable provider metadata rather than prematurely normalizing country, salary, or department catalogs.

For one complete snapshot, perform one short transaction:

- Recheck task ownership, unexpired lease, active board, and the captured board refresh generation.
- Resolve the current mapping inside the transaction. Update continuously present records; create a UUID when no current record exists. A historical match alone never revives an old UUID.
- Mark missing current records unavailable while retaining their data and previous last-seen time. A validated empty snapshot follows the same rule.
- Commit all posting changes, the board's last-success time, result counts, and task success together.

Fetch and validate outside the transaction. Failure before or during reconciliation preserves the entire previous index and last-success time. Update last-seen on presence; update content time/hash only when normalized content changes. Exclude fetch timestamps and irrelevant raw-field ordering from the content hash. Future user-owned read/application/package data must not be overwritten by source updates.

**Alternative considered:** Upserting by provider ID as the primary key would merge separate incarnations and their history. Writing each page immediately would expose partial imports and make absence unsafe.

### Explicit replacement when an absence was not observed

A continuous external reference cannot prove whether an employer edited a job or deleted and recreated it between polls. Do not guess from title or content differences. Offer a confirmed Treat as new action on an available posting from an active board.

In one local transaction, mark the targeted current record superseded and create a fresh UUID with its stored source content and external reference. Preserve the old record; copy no user-owned history. Use a new local first-seen time but retain the actual source last-seen time, since this action performs no network fetch. Concurrent corrections targeting the old UUID return a conflict after the first succeeds. A concurrent refresh resolves the current mapping at commit, so it updates the replacement without reviving the superseded record.

**Alternative considered:** Automatic content heuristics misclassify ordinary edits. Omitting a correction leaves no reliable way to separate a reused reference before application history is attached.

### Feature-specific persisted refresh tasks inside Next.js

Add `board_refresh_tasks` rather than a generic job framework. Store task UUID, board ID, request source (`app-visit` or `manual`), state, timestamps, progress/result counts, safe error details, ownership token, lease expiry, and captured board refresh generation. States are queued, running, succeeded, failed, interrupted, and cancelled. Enforce one queued/running task per board through a partial unique index.

An authorized POST persists or coalesces tasks, then responds promptly. Use `after(async () => await drain())` from that route to await the coordinator after the response. Next.js documents this hook for post-response work and supports it under self-hosted `next start`; it does not replace durable task records. Do not call it from static rendering or rely on an unawaited promise. See [Next.js after](https://nextjs.org/docs/app/api-reference/functions/after) and [self-hosting lifecycle](https://nextjs.org/docs/app/guides/self-hosting#after).

Use short immediate transactions to recover expired ownership and atomically claim queued work. Permit at most two running board attempts across coordinators sharing this SQLite file. A process-level promise may avoid redundant drains during development, but database claims enforce ownership. Await all claimed work and drain the finite queued set; do not strand tasks by processing only the first batch. Keep provider failures independent.

Give each claim a fixed 120-second lease exceeding its enforced 90-second attempt deadline. No heartbeat is needed initially. Recheck ownership and expiry at every terminal write; late or cancelled owners cannot commit. Queued work resumes when an app visit or manual request starts a coordinator. Expired running attempts become interrupted, with explicit retry rather than silently replaying the same attempt. If an earlier process left an unexpired lease, the coordinator can wait until its expiry before recovery; never steal a potentially live claim on module import. Status GETs only read persisted state.

Recovering a task means finishing its state transition, not claiming that its provider work completed. The UI continues to show the last committed data throughout. The local server must remain running for work to progress; no refresh occurs while it is stopped.

**Alternatives considered:** A standalone worker conflicts with the agreed runtime. Memory-only promises lose ownership after reload. Resetting all running rows at startup can invalidate another live process; fixed bounded leases allow conservative recovery without a general heartbeat service.

### Archive fencing and first indexing

Add `lastSuccessfulRefreshAt` and a monotonic `refreshGeneration` to boards. Rename does not change the generation. Actual archive/restore transitions change it; repeated idempotent requests do not.

Archive and cancel nonterminal tasks in the same transaction. Abort in-process fetches when practical, but treat the database generation/ownership check as authoritative. Capturing the generation at claim prevents an old fetch from committing after an archive followed immediately by restore. Archival hides jobs from Open without marking them missing or deleting them. Restoration exposes retained current data and permits a later manual/app-visit refresh.

Registration saves the board and queues its first refresh in one immediate SQLite transaction. Reuse the manual request source for this user-initiated action. The registration route returns the saved board with 201, then awaits the existing coordinator through Next.js `after`. Provider availability never determines whether the local save succeeds. Failed first indexing retains the board and exposes the existing retry action. If task persistence fails, the board insert rolls back too. Duplicate registration does not enqueue another task. Client cache invalidation already reads task summaries after a save, so no additional browser refresh request is needed.

Restoration exposes retained data without enqueueing new work. A newly registered board's Refresh button shows queued/running progress; no fake job counts or verified status are introduced.

**Alternative considered:** Checking only `archivedAt` at completion misses archive/restore races. Treating archive as employer disappearance incorrectly creates new incarnations after restoration.

### Local API and client lifecycle

Keep feature services and Zod route contracts near their features in `apps/web`. Use the Node runtime, existing lazy database connection, no-store responses, safe errors, and the existing same-origin loopback JSON guard for every mutation.

| Route | Behavior |
| --- | --- |
| `POST /api/boards` | Atomically save a new board and its first queued refresh, return 201, and run indexing through the post-response coordinator. |
| `POST /api/refreshes` | App-visit or manual Refresh all request for active boards; returns per-board accepted/coalesced tasks or cooldown deferrals, or an empty successful result when none exist. |
| `POST /api/boards/[id]/refresh` | Manual request for an active board; returns its accepted/existing task. Archived boards return a conflict. |
| `GET /api/refreshes` | Read current/latest task summaries and retry timing; never dispatch provider work. |
| `GET /api/jobs?view=open\|history&page=1` | Read a bounded page of local postings and pagination metadata. |
| `GET /api/jobs/[id]` | Read retained details by internal UUID, or return not found. |
| `POST /api/jobs/[id]/replace` | Confirmed local replacement of the targeted current posting; return the new internal UUID. |

Single-board refresh POSTs use empty validated JSON objects. Batch requests accept only an optional `source: app-visit|manual`, defaulting to app-visit. Provider targets and active-board selection remain server-derived. Return 202 for accepted/coalesced refresh work. Unknown targets return 404. Validate query values and identifiers before database work; rejected origins and malformed mutations perform no writes. Do not expose raw provider payloads, stack traces, or filesystem paths through errors or list responses.

Request app-visit refresh once per mounted browser document from a persistent root client boundary alongside the Query provider. Guard development Strict Mode replay. Do not await it before local queries render. Browser reload/reopen may request another refresh; route navigation, focus, reconnect, prefetch, GETs, and restoration do not independently do so. Creation queues only the new board's first indexing task. Simultaneous tabs are safe through task coalescing.

Poll task summaries while queued/running work exists and invalidate affected board/job queries on terminal transitions. A failed scheduling request has a retry affordance and does not turn the local list into an error. Ordinary query revalidation remains separate from provider refresh.

**Alternative considered:** Refreshing in a page loader, query function, or focus handler causes prefetch/navigation side effects. Keeping execution behind POST preserves read-only local queries.

### Minimal local browsing and board feedback

Add Jobs navigation, `/jobs`, and `/jobs/[id]`. Open contains current available postings of active boards. History contains unavailable/superseded postings and retained postings of archived boards, with the reason shown accurately. A posting appears once in the selected view; restoring a board moves its current postings back to Open.

Use nuqs for `view=open|history` and page state, with 50 postings per page and stable first-seen-descending/UUID ordering. Return totals and bounded page metadata, handle an out-of-range page after reconciliation, and avoid loading raw payloads or full descriptions into list responses. Rich search and filters remain outside this change.

Details render retained HTML after server-side sanitization using `sanitize-html`. An explicit allowlist preserves headings, paragraphs, lists, emphasis, tables, and links; remove embedded media, scripts, event handlers, source CSS, and arbitrary attributes. Resolve relative description links against the employer posting, allow only HTTP(S)/email links without credentials, and force safe external navigation. Normalize source H1s to H2s below the page title. The original HTML remains unchanged in SQLite and is never exposed directly by the detail API. Plain-text-only descriptions fall back to inert text with preserved line breaks. Shared Lever section assembly preserves list headings, list wrappers, and plain-only sections both on ingestion and when reading older retained source payloads; this needs no migration, refresh, or writes. Validate top-level employer/application links as HTTPS without credentials. Details remain available after unavailability, replacement, or board archival. Opening details does not yet create read state, application state, or a provider request.

Use scoped description typography for heading hierarchy, paragraph/list spacing, visible links and focus, and a bounded reading measure. A responsive definition list separates location, workplace, employment, department/team, and compensation. Format provider enums into readable labels and display employer compensation summaries, tiers, or numeric ranges/periods without conversion. Unknown compensation formats link to the employer instead of displaying JSON. CLI-installed breadcrumbs replace the back link. A shared custom not-found screen handles unknown routes and missing posting queries, with links to Jobs and Boards.

Active board cards gain an icon-labeled Refresh action on the left, with Rename/Archive on the right. Keep concise queued/running progress in the Refresh button, without duplicate progress copy in the card body. Show last-success time and actionable failure/retry state while retaining confirmed data. Archived cards retain Restore only. Keep supplementary explanations in existing info tips rather than adding persistent labels. Use existing shadcn components; install any missing primitives only through the CLI and review its diff. Preserve keyboard/focus behavior, accessible status announcements, reduced motion, and the 320 CSS pixel layout.

Review refinements place a CLI-installed Spinner with Refreshing boards… beside the Boards and Jobs tabs only during app-visit/manual all-board refreshes, and an outline Refresh all beside New board. Shared mutation state covers scheduling and tracks accepted batch task IDs through completion; later single-board tasks on the same board do not activate global activity. Retain these small batch results for the document lifetime so navigation or long queues do not lose the association. A read-only task summary transaction returns both the latest attempt and `lastSuccessfulResult`, deriving cached/unchanged counts from current local postings minus that successful task's added/updated counts; unavailable history is excluded. The result remains visible through queued/running/failed attempts, including initial page reads during an attempt. No additional schema migration is needed. Unchanged successes read Up to date with their cached count instead of three zero deltas. A 180ms ease-out opacity pulse confirms a changed completed-result identity, including equal counts. Use native element animation with opacity always above zero, no first-mount animation, stable text nodes, cancellation on interruption/unmount, and reduced-motion suppression. Refetched job headings use the same update feedback.

Selected Boards/Jobs panels own their loading/content states and `aria-busy`; CLI-installed Skeleton compositions cover pending local list content while real tabs and toolbar actions render immediately. Lists have no whole-page loading fallback that replaces their controls. The Jobs page awaits Next.js `connection()` to server-render URL-based tabs for the incoming request without a search-parameter CSR fallback; local data reads remain client queries. Posting details have a separate route skeleton with breadcrumb, heading, facts, and body placeholders. Loading copy is screen-reader-only, with a History-specific announcement, and no empty state appears before its local response completes. Link-style empty actions use the same outline button variants and class merging as board empty actions. Header navigation retains its original compact rounded-link styling and active treatment. Job cards show the first five original locations separated by commas, followed by an accurate N more locations count without a plus sign; details preserve the full comma-separated list. Compensation occupies an ordinary facts-grid cell, matching the skeleton's flow. A stretched job-details link covers each card, preserving native keyboard and modifier-click behavior; a separate company link is layered above it. Company links use an at prefix, detail badges align on the company text baseline, and company routes target `/boards/[id]` placeholders with prefetch disabled. Board cards use the same stretched-link pattern, preserving source links and management/refresh controls above it and suppressing the overlay during inline renaming. Implementing company pages remains deferred. Button icons consistently lead their labels, including both not-found actions. App-authored external links show an external-link icon; imported description links retain their source presentation.

**Alternative considered:** Shipping ingestion with no way to inspect jobs would make correctness and usefulness hard to review. Building search, inbox counts, or a full application workspace here would obscure the indexing boundary.

## Risks / Trade-offs

- **[Changing offset pages]** → The closure confirmation detects differing reference sets, but Lever offers no atomic snapshot guarantee. Document this limitation; fail safely when instability is observable.
- **[Same reference reused between polls]** → Preserve continuous identity by default and provide confirmed local replacement. A snapshot cannot establish unseen events.
- **[A valid empty feed closes every current posting]** → Require the same complete validation and, for Lever closures, confirmation. A transport error, HTML response, missing envelope, or malformed item is never an empty success.
- **[Server exits after accepting work]** → Persist before responding, bound claims with leases, recover conservatively, and expose interrupted/retry states. `after` alone is not crash recovery.
- **[Large boards exceed conservative budgets]** → Fail explicitly while retaining the previous index; change limits based on real needs rather than silently truncating.
- **[Provider/schema changes]** → Retain unknown raw fields, validate consumed fields, and maintain versioned fixtures. Do not silently skip malformed included postings.
- **[SQLite writes briefly block the local event loop]** → Keep network/parsing outside transactions and use bounded batched Drizzle operations within one atomic reconciliation.
- **[Cross-platform native dependencies]** → Run migration, adapter, and coordinator checks on macOS, Linux, and Windows. Existing macOS results do not establish three-platform readiness.

## Migration Plan

- Generate and commit a new Drizzle migration for board refresh metadata, postings, task records, constraints, and query indexes. Do not rewrite the existing company-board migration or reset a database.
- Verify upgrades from the current schema and fresh setup using temporary SQLite files. Preserve board UUIDs, labels, source uniqueness, and archive state; existing boards start without a successful refresh and with no postings/tasks.
- Keep migration explicit through `pnpm db:migrate`; requests, builds, and imports do not migrate or fetch automatically. Update local-run instructions to explain the migration and first refresh.
- Test the change's provider and lifecycle contracts, then run the existing quality checks and expanded three-platform CI. Offline CI uses controlled fixtures, not live providers.
- If runtime rollback is needed, stop the new runtime and restore the prior application revision while retaining the additive database and its data. Do not drop tables or claim an automatic down migration. Validate old board operations against the upgraded schema in a temporary database before documenting that rollback path.
