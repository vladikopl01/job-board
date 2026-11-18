## Saved workspace layout

- [x] Initialize the installed sidebar from its request cookie through the root layout and provider chain, retaining expanded fallback and independent mobile behavior.
- [x] Verify toggle persistence and the first server render for collapsed, expanded, missing and invalid preferences.

## Completion

- [x] Update navigation documentation, pass offline checks and isolated type/build validation, then sync and archive the completed change.

## Verification and closeout

All 353 offline tests across 35 files pass using `pnpm exec vitest run --maxWorkers=1 --testTimeout=20000`. Initial concurrent runs hit interaction-test timeouts under load; the final serial run has no failed or skipped tests. Interaction fixtures clear saved column preferences between independent cases. Formatting, lint, 12 strict main specifications, fresh route generation and all workspace TypeScript checks pass. An isolated Next.js 16.4.6 production build passes with identical production source. Shell pages are request rendered to restore the sidebar cookie before hydration.

No browser, dev server, provider refresh, live database, migration or daily-driver build output was used for verification. Integration tests use temporary SQLite files; the isolated build's data directory was never created. Rendered appearance and cross-platform execution remain unverified. Restart an already running server after upgrading so its connection registers the discovery functions; no new migration or reindexing is required.

The behavior is synced to the main specifications and archived on 2026-11-18.
