# Plan 001: Keep collection controls accessible and predictable

- Status: complete
- Planned at: `e5e2c3e`, 2026-11-11, including the uncommitted navigation implementation.
- Priority: P1. Effort: S. Risk: low. Depends on: none.
- Scope: shared collection search/filters/pagination, Jobs and Boards clients, board rename, and their focused tests. No schema, provider, database, or new roadmap features.

## Current state and intent

`apps/web/src/components/collection/search-input.tsx` resets a pending draft only when `previous !== value`; an explicit clear of an already-empty URL value cannot cancel that draft. Jobs' Clear filters omits `readStatus`, while a confirmed board rename can unmount its focused editor when the new name stops matching search. Property menus label the input but leave cmdk's linked root label empty. Property inputs also inherit 14px text on mobile.

Collections must retain URL filters, layout, reader, and page-scoped selection as specified in `openspec/changes/archive/2026-11-18-restructure-workspace-navigation/specs/local-discovery/spec.md`. Preserve actual-visit read marking and manual unread behavior. Match existing typed nuqs updates, official shadcn compositions, and temporary-data interaction tests in `apps/web/src/features/jobs/inbox.test.tsx` and `apps/web/src/features/boards/boards-client.test.tsx`.

## Steps

1. Give SearchInput an explicit reset counter and cancel drafts when that counter changes, even if `value` is unchanged. Jobs and Boards increment it for deliberate filter resets, without remounting the focused input. Reset Jobs' read status to `all`, retaining pinned availability and fixed board scope.
2. After confirmed rename, restore focus to the collection Status control if the original focused row disconnected and focus fell to the body. Restore Rename-button focus when the row stays visible only if focus is still at the origin or body; never steal focus from another live control. Reconcile a disconnected row in the collection's post-render effect, after cache updates reach the DOM.
3. Give each application Command a nonempty `label`, using the existing search labels, and size its input `text-base md:text-sm`. Give options unique property/value identities plus searchable label keywords so same-name boards remain keyboard selectable.
4. Move focus and document scroll to the results only after explicitly requested pagination resolves. Do not move focus while typing, filtering, or refreshing; cancel an obsolete pagination request after a scope change.
5. Share one presentation-aware board title style across heading, rename mirror, and editor. Use native named posting navigation, and tabular figures for the unread badge and board timestamps.

## Verification and done criteria

- Add focused tests for same-value draft cancellation, combined search/read-filter clearing, filtered rename focus, named property/value comboboxes, duplicate-name keyboard choices, and pagination focus/scroll.
- `pnpm test --reporter=dot`, `pnpm lint`, `pnpm format:check`, and fresh workspace TypeScript checks must exit 0. Use Node 24.19.0/pnpm10.28.0.
- Run production verification only in a temporary source/dependency copy excluding `.env*` (except the example), `.data`, and `.next`, with its own `JOB_BOARD_DATA_DIR`. Do not change the running app's output or open its database.
- No commits, archival, migration, browser, or new server. Browser/screen-reader rendering remains explicitly unverified.
- Stop and report if a fix requires changing the indexing or read-state contract; do not improvise a migration.

## Maintenance

Any future Clear filters/reset path must cancel its pending search as well as its committed URL state. cmdk labels must be supplied at its root, because its generated `aria-labelledby` takes precedence over an input's `aria-label`.

## Completed verification

267 tests across 29 files, lint, formatting, strict validation of all 11 OpenSpec items, fresh Next type generation, workspace TypeScript, and the isolated production build pass. The Spec review found a remaining visible-row focus steal; it is corrected and covered for both visible and search-filtered rows. No browser verification was performed.
