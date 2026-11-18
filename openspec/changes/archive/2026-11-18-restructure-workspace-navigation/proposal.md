## Why

The current Jobs page mixes reviewing unread postings with browsing availability and history, while board links lead to unfinished pages. A consistent workspace shell and connected review/search flows will make the local collection easier to navigate and revisit.

## What Changes

- Use the official shadcn sidebar-08 inset composition with the existing Base UI/base-nova configuration. Provide Dashboard, Inbox, Jobs, and Boards navigation; open Dashboard by default.
- Separate the unread Inbox from the Jobs library, preserving existing explicit list URLs. Keep Open/History and read-status filtering in the library.
- Add bounded local title/description search and company-board filtering before totals and pagination, with URL-restored state.
- Reuse posting details in a stable desktop reader and a narrow-screen reading view. Keep the originating list mounted, provide previous/next/close navigation, and preserve read-state overrides and the existing selection dock.
- Provide real board detail pages linking source controls to that board's postings. Replace the placeholder Workspace page with an actionable Dashboard using existing local data.
- Preserve existing posting identities, refresh coordination, board archival, and persistent read state. No database migration, new application workflow, or background schedule is required.

## Capabilities

### New Capabilities

- `workspace-navigation`: Inset application shell, daily landing destination, actionable overview, connected board details, and context-preserving reading.
- `local-discovery`: Local text and board filtering with bounded, shareable results and accurate empty states.

### Modified Capabilities

- `job-browsing`: Separate Inbox from the library, replace company placeholders with working navigation, and reuse retained details in a responsive reader.

## Impact

Changes are limited to web routes, application compositions, the existing Jobs query service/contracts, CLI-installed UI components, focused tests, and product documentation. The implemented but unarchived unread-inbox and board-view changes remain intact. The user explicitly authorized direct implementation after exploration; planning and implementation proceed together without another approval checkpoint.
