## Context

See [proposal.md](proposal.md) for motivation and the [unread-inbox](specs/unread-inbox/spec.md) and [job-browsing](specs/job-browsing/spec.md) deltas for the behavior contract. The existing implementation already separates internal posting UUIDs from external references, updates only provider-owned fields during reconciliation, retains historical incarnations, and reads details through a side-effect-free GET. The confirmed Treat as new operation currently copies the stored row, so it needs an explicit reset for the new user-owned field.

Jobs uses nuqs for Open/History and 50-item pagination, TanStack Query for local server data, and a keyed client details component. Refresh completion and board management already invalidate the Jobs query family. The navigation is mounted across route changes. Follow the [canonical architecture](../../../architecture.md), keep migrations explicit, and use temporary databases and isolated build output for implementation checks.

## Goals / Non-Goals

**Goals:** Add one durable user-owned value per posting; share one bounded mutation path for automatic, individual, and bulk changes; distinguish real route entry from data fetching; and keep navigation counts coherent with existing cache invalidation.

**Non-Goals:** Introduce an event log, notification-delivery service, general selection framework, task queue for local read writes, cross-tab locking protocol, or a second posting identity. Read state does not become part of provider snapshots or content hashes.

## Decisions

### Store a nullable read timestamp on the posting

Add `postings.readAt` as nullable UTC text using the existing timestamp convention. Null means unread. Generate an additive Drizzle migration and its snapshot/journal metadata; do not rewrite the committed migrations. Existing rows naturally receive null, as no earlier read history exists. Keep read state out of normalized provider contracts, raw source data, and content hashing.

Reconciliation updates already name provider-owned fields, so leave `readAt` untouched for continuously present UUIDs. New imports and reappearances use the null default. Treat as new must explicitly set `readAt: null` instead of copying the old timestamp, while the superseded row retains its value. Board archive/restore requires no read-state writes.

**Alternative considered:** A separate state table or event history adds joins and lifecycle rules without another current owner or use case. A nullable timestamp expresses both states without an independent boolean that can disagree with it.

### Use one explicit, atomic desired-state mutation

Add shared Zod contracts and `POST /api/jobs/read-state` with `{ ids: string[], read: boolean }`. Require 1–50 distinct UUIDs, a strict body, and the existing loopback/same-origin JSON guard before opening SQLite. Reuse the Jobs error envelope. This endpoint serves a single posting, the automatic detail visit, or a selected page; no unbounded “all matching” operation is added.

In one short immediate Drizzle transaction, verify all identifiers exist before updating any. A missing target returns 404; invalid input returns 400. Historical and archived-board targets are valid. Mark read sets the server timestamp only for rows currently unread; marking an already-read row preserves its timestamp. Mark unread clears the timestamp. Return the confirmed `{ id, readAt }` values for the requested postings. Any storage failure rolls back the operation. No provider requests or refresh tasks are scheduled.

Keep `GET /api/jobs`, detail GET, page metadata, and description reconstruction read-only. Extend list/detail response schemas with `readAt`; browser boundaries still validate every response.

**Alternative considered:** Separate single/bulk routes duplicate behavior. An invert/toggle endpoint makes retries ambiguous. Expanding a view into targets on the server could affect jobs the user never selected, especially during concurrent indexing.

### Filter and count the same active unread population

Extend the existing list service with three explicit predicates: Open is current plus active board; Unread adds `readAt IS NULL`; History keeps its existing unavailable-or-archived predicate. Reuse the current stable first-seen/UUID ordering, transactional total/page calculation, and out-of-range clamping. Set both server validation and nuqs defaults to Unread, preserving `view=open` and `view=history` links.

Within Open, add `readStatus=all|unread|read`, defaulting to All when omitted. Apply its predicate before counting and paginating, and ignore it for Unread/History. Use the effective filter in the list query key, nuqs URL, and selection scope. Filter changes reset page one and clear selection mode; view changes reset the filter to All. Placeholder results may span pages only within the same view and read-status filter. A Read-filtered empty state describes the filtered population and offers Show all open jobs. Counts continue to describe the entire active unread inbox.

Add a read-only `GET /api/jobs/unread-count` returning `{ unreadCount }`, using the same active-unread predicate. A shared query under `["jobs", "unread-count"]` supplies both the compact Jobs navigation count and the Unread tab, avoiding separate independent UI counters. Do not derive the workspace count from the currently displayed page or refresh result totals. Initial loading uses an unknown state; a failed initial read exposes a compact accessible unavailable/retry affordance, while a later failure retains the previous count and identifies it as stale.

**Alternative considered:** A denormalized counter would need coordinated updates for imports, absences, replacements, read mutations, and archival. A local aggregate query avoids that extra source of truth. Fetching a full list merely to populate navigation would read unnecessary job data.

### Consume automatic marking once per actual route entry

Send the desired-state POST only after the active full-details client has successfully obtained a valid posting to display. Prefetched server output and API reads never call it. Use a small pathname-entry tracker in the persistent shell to distinguish leaving and returning to `/jobs/[id]` from rerenders, focus events, metadata reads, and query refetches. A visit remains the same while that pathname remains active; a real return, including back/forward restoration, receives a new entry identity even if the router preserves component state. This tracker is in-memory feature support, not persisted navigation history.

Consume the active entry before dispatching its automatic write, and retain that consumed entry across effect replay or details remounts within the same shell visit. Require the posting to match the currently active detail pathname, so a late background response for an exited route cannot mark it read. An automatic failure remains consumed and exposes an explicit retry action rather than restarting on every render. A later actual entry can try again. This also prevents a subsequent manual Mark unread from being undone by the current visit.

Automatic marking uses the same mutation lifecycle as explicit writes. Serialize read-state mutations within the query client using one mutation scope, and disable explicit read controls while a read-state write is pending. This keeps the first implementation simple and prevents overlapping automatic/manual/bulk responses from reversing local UI state. The mutation hook owns cache updates even if its initiating view unmounts. Separate browser tabs retain normal last-committed-write semantics; their next local refetch observes persisted state.

**Alternative considered:** Writing from a server page, metadata callback, or GET mistakes prefetch for a visit. An effect keyed to `readAt` immediately undoes Mark unread. A component-local “already marked” flag alone can miss a back/forward return when route state is retained or repeat on an unrelated remount; the persistent pathname boundary supplies the missing visit distinction.

### Keep confirmed server state and invalidate the existing Jobs family

Put the count query and read-state mutation hook beside the Jobs feature. On mutation start, cancel relevant Jobs reads so older in-flight results cannot replace confirmed mutation results. On success, apply returned read-state values to any cached details that are present and invalidate the Jobs query family so list membership, totals, and counts are reread. Await the active refreshes before treating the interaction as settled. If a write fails, retain the previous confirmed values; do not optimistically remove unread cards or decrement counts.

Existing board mutations and completed refreshes already invalidate `["jobs"]`, which will include the unread count. Treat as new continues to invalidate that family before navigating to the replacement. A replacement starts unread in storage; actually entering its newly created detail route then follows the same read-on-visit rule as any other posting.

**Alternative considered:** Manually adjusting counts and every paginated list produces fragile bookkeeping when a write races with indexing or archival. Confirmed results plus scoped invalidation fit the existing local-data architecture without rollback machinery.

### Compose accessible cards and page-scoped selection

Keep the current tabs/refresh toolbar mounted before list data arrives. Add the Unread tab, a concise read-state indicator that does not rely on color, and a contextual Mark read or Mark unread action to cards and details. Keep normal browsing free of card checkboxes and bulk controls. A stable Select jobs button uses pressed state to toggle selection mode without changing its label or forcing focus. In that mode, a native button composed from the installed Button primitive covers the card, and selected cards have a border/checkmark. Keep the title link, company link, and individual read action mounted, visible, and independently operable above that button. Reserve the checkmark's space in both modes. The selection button also stays mounted, but is invisible, inert, and hidden from accessibility APIs while browsing. Normal mode retains the stretched native details link; selection mode limits it to the title, letting the remaining card toggle selection without navigation. Titles, metadata, and actions wrap when enlarged text or narrow widths need more room.

Store a nullable page-scoped selection object in the list component: null means browsing, while a scoped UUID array means selection mode. Keep Select jobs mounted even while loading or empty, disabling entry when no confirmed jobs are available. Only selection mode exposes a bottom dock containing a joined selected-count/X control, Select all, icon-labeled bulk actions, and Done. The X clears selected UUIDs without leaving selection mode; all dock controls remain visible at zero selected. Select all always selects the displayed page rather than toggling it off, and exposes page scope in its accessible name. Its pressed state reports whether every visible posting is selected. Reserve count width while allowing it to shrink and wrap with enlarged text. End the mode on Done, Escape, the header toggle, or view/filter/page changes. Successful read actions remove only their submitted UUIDs from selection, preserving unrelated selected jobs when an individual action is used. On same-page data refresh, intersect selection with the confirmed visible UUIDs without selecting newly arrived jobs. Disable selection and submission while displaying a previous-page placeholder or applying a read-state write. Capture the selected IDs at submission; never expand targets based on later query results.

Build our own reusable ActionBar, ActionBarSelection, ActionBarSelectionCount, ActionBarSelectionClear, ActionBarGroup, ActionBarItem, ActionBarSeparator, and ActionBarClose compositions in `components/action-bar.tsx`, following shadcn naming, typed props, data slots, cn merging, and explicit exports. Use the [DiceUI action-bar anatomy](https://diceui.com/docs/components/base/action-bar) as the reference, compose the installed Button/Separator and Base UI Toolbar, and keep selection IDs, mutation handlers, Escape dismissal, and focus restoration in the Jobs feature. Toolbar provides roving arrow-key navigation; disabled actions remain discoverable and focused actions stay mounted through pending writes. Use MailOpen for Mark read and Mail for Mark unread, matching individual actions. Use no extra UI dependencies or generic selection state framework. Open retains the CLI-installed ToggleGroup. Application selection/filter behavior stays outside `components/ui`. Keep pending/error messages near their action and announce bulk outcomes politely. When a successful action removes the focused unread card, move focus to the next usable result or the list/empty-state heading. Skip inactive selection buttons when restoring browsing focus. Preserve focus when the action's control remains present. A confirmed empty Unread view offers Open; the existing add-board/not-yet-indexed states still take precedence when appropriate.

Place the dock after the list and pagination, sticky above the bottom safe area, with wrapping groups at narrow widths. Enable viewport-fit=cover so the safe-area inset can apply. Keep it mounted but invisible, inert, and hidden from accessibility APIs outside selection mode, reserving its space instead of inserting controls above the list. Visibility changes instantly as one surface: composed buttons must override the primitive's transition-all so they cannot linger after the surface hides. Card links and buttons reserve bottom scroll margin so keyboard focus can clear the dock. Done, the header toggle, and Escape are unavailable during an in-flight read write. Done or Escape otherwise clears selection and returns focus to the original mode button, or the empty-state heading when the results are empty. Capture Escape inside the dock before focusable disabled buttons consume it; keep the document listener for the rest of selection mode. A header toggle keeps its existing focus without an extra focus call. The temporary variant picker, alternate implementations, and URL guard have been removed.

**Alternative considered:** Cross-page selection and an entire-index Mark all action introduce invisible scope and more confirmation/cancellation behavior. A visible-page maximum matches existing pagination and keeps the operation reviewable.

## Risks / Trade-offs

- **[The first inbox may be large]** → Existing records start unread because earlier visits were not recorded. Explain this once in the change documentation and provide page-scoped Select all / Mark read controls.
- **[Prefetch or retained route state can resemble navigation]** → Keep GETs inert and verify the persistent entry guard against actual entry, Strict Mode replay, refetch, route exit/return, and manual unread overrides.
- **[Read writes race with indexing or another tab]** → Update only the user-owned field transactionally, serialize this client's read writes, and refetch persisted results. Do not introduce cross-tab lock infrastructure.
- **[The count and list are separate local reads]** → They share eligibility rules and cache invalidation, but do not claim a transaction spanning independent requests. Revalidation converges after concurrent imports or archival without client arithmetic.
- **[Marking read removes focused results or empties a page]** → Preserve confirmed results while pending, clamp the refreshed page, clear invisible selections, and deliberately restore focus after removal.
- **[A shared pending scope briefly disables other read controls]** → These writes are short local transactions. Prefer this predictable behavior to per-posting lock bookkeeping until there is a concrete need.

## Migration Plan

- During implementation, generate the additive migration and verify upgrade/replay against a temporary copy of the previous schema containing current and historical data. Verify durability after closing and reopening that temporary database.
- Document `pnpm db:migrate` as the explicit activation step. Implementation and verification must not run it against the user's workspace database or access that database without a separate instruction.
- Complete the migration before using the new app code against an existing workspace. If it has not been applied, preserve the existing actionable storage-not-ready response.
- Roll back application code without dropping the additive column or rewriting migration history. Older projections ignore the extra field; retain saved read state for a subsequent corrected release.

## Verification Plan

These are required implementation checks, not completed results. Use focused migration/service/route tests for upgrade and replay, durable 21-unread arithmetic, content updates, refresh failure, observed reappearance, Treat as new, archival/restoration, stable pagination, atomic bounded writes, and local-origin rejection. Keep fixtures offline and SQLite work in unique temporary directories.

Use React interaction tests for the default and URL-selected tabs, shared count/loading/error states, independent card actions, selection scope, pending/failure retention, keyboard focus after removal, real detail entry, no marking during loading/prefetch, Strict Mode replay, mark-unread stickiness, and leaving/returning through navigation. Preserve existing sanitized-description and refresh-trigger coverage. Run repository formatting, lint, tests, type checks, provider-export checks, and an isolated production build without using the user's database, running server, or ordinary build output. Browser verification remains a separate user-authorized action.
