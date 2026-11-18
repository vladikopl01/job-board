# Compact collection controls

Follow-up to the latest screenshots, across Inbox, Jobs, board collections/details and the shared shell. This supersedes the earlier floating pagination, outlined navigation badge and two-row collection toolbar. Existing read-state, query, reader and board-management behavior remains the underlying contract.

## Findings and corrections

| Severity | Owner         | Confirmed cause                                                                                                          | Correction                                                                                                                                                                                                   |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HIGH     | Layout        | Sticky pagination and the fixed selection dock overlap results and use competing bottom offsets.                         | Portal one divided footer below the workspace scroller. Place selection actions above compact pagination, with no floating surface or overlap offsets.                                                       |
| MEDIUM   | Layout/UI     | Layout and actions occupy a separate toolbar row; control sizes and alignments differ.                                   | One responsive toolbar: search/availability/filter/sort left, actions and icon-only layout control right. Use installed control sizes, Select toggle, New and Refresh labels, and start/end popup alignment. |
| MEDIUM   | UI            | Add rule immediately creates the first field; each rule duplicates reorder controls.                                     | Add filter/sort opens a searchable field list. Choose before adding. Retain one drag handle with the installed keyboard sensor.                                                                              |
| MEDIUM   | Colors        | Fields, buttons, popup outlines and separators use different border colors; the navigation count merges with hover fill. | Alias input/sidebar borders and popup outline rings to the shared border token. Give navigation counts a distinct gray fill without a selected outline; hide badges until their count is known.              |
| HIGH     | Accessibility | cmdk points search inputs at an empty generated label, overriding their aria-label.                                      | Require and forward the field-list label to the command root, including column and value pickers.                                                                                                            |

## Coverage and evidence

The final Spec review also found that Sortable ignored default-prevented activation events, while the installed keyboard sensor prevents its own activation event. Restoring the installed start/drop behavior lets keyboard reorder commit. A focused check uses the actual keyboard sensor, verifies its announcement, and asserts the resulting rule order. Toolbar wrapping now uses its content basis so controls cannot shrink beside the action group toward zero.

- Accessibility: actual cmdk field search/selection, keyboard/touch selection, footer focus recovery and unknown-count retry interactions. Source inspected: AppShell, WorkspaceFooter, CollectionPagination, ActionBar, DataTableFieldPicker, filter/sort menus and Faceted.
- Layout: user screenshots and DOM ownership checks for the footer outside the workspace scroller. Toolbar groups can wrap on narrow screens while retaining their order. Browser geometry, safe areas, RTL and zoom remain unverified.
- Writing/typography: concise action names, accessible icon-only layout name, readable sort/operator labels, existing truncation and tabular counts. Text rendering remains unverified.
- Color/UI: one normal border token, separate navigation count surface, installed shadcn Toggle/Button/Select and side-aligned popovers. Rendered contrast and pointer states remain unverified.
- Motion: no new animation. Selection visibility is immediate, layout changes retain installed immediate behavior, and the footer uses no backdrop blur.

## Validation

All 283 tests across 30 files pass, including the focused collection interactions and keyboard drag/drop. Final Standards/Spec findings are resolved, lint/format and all 11 strict OpenSpec validations pass, and route generation, all TypeScript checks and the production build pass in an isolated copy. Evidence is recorded in [code-review.md](code-review.md). CLI dry-run/diff output was reviewed for the changed installed primitives; no replacement primitive or dependency upgrade was introduced.

No browser, dev server, provider refresh, migration or live database was used. Visual approval is not claimed.

## Preset and detail follow-up

The subsequent screenshot brief replaces the custom theme above with shadcn preset `b1D0dv72`: Base UI/Mira, neutral colors, Inter, and generated component sizes. The preset was installed with the CLI; dry-run and complete component diffs were reviewed before reinstalling primitives. The CLI resolves the resulting project to the exact requested code with no fallbacks. Dependencies and the lockfile are unchanged by this follow-up. Existing keyboard, accessible-label, strict TypeScript and side-alignment adaptations remain intact.

Availability and Status now live inside Filter; empty filter/sort popovers use a compact width. Layout is the first control in the right action group and uses the installed radio menu, closing after selection. Refresh keeps its icon and label, rotates the icon while busy with reduced-motion support, and retains screen-reader progress without an extra activity row. Posting actions share the preset Button sizes and styles. The reader is capped at 46rem with icon-only Expand beside Close on the right. Board detail headings keep their provider badge adjacent, with management actions grouped on the left.

All 283 tests, lint, TypeScript checks, 11 strict OpenSpec validations and an isolated production build pass for this follow-up. Browser appearance remains unverified under the project’s no-browser instruction.

## Badge and table follow-up

The next screenshot refinement preserves preset b1D0dv72 and uses semantic application tokens for company-link hover, violet/teal providers and distinct neutral read states. Counts now use the requested compact outline badge; availability includes an icon. The selection toggle composes Base UI Toggle with the installed Button, changing to Done while active, and the counter uses matching density. Card source URLs become ghost icon links next to their heading; details retain the full URL. Archive and remove controls use destructive variants.

The existing tablecn Base UI DataTable was compared with the official CLI dry-run/diff. Its controlled pagination, row metadata and keyboard resizing remain. The new ContextMenu primitive was CLI-installed without dependency, lockfile or preset changes. Column headers sort on left click and support Shift-click sorts; right-click and Shift+F10 expose sorting, insertion of hidden columns, moves, pinning, removal and fitting, following the fm-editor structure. Pinned groups have header icons and a boundary divider. The compact Columns picker offers reset and unpin-all. Row whitespace activates its real primary link or job selection; nested links, controls and portaled actions retain their own clicks.

All 286 tests pass, including six focused collection tests. Lint, formatting, the installed OpenSpec 1.8.0 CLI's 11 strict validations, route generation, all TypeScript checks and the isolated production build pass. Application source matches the validation copy. Provider and unread badge text exceeds 8:1 contrast in both themes. The latest unpinned OpenSpec CLI additionally reports length warnings in pre-existing requirement paragraphs. No browser, dev server, provider refresh, migration, live database or daily-driver build output was used for this follow-up; rendered appearance remains unverified.

## Virtualization and consistency follow-up

Status is now a regular Boards filter condition, initially Active. It supports the same joining, pausing and removal as other fields; removing it includes both active and archived boards. Legacy status URLs remain supported. All badges compose one application component with color-only variants and preset geometry. The company badge links to its board. Quick read actions are icon buttons with tooltips and accessible names. Details put Apply before Employer posting; active pins are filled; the info button uses the normal icon size. Filter/sort field options match search typography, Add is outlined and both reset labels are Reset.

Job tables always show a compact 32px checkbox column with a select-all/mixed header. An identity test reproduced header and link remounting when opening the reader before the fix. Stable memoized column renderers now consume changing actions through context, preserving table elements through opening and reader navigation. The workspace scroller also reserves its scrollbar gutter.

TanStack Virtual 3.14.26 renders bounded visible ranges in tables, lists and responsive card grids using the existing workspace scroller. Measured grouped card rows preserve order and equal row heights. Focused and reader-active rows remain mounted. Native table spacers and logical row/list positions preserve collection semantics, with normal flow when no viewport is measurable. Pagination and full-collection filtering remain unchanged. New filter/sort requests retain previous results within the same availability view and board scope, with stale-row writes disabled. Tests cover real virtualizer scrolling, focused/active retention, responsive columns, reader DOM identity, delayed query results and checkbox selection.

All 294 tests across 31 files pass. Lint, formatting, whitespace checks and the installed OpenSpec CLI's 11 strict validations pass. Fresh route generation, all workspace TypeScript checks and a production build pass in an isolated copy with matching application source. The preset and installed primitives are unchanged; the only dependency addition is TanStack Virtual and its core. No browser, dev server, provider refresh, migration, live database or workspace build output was used. The isolated data directory was never created. Rendered appearance remains unverified.

## Company links and regular Availability follow-up

The latest corrections replace company badges with plain text links in lists, cards and details; tables use ghost company button links. Table/card read actions are outlined icon buttons with tooltips, while list actions regain labels without tooltips. Active filter/sort counters use a filled contrasting variant of the same badge component. Operator controls reserve the intrinsic width of their widest option instead of stretching across the rule row.

Availability now follows the regular condition workflow, initially Open. It can be paused, removed, joined and URL-restored just like Status; removing it includes retained current and historical postings. Read status combines normally throughout Jobs. The local API's all-retained scope applies these conditions before totals and pagination, and existing explicit Open/History URLs retain their meaning. Inbox stays current-unread only. Previous rows remain mounted across Availability changes in the same board scope, with stale read/selection writes disabled; column definitions stay stable.

All 296 tests across 31 files pass, including Availability filtering before pagination, pausing/removal, AND/OR behavior, legacy URL restoration and pending-result retention. Lint, formatting, whitespace checks and all 11 strict OpenSpec validations pass. Fresh route generation, all workspace TypeScript checks and the production build pass in an isolated copy with matching application source. Dependencies, preset and installed primitives are unchanged in this follow-up. No browser, dev server, provider refresh, migration, live database or workspace build output was used. The isolated data directory was never created; rendered appearance remains unverified.

## Apply actions and window fitting follow-up

Apply now sits beside read/unread throughout job collections. Lists keep labeled actions without tooltips; cards and tables use outlined icon actions with accessible names and tooltips. The local list response exposes the retained application URL, avoiding additional details fetches. Applying opens the employer form in a new tab without changing local read state, selection or reader navigation. The action column is fixed at 80px for both icons.

Tables reuse their existing fitting algorithm automatically on mount, saved-column restoration, width changes and column visibility changes. Resizable columns fit proportionally within their bounds; checkbox/action widths and pinning are preserved. Explicit table width matches the column total, preventing the browser from stretching fixed controls or separating pinned offsets from rendered widths. Manual widths remain until the next fit, row updates do not refit, and narrow tables retain horizontal scrolling once column minimums cannot fit.

All 300 tests across 31 files pass, including direct Apply actions in every layout, route response coverage and responsive sizing with restored/customized columns. The final API/syntax corrections also pass all 36 affected interaction checks. Lint, formatting, whitespace checks and all 11 strict OpenSpec validations pass. Fresh route generation, all workspace TypeScript checks and the production build pass in an isolated copy with matching application source. Dependencies, preset and installed primitives are unchanged. No browser, dev server, provider refresh, migration, live database or workspace build output was used. The isolated data directory was never created; rendered appearance remains unverified.

## Neutral palette and reader icon follow-up

The better-colors review covers company hover/focus, read-state badges and collection/unread counters. The affected inventory was two identical 14% foreground/background mixes, the preset muted pair and primary-filled option counters. Components now consume semantic roles mapped to the installed neutral ramp, following the [shadcn token convention](https://ui.shadcn.com/docs/theming). No gray values are invented in component files; provider and availability colors remain outside this correction.

| Severity      | Location                                                                                                                        | Before                                                                | After                                                                                                                    | Why                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| HIGH, fixed   | `apps/web/src/components/app-badge.tsx:11`; `apps/web/src/app/globals.css:71`                                                   | Small muted badge text measured 4.34:1 in light mode.                 | Neutral 600/400 foregrounds on the preset muted surface measure 7.15:1 light and 5.83:1 dark.                            | Measure the actual token pair: Read labels now clear WCAG 2.2 1.4.3 AA's 4.5:1 text threshold.     |
| MEDIUM, fixed | `apps/web/src/app/globals.css:72`; `apps/web/src/components/app-badge.tsx:13`; `apps/web/src/features/jobs/company-link.tsx:22` | Company hover and Unread shared a custom mixed gray.                  | Company hover/focus uses accent/foreground; Unread uses neutral 200/700 in light mode and 700/100 in dark mode.          | Match the project's color system: separate interaction and state roles use existing palette steps. |
| MEDIUM, fixed | `apps/web/src/components/app-badge.tsx:12`; `apps/web/src/features/jobs/unread-count.tsx:17`                                    | Option counters used the primary fill; unread totals used an outline. | Filter, sort and unread totals share the filled neutral emphasis pair.                                                   | One color, one meaning: counts share one treatment without primary-action emphasis.                |
| LOW, fixed    | `apps/web/src/features/jobs/job-reader.tsx:76`                                                                                  | The four-arrow Expand glyph was visually dense at compact size.       | Two-arrow Maximize2 uses the existing ghost icon-sm link and Lucide's default stroke, matching Close's component sizing. | Match the icon convention: keep the installed geometry and native navigation semantics.            |

Measured from the declared semantic tokens and the installed Tailwind neutral ramp, all affected colors have zero chroma and lie inside sRGB. The generated production CSS retains the referenced neutral primitives, aliases and utilities.

| Pair                         | Light contrast | Dark contrast |
| ---------------------------- | -------------- | ------------- |
| Read / muted badges          | 7.15:1         | 5.83:1        |
| Unread / all count badges    | 8.25:1         | 9.53:1        |
| Company hover and focus text | 16.42:1        | 14.48:1       |
| Reader icons on hover        | 18.15:1        | 14.48:1       |

All 52 focused tests across four files pass, including reader, company links, unread totals and collection controls. After retaining the native expand link, all 29 reader/inbox checks also pass. Lint and formatting pass. Fresh route generation, workspace TypeScript checks and the production build pass in the isolated copy with matching application source. Dependencies, preset and installed primitives are unchanged; no browser, dev server, provider refresh, migration, live database or workspace build output was used, and the isolated data directory was never created.

Not verified: rendered appearance, computed browser colors, pointer/focus appearance and assistive technology behavior in either theme.

Approve for the inspected source and declared token checks.

## Reader entrance stagger follow-up

Applied the animate and animation-performance skills to the requested panel entrance. The heading/actions, facts and description use CSS opacity/transform transitions: 180ms, an 8px rise and 40ms steps, finishing within 260ms. The Sheet retains its 200ms slide and shares cubic-bezier(.23,1,.32,1) easing. This gives the opening overlay spatial context while keeping repeated reading immediate.

The animation follows Base UI's opening state. The controlled reader starts closed and opens on the next animation frame because the installed Sheet skips entry when mounted already open. Cleanup cancels that frame; there are no per-frame state updates or new dependencies. Skeleton groups use the same entrance; Previous/Next, refetches and late content do not replay it. Focused content appears immediately. Reduced motion uses an undelayed 120ms opacity fade without translation.

All 40 focused reader/collection tests pass; the failure-recovery check now awaits the reader's asynchronous opening. Lint, formatting, whitespace checks, all 11 strict OpenSpec validations, workspace TypeScript checks and the isolated production build pass. Generated CSS retains the easing, motion-preference gate, stagger timings and immediate focus override. Application source matches the validation copy; the preset, dependencies and installed primitives are unchanged. Rendered timing, frame performance and pointer feel remain unverified; no browser, dev server, provider refresh, migration or live database was used, and the isolated data directory was never created.

## Follow-up on 2026-11-18

The layout trigger now displays the selected List, Cards or Table icon and label; its menu omits the redundant Layout heading. Collection search and outlined buttons share the border token. Board entry includes example URL/company placeholders while preserving live name suggestions. Columns now composes Popover, Field and the installed Checkbox rather than drawing selection indicators inside options; labels, required-column disabling, search, keyboard Space, Escape and preference persistence are retained. Apply uses a paper-plane icon in all presentations, with class merging preserving its outline.

All 39 focused collection, board form, board interaction and route checks pass, including the real checkbox keyboard path. Browser appearance remains unverified. Complete-workspace checks are recorded with the subsequent discovery change.

## Source-backed discovery and sidebar reload (2026-11-18)

Country, Region and Department now use the ordinary property controls in Inbox, Jobs and board-scoped collections. Deterministic source projections run before SQL totals/pagination for current and historical records, preserving original locations, eligibility text, department/team labels and read identities. Broad regions do not invent exact countries; missing classifications remain Unknown and unfamiliar supplied departments remain Other. Their optional columns start hidden, including when restoring older saved layouts. Restored column widths fit the available table viewport even when visibility is unchanged.

The root layout restores the installed sidebar's seven-day cookie before the initial render; expanded, collapsed and fallback behavior have server-render coverage. The existing toggle saves both directions without changing mobile drawer behavior. View triggers show the current label without a Layout heading, toolbar borders use the same semantic token, board fields show example placeholders, and column selection uses actual labeled shadcn checkboxes.

All 353 tests across 35 files pass serially with a 20-second per-test allowance after concurrent UI runs hit timeouts under load. Formatting, lint, strict specs, isolated route generation, workspace TypeScript checks and the isolated production build pass. Production source matches the validation copy. No browser or live data was used, and the isolated data directory was never created. Rendered appearance and cross-platform execution remain unverified. The discovery functions need a server restart after upgrading, with no new migration or reindexing.
