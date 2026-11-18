# Changelog

## 0.1.0 — 2026-11-18

The first source release of the local job-board workspace.

- Track Ashby, Lever and Lever EU company boards, index their postings locally, and retain unavailable jobs and source history.
- Browse Dashboard, Inbox, Jobs and Boards with a contextual job reader, individual and bulk read actions, and direct Apply actions.
- Start every collection in Table view. List and Cards remain available through the URL-backed layout menu.
- Search, sort and combine filters across virtualized layouts, including Country, Region and Department narrowing with original eligibility restrictions preserved.
- Customize table columns with visibility, ordering, pinning, resizing and fitting, retained separately for each collection.
- Choose Light, Dark or System appearance and retain the desktop sidebar's collapsed state after reload.
- Accept board names containing spaces, such as `Hyperliquid%20Labs`, and immediately remove query parameters and fragments from pasted board URLs.
- Use the official shadcn preset consistently for controls, badges, colors and recovery messages, with reduced-motion support for the reader's entrance animation.

### Upgrade

Use Node.js 24.19.0 and pnpm 10.28.0. Stop an existing app server, then run:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Use the same `JOB_BOARD_DATA_DIR` for migration and the app if you configured a custom data directory. The unread-state migration retains boards and postings and initially marks existing postings unread. Geography and department filters derive from retained source data without reindexing. Restarting the server registers the new local discovery functions.
