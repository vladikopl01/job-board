## Why

Saved boards currently identify sources but do not expose their openings. A durable local job index is the next dependency for discovery, unread notifications, and application preparation; it must retain usable data when a provider or refresh fails.

## What Changes

- Fetch all discoverable postings from Ashby and Lever, including Lever's global and EU instances, through a shared adapter contract. Validate the entire result before changing the index.
- Persist posting content, source references, original locations and compensation metadata, internal UUIDs, and availability history. Continuously present references update their current record; reappearance after an observed absence creates a new record.
- Add persisted board-refresh tasks executed inside the existing Next.js server, with per-board coalescing, bounded concurrency, safe restart recovery, and atomic reconciliation.
- Queue the first indexing task when a board is saved, and request subsequent refreshes on an initial app visit and through each active board's manual Refresh action. Show local results immediately, alongside per-board progress, last success, and recoverable errors.
- Add a minimal Jobs list and full-details view over local data, with open and historical views and safe employer links. Provide an explicit, confirmed treat-as-new correction for a currently indexed posting whose external reference was reused without an observed absence.
- Make board archival cancel or invalidate refresh work and hide its jobs from open discovery while preserving stored records. Registration succeeds locally before its queued indexing runs; restoration exposes retained data without starting new work.

Unread counts and read/unread actions, rich search/filtering, geography grouping, AI classification, application workflows, timers, and additional providers remain separate changes. This proposal does not implement them.

## Capabilities

### New Capabilities

- `job-indexing`: Complete provider feeds, normalized local postings, atomic reconciliation, and internal posting identity/history.
- `board-refresh`: Explicit and app-visit refresh requests, persisted execution, progress, deduplication, failure recovery, and archive fencing.
- `job-browsing`: Local open/history lists, posting details, safe descriptions and links, and accurate loading/empty/error states.

### Modified Capabilities

- `company-board-tracking`: Queue first indexing on registration, add truthful per-board refresh controls and results, and extend archival to refresh tasks and indexed jobs while preserving source identity.

## Impact

- Extend `packages/job-boards` with shared posting types and a separate server entry for provider transport/parsing; keep its current browser-safe exports free of server dependencies.
- Extend the Drizzle schema with postings, refresh tasks, and board refresh metadata through a new migration; retain the committed board migration unchanged.
- Add feature-owned server services and validated local endpoints in `apps/web`, compose them with the existing loopback mutation guard, and use Next.js `after` to await queued work after responding.
- Extend the Boards UI and navigation, and add `/jobs` and `/jobs/[id]`. Use the existing TanStack Query/Form and shadcn patterns, introduce nuqs for list view/pagination state, and install any missing primitives only through the CLI.
- Add focused adapter fixtures, real temporary-SQLite reconciliation/task tests, route and interaction coverage, and the relevant three-platform CI checks. No employer credentials, external database, separate worker process, or AI account is required.
