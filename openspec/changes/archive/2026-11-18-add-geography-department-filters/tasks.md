## Source-backed discovery

- [x] Add fixed country/region data and conservative geography/department normalization with ambiguity, exclusion and missing-data coverage.
- [x] Register deterministic SQLite projections and apply validated membership predicates before totals/pagination, preserving source records and current/historical scope.
- [x] Add the shared Country, Region and Department property options and hidden optional columns across layouts, including URL and compound-condition interaction coverage.

## Completion

- [x] Update user and architecture/roadmap documentation with implemented behavior and normalization limits.
- [x] Pass focused/full offline tests, formatting, lint, strict specs, isolated route/type checks and production build; record actual verification limits and finish specification closeout.

## Verification and closeout

All 353 offline tests across 35 files pass using `pnpm exec vitest run --maxWorkers=1 --testTimeout=20000`. Initial concurrent runs hit interaction-test timeouts under load; the final serial run has no failed or skipped tests. Interaction fixtures clear saved column preferences between independent cases. Formatting, lint, 12 strict main specifications, fresh route generation and all workspace TypeScript checks pass. An isolated Next.js 16.4.6 production build passes with identical production source. Shell pages are request rendered to restore the sidebar cookie before hydration.

No browser, dev server, provider refresh, live database, migration or daily-driver build output was used for verification. Integration tests use temporary SQLite files; the isolated build's data directory was never created. Rendered appearance and cross-platform execution remain unverified. Restart an already running server after upgrading so its connection registers the discovery functions; no new migration or reindexing is required.

The behavior is synced to the main specifications and archived on 2026-11-18.
