## Why

Indexed jobs currently show what is available, but users cannot keep track of what they have already reviewed. A persistent unread inbox makes new openings and unfinished reading visible across refreshes and restarts.

## What Changes

- Make Unread the default Jobs view, alongside Open and History, as selected by the user. Preserve explicit Open/History URLs and the existing stable, bounded pagination. Add an All / Unread / Read status filter within Open so previously read available jobs are easy to revisit.
- Persist read state per internal posting. Existing indexed records and new posting identities start unread; ordinary source edits and refreshes preserve the current state.
- Mark a posting read when its full local details are actually displayed. Lists, metadata generation, route prefetches, and background reads remain read-only. Marking unread while details are open remains effective until another visit or an explicit read action.
- Add individual Mark read / Mark unread actions on cards and details, plus an explicit Select jobs mode for page-scoped bulk actions. Normal browsing has no card checkboxes or bulk toolbar. Selection mode preserves title/company links and individual read actions, adding stable card selection buttons and a bottom dock with a selected-count/X control, Select all, matching read/unread icons, and Done. The X clears selection without closing the dock. Done or Escape returns to browsing, with focus restored to the mode button or the empty-state heading when no results remain. Rapid selection toggles keep the header label and card geometry stable, with no delayed dock remnants. Bulk actions target only the selected posting identities, with a maximum of 50 per operation.
- Show the active unread count beside Jobs navigation and the Unread tab. Exclude unavailable/superseded postings and archived boards from this count and the Unread view, while retaining their stored state and history.
- Keep confirmed content and state available when local mutations fail, with accessible pending, error, retry, empty, and selection behavior. Provider refresh activity remains separate from unread information.

Text search and broader discovery filters, company detail pages, application tracking, AI, background timers, and external notifications remain separate roadmap themes. Implementation evidence is recorded in tasks.md; the approved selection-mode and Open read-status refinements are included in this change.

## Capabilities

### New Capabilities

- `unread-inbox`: Durable posting read state, actual-visit marking, explicit single/bulk changes, active counts, and usable failure recovery.

### Modified Capabilities

- `job-browsing`: Add the default Unread view and its URL/loading/empty behavior, preserve independent card controls, and replace the previous prohibition on detail-visit read changes with the actual-visit contract.

## Impact

- Extend `packages/db` with an additive Drizzle migration for posting read state. Keep the existing migrations, posting identities, retained content, boards, and refresh records intact. Migration remains an explicit user command.
- Extend the Jobs service and shared Zod contracts with Unread filtering, Open read-status filtering, read state, a local count query, and guarded bounded read-state mutations. Reuse the existing loopback JSON mutation guard; provider adapters and refresh scheduling need no new behavior.
- Extend Jobs cards, details, the shared navigation, and TanStack Query invalidation. Keep view/read-status/page in nuqs and reuse the installed UI primitives; install missing primitives through the configured shadcn CLI.
- Add focused temporary-SQLite migration/lifecycle tests and route/React interaction coverage, including the agreed ten imported minus four read plus fifteen new equals twenty-one unread example. Update product documentation when implementation is complete.
