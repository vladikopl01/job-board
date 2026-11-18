## Posting persistence

- [x] Add nullable `postings.readAt` through a generated additive Drizzle migration and its snapshot/journal metadata. Verify upgrade from the previous schema, preserved current/history records and refresh data, null initialization, and safe migration replay using temporary SQLite.
- [x] Preserve read state during reconciliation and explicitly reset it for Treat as new. Extend focused lifecycle coverage for the 21-unread example, content edits, failed refreshes, observed reappearance, archived-board exclusion/restoration, retained historical state, and close/reopen durability.

## Local API

- [x] Add strict shared read-state request/response schemas and one atomic desired-state service plus guarded `POST /api/jobs/read-state`. Verify idempotency, historical targets, exact selected-ID scope, invalid/duplicate/empty/oversized/missing targets, origin/content-type rejection, and rollback on storage failure without provider calls.
- [x] Extend list/detail contracts with `readAt`, add the Unread predicate and server default, and expose the read-only unread-count endpoint using the same eligibility rules. Verify active counts, existing Open/History behavior, stable 50-item pagination and clamping, storage-not-ready failures, and inert detail/metadata GETs.

## Shared client state and detail visits

- [x] Add the shared read-state mutation hook with serialized writes, conflicting-action pending state, stale-read cancellation, confirmed detail-cache updates, and Jobs-family invalidation. Verify failed writes retain confirmed state and successful writes settle correctly even when the initiating view unmounts.
- [x] Add the persistent pathname-entry guard and automatic marking after actual details display. Add explicit detail Mark read / Mark unread and retry controls. Verify direct entry, loading/not-found/prefetch inertness, Strict Mode replay, manual-unread persistence through refetch/rerender, late responses after exit, and real back/forward return.
- [x] Share the unread-count query between Jobs navigation and the Unread tab. Provide compact accessible unknown/loading, verified-zero, stale/unavailable, and retry states; verify counts refresh after read writes, indexing, replacement, and board archive/restore without conflating refresh results.

## Inbox browsing and selection

- [x] Install the missing Checkbox primitive through the configured shadcn CLI, reviewing dry-run/diff, generated code, dependencies, and stylesheet output before applying repository formatting. Keep application selection behavior outside `components/ui`.
- [x] Add the default Unread tab and nuqs URL state while preserving explicit Open/History links, immediately available tabs/toolbar, view-specific skeletons, confirmed background content, and accurate empty states with an Open path. Cover default/view/page restoration and pending/failure behavior in React tests.
- [x] Add a non-color-only read-state indicator and independent card Mark read / Mark unread actions without disturbing stretched details links, company links, locations, or native modifier-click behavior. Verify keyboard operation, pending/errors, and action clicks that do not navigate.
- [x] Add page-scoped selection with Select all / Clear selection, selected-count bulk actions, fixed submitted IDs, and a maximum of 50. Clear selection across views/pages and remove submitted selected IDs after success, prune removed IDs on background reads, prevent placeholder selection, and preserve selections on failure. Verify newly arriving jobs remain unselected, page clamping, polite outcome announcements, and focus after unread results disappear.

## Documentation and completion checks

- [x] Update README, OpenSpec context, architecture, and roadmap to describe implemented unread behavior, default navigation, page-scoped bulk actions, existing-record initialization, and the explicit migration command. Keep later discovery/AI/application themes distinct.
- [x] Run formatting, lint, the focused and full offline test suites, fresh route/workspace/root type checks, provider-export checks, and an isolated production build on the pinned runtime. Use only temporary test databases and separate build output; do not access the user's database, start a server, or use a browser. Record actual results and unresolved verification limits here.
- [x] Validate this change strictly and review the implementation against both capability deltas before marking implementation complete. Leave main-spec sync, archival, commits, and pushes for separate user-directed actions.

## Approved browsing refinements

- [x] Replace always-visible card checkboxes with explicit Select jobs / Done mode, native card selection buttons, selected borders/checkmarks, and mode-only bulk controls. Preserve ordinary native links and single read actions, page-scoped bounds, retry behavior, keyboard/touch operation, and predictable focus; end selection mode across views/filters/pages.
- [x] Add a URL-backed All / Unread / Read filter within Open, using a CLI-installed ToggleGroup. Apply filtering before totals/pagination, isolate query caches/placeholders, reset pages/selections on filter changes, retain independent Unread/History/count semantics, and provide accurate filtered empty/loading states.
- [x] Extend focused service/route/interaction tests and update README, architecture, roadmap, and context for both refinements. Run the offline suite, formatting, lint, isolated type/build checks, and strict OpenSpec validation; record actual results without touching the user's database, servers, ordinary build output, or main specs.

## Approved bottom dock

- [x] Promote the chosen bottom dock into Jobs with reusable shadcn-style ActionBar compositions over installed Base UI controls. Preserve card/header geometry, scoped selection, pending/failure behavior, keyboard navigation, Escape dismissal, and focus restoration; remove the temporary variants, picker, and URL guard.
- [x] Update focused interaction coverage and planning/product documentation, then run the offline suite, formatting, lint, strict OpenSpec validation, and isolated type/build checks. Record the actual results and verification limits.

## Approved selection stability refinements

- [x] Keep title/company links and individual read actions visible and mounted across rapid mode toggles. Keep the header label stable, remove inherited visibility transitions, preserve unrelated selected IDs after individual actions, and add the joined count/X, page-scoped Select all, and matching read/unread icons. Support wrapping, enlarged text, RTL, keyboard, and touch.
- [x] Update focused interaction coverage and product/planning documentation. Verify rapid toggles and narrow layouts using the user-authorized harness browser with an isolated source copy and sample database, then run the offline suite, formatting, lint, strict OpenSpec validation, and isolated type/build checks. Record actual results.

## Planning validation

At proposal creation on 2026-11-08, strict validation passed for this change and all eight main specs. Artifact checks confirmed valid local links and whitespace, preservation of all 15 existing scenarios across the three modified browsing requirements, and 14 pending implementation tasks. The repository formatter excludes `openspec/**`; no formatter result is claimed for these documents. At that point, application code and database migrations had not been changed, and implementation checks had not been run.


## Implementation validation

Completed on 2026-11-08 using Node.js 24.19.0 and pnpm 10.28.0:

- `pnpm format:check`, `pnpm lint`, and `git diff --check` pass. Oxfmt continues to exclude `openspec/**`; these planning files were checked separately for whitespace and local links.
- Focused migration, service, route, and React interaction suites pass. The complete offline suite passes: **224 tests in 24 files**.
- A clean temporary source/dependency copy passes `pnpm typecheck`, including fresh Next route types, every workspace, and the root check. The final test-file updates also pass an app type check with incremental output disabled.
- Both browser-safe and server provider package exports import successfully on the pinned runtime.
- `pnpm db:migrate` and its replay pass against a new temporary database. The isolated production build passes and includes both unread endpoints.
- Strict validation passes for this change and all eight main specs. Both capability deltas were reviewed against the implementation, including durable identity/read state, actual-visit marking, bounded atomic writes, count eligibility, selection scope, failures, keyboard use, and focus after removal.
- Checks used temporary databases and separate build output. The user's database and ordinary build output were untouched. No server, browser automation, provider network calls, main-spec sync, archival, commit, or push was performed. Visual browser verification and the cross-platform CI matrix remain unexecuted.

## Browsing refinement validation

Completed on 2026-11-09 using Node.js 24.19.0 and pnpm 10.28.0:

- The configured shadcn CLI installed ToggleGroup and its Toggle dependency after dry-run/diff review. Generated files were reviewed and formatted; no package, lockfile, or stylesheet changes were required.
- Focused interaction coverage verifies keyboard/touch selection without visits or read writes, Done/focus restoration, mode exit across views/filters/pages, bounded IDs, arriving/hidden results, and pending/failure retry. Open filter coverage verifies URL restoration, page reset, independent counts/history, filtered empty/loading states, and cache/placeholder isolation. SQLite and route tests verify filtering before totals/pagination and invalid filters rejected before opening storage.
- `pnpm format:check`, `pnpm lint`, and `git diff --check` pass. The complete offline suite passes: **228 tests in 24 files**.
- A fresh temporary source/dependency copy passes `pnpm typecheck`, both provider-export imports, and `pnpm build`. No database was created by the build. The user's database and ordinary build output were untouched.
- Strict OpenSpec validation passes for this change and all eight main specs. Local planning links and whitespace were checked separately because the formatter excludes `openspec/**`. Both capability deltas were reviewed against the final implementation.
- All 17 tasks are complete. Main-spec sync and archival remain pending; no commits or pushes were made. No server or browser automation was used, so visual browser verification and the cross-platform CI matrix remain unexecuted.


## Bottom dock validation

Completed on 2026-11-09 using Node.js 24.19.0 and pnpm 10.28.0:

- Promoted the chosen dock into Jobs and removed all temporary variant implementations, picker, styles, tests, and route guard. A source/documentation search finds no obsolete component names, imports, or preview query parameter.
- Added our own reusable ActionBar compositions outside `components/ui`, using the installed Base UI Toolbar and shadcn Button/Separator without dependency or primitive changes. Selection state and mutation behavior remain in the Jobs feature.
- All 25 focused inbox/browsing/page checks pass. Coverage includes keyboard/touch selection, retained but inert card actions, dock arrow navigation and wrapping focus, page select/deselect, bulk unread, retained focus after results disappear, Done/Escape dismissal, the empty-state focus fallback, pending dismissal prevention, failed-write retry, and page/filter/view scope.
- The complete offline suite passes: **229 tests in 24 files**. `pnpm format:check`, `pnpm lint`, and `git diff --check` pass. Strict OpenSpec validation passes for this change and all eight main specs; local planning links and whitespace were checked separately.
- A fresh temporary source/dependency copy passes `pnpm typecheck` with fresh route types and `pnpm build`. Verification did not access the user's database, start a server, or alter the ordinary build output. No browser verification ran in this turn; rendered geometry and the cross-platform CI matrix remain unverified for the promoted composition.
- All 19 tasks are complete. Main-spec sync and archival remain pending; no commits or pushes were made.

## Selection stability validation

Completed on 2026-11-09 using Node.js 24.19.0 and pnpm 10.28.0:

- Reproduced the original failure before fixing it: a focused interaction test confirmed that toggles recreated title links, and the user-authorized harness browser showed visible buttons after the dock surface had already become hidden. Composed dock buttons now override the primitive's transition-all, and card controls remain mounted and usable.
- Added coverage for rapid toggle identity, stable header labels, retained single-card actions, preserving unrelated selections, idempotent page selection, clear-without-exit, and disabled pending controls. The browser also found Escape being consumed by a focused disabled dock action; a failing test reproduced it before the dock captured Escape. Pending writes still prevent dismissal.
- All **27 focused inbox/browsing/page checks** and the complete offline suite pass: **231 tests in 24 files**. `pnpm format:check`, `pnpm lint`, and `git diff --check` pass. Strict OpenSpec validation passes for this change and all eight main specs. Planning links and whitespace pass separately; the repository formatter excludes `openspec/**`.
- The harness browser used a separate source/dependency copy and temporary SQLite with 125 sample postings, including 117 active unread jobs. Repeated rapid toggles at desktop and 320px widths retained control identity and measured header/card positions, with synchronized dock/button visibility and no read writes or dock animations. Select all selected only 50 displayed jobs; clear kept the dock and every action visible. A keyboard-triggered bulk action sent exactly 50 IDs, changed the sample unread count to 67, preserved action focus, and allowed Escape from the disabled action afterward.
- Checked 320px, 640px, and desktop layouts, RTL, 200% text enlargement, longer temporary labels, and independently clickable title/read controls. The final 320px LTR/RTL checks at normal and doubled text size had no page overflow or clipped dock controls. The viewport enables safe-area insets. Physical device safe-area rendering and the cross-platform CI matrix remain unverified.
- A synchronized temporary copy passes fresh route/workspace/root `pnpm typecheck` and `pnpm build`; the build created no database. Sample refreshes were deferred, with only the seeded succeeded refresh record remaining and no provider indexing run. The preview tab was closed and its server stopped. The user's database, running app, and ordinary build output were untouched.
- All **21 tasks** are complete. Main-spec sync and archival remain pending; no commits or pushes were made.

## Closeout

Synced to the main specifications and archived on 2026-11-18. Later navigation and collection decisions supersede earlier presentation details. Existing verification limits remain recorded above; archival does not claim additional browser or cross-platform checks.
