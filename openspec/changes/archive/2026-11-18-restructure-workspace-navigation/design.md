## Context

See proposal.md for motivation. The existing app has persistent Query/JobVisit/Refresh providers, a single Jobs list, retained local descriptions, and page-scoped bulk actions. The unread-inbox change is implemented but unarchived; a separate board-view change persists Active/Archived in the URL. Both must remain intact.

## Goals / Non-Goals

Use existing local services and schema. Reuse the same list and detail compositions across Inbox, Jobs, and board details. No provider adapter, migration, AI, application tracking, normalized geography, or schedule changes belong here.

## Decisions

- Install official `sidebar-08` using the configured shadcn CLI after dry-run/diff review, retain `SidebarProvider`/`SidebarInset`, and adapt its application navigation. Remove demo account, team, and project compositions rather than presenting fictional product features. Keep primitives CLI-owned.
- Add `/dashboard` and `/inbox`; redirect `/` to Dashboard. Jobs defaults to Open, and explicit legacy `view=unread` links redirect to Inbox. Keep existing explicit Open/History URLs and persisted Boards views.
- Add optional `q` and `boardId` to the shared validated list contract. Use parameterized Drizzle `like()` with escaped literal wildcards, applied before count and page selection. Preserve legacy Open-only read-status URL behavior while normal Availability and Read status conditions combine throughout Jobs.
- Use one Jobs composition with an explicit Inbox/library mode and optional fixed board scope. URL `job` selects the reader; the originating list stays mounted and scroll is not reset. A single responsive reader DOM avoids duplicate detail visits. Native links retain new-tab behavior.
- While a reader is open and confirmed list data exists, disable background refetch for that observer. Patch cached list read labels after successful mutations, retaining membership until close. Counts and actual detail data still invalidate normally. This avoids a separate persistent review queue or new database state.
- Reuse JobDetailsClient with a reader presentation. A reader-local visit provider consumes the actual selected identity once per reader visit; the existing route-level guard remains for full-page details. Manual unread survives refetch and responsive resizing.
- Board detail reads the existing boards collection and composes existing source-management controls with a board-scoped Jobs list. Dashboard uses independently retryable existing queries, with actionable links rather than new metrics infrastructure.
- Apply better-layout grouping and logical sizing, better-ui semantic surfaces and immediate frequent interactions, and better-accessibility native links, visible focus, named reader navigation, and mobile focus restoration. Retain the stable selection dock.

## Risks / Trade-offs

- A reading session temporarily contains newly read Inbox rows → explicitly distinguish the current review context, reconcile on close, and retain accurate global counts.
- Page-scoped reader navigation does not cross pagination boundaries → label previous/next as posting navigation and leave bounded page navigation in the collection.
- Existing tests encode the old combined navigation → update those expectations while retaining focused read-state, selection, query-validation, and actual-visit coverage.
- Browser verification is not authorized for this task → use component and temporary-SQLite tests, type checks, and a separate build output; report visual verification limits honestly.

## Migration Plan

No data migration is required. Preserve old explicit URLs, retained records, and provider lifecycle behavior. Verify without accessing the user database or daily-driver build output. Do not archive or commit changes unless requested. When finalizing, sync/archive add-unread-inbox before this change so these newer navigation requirements are applied last.

## Initial implementation verification

Verified on macOS with Node 24.19.0 and pnpm 10.28.0 on 2026-11-11:

- All 253 tests across 27 files passed, including local discovery, API validation, navigation, reader continuity/failure recovery, manual unread, and selection behavior.
- Repository formatting, lint, diff whitespace checks, and all 11 strict OpenSpec validations passed.
- Fresh Next route generation, all workspace TypeScript checks, and the production build passed in a separate source/dependency copy. Private environment files, local data, and the daily-driver build output were excluded. The isolated data directory was never created.
- No browser or visual verification was performed. No application server was started, and no user database was opened or migrated. Cross-platform CI remains separate verification.

## Collection refinements from user review

- The latest screenshot review supersedes the earlier document-flow decision: constrain the shell to `100dvh`, scroll workspace content beneath its header, and overlay a shadcn Sheet reader with independent scrolling. Route focus uses `preventScroll`, and only explicit pagination moves result focus.
- The shell owns breadcrumbs: top-level destinations use a plain section label; details use Jobs → posting or Boards → company. Both observe existing query caches without creating read visits. Board details use a borderless semantic header; full posting content is centered at 72ch with 16px type and 1.6 leading.
- Search updates after 300ms without a submit action, delays during IME composition, cancels obsolete drafts on URL navigation, and uses the official InputGroup. The installed tablecn condition and multi-sort menus replace simple property/value filters. Availability and board Status use regular select conditions inside Filter; layouts use an icon-only radio menu. Jobs defaults to Availability Open and includes retained history when the condition is paused or removed; Inbox remains current-unread only. Availability, Read status, board Status and provider follow the same condition workflow.
- List, Cards, and Table present one confirmed collection. Layout, page size, filters, page, and reader stay URL-addressable. Layout changes preserve filters and page-scoped selection because they do not change membership. Page size accepts only 10/25/50, defaults to 50, resets the page, and never exceeds the existing 50-ID mutation limit. Boards paginate the existing local collection; no new endpoint or database schema is required.
- Selection remains an explicit mode with the installed Select toggle and stable card/control geometry. The shell owns a footer slot below its scroller. Collections portal compact divided pagination into that slot, with an always-mounted selection row above it; opening selection reduces the scroller height instead of covering cards or moving pagination up over content. Hidden selection controls are inert and visibility changes immediately. Card hover has one owning surface; independent company links use an immediate accent treatment.
- Install the official tablecn Base UI DataTable, filter menu and sort menu through the shadcn CLI using `@diceui` registry entries. Retain installed primitives; keep field definitions and server query behavior in application modules. Bound conditions to 12 and sorts to five, validate field/operator combinations, and apply all conditions and sorting before pagination. Column customization is browser-local; no saved-view database or collaboration runtime is introduced.

### References and positioning decision

- [Notion views and filters](https://www.notion.com/help/views-filters-and-sorts): layouts show the same data; filters are properties within the view.
- [tablecn Base UI source](https://github.com/sadmann7/tablecn/tree/main/src/registry/bases/base/components/data-table): separated filter, table, and pagination compositions. The official components are CLI-installed and adapted for controlled URL state and the existing local API.
- [DiceUI Action Bar](https://diceui.com/docs/components/base/action-bar): a floating viewport toolbar with portaling, selection feedback, and roving keyboard groups. The latest screenshot request places the roving toolbar in the workspace footer instead of a viewport-centered floating dock; it shares the content boundary and does not overlap pagination.
- [Carbon data table guidelines](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines): collection tools group search, filters, display controls, and pagination. Carbon's replacing batch toolbar is not used because the user explicitly wants existing controls retained during selection.
- [shadcn Typeset](https://ui.shadcn.com/docs/typeset): the layout owns reading measure; semantic type, leading, and block rhythm style retained HTML. The existing description stylesheet follows those rules without rewriting stored provider content.

### Review findings and verification

| Priority | Root cause | Implemented correction | Evidence |
| --- | --- | --- | --- |
| High | Viewport-height collection and reader scrollers clip content and create competing scroll areas. | Collections and readers flow in the document; shared content edges and persistent bottom dock clearance. | Source and production CSS reviewed; browser geometry not verified. |
| High | Selection overlay and card have different hover backgrounds; inherited transitions outlive dock visibility. | One card-owned hover background, transparent selection surface, immediate dock visibility, and retained controls. | Rapid-toggle and selection tests pass; pointer rendering not visually verified. |
| High | Separate native filters and submitted search create inconsistent collection workflows. | CLI-installed shadcn primitives compose debounced search, property menus, three shared layouts, and bounded pagination. | IME/debounce, URL restoration, filter-before-pagination, layout continuity, and API bounds tests pass. |
| Medium | Fictional and duplicate breadcrumb trails obscure hierarchy; description width is owned by the wrong container. | One shell trail, Dashboard default, centered 72ch posting layout, and an unboxed board header. | Navigation, breadcrumb, actual-visit, and detail tests pass; typography rendering not visually verified. |

Implementation checks: pass. Visual approval remains unverified: no browser was opened for this task, so 320px layout, 200% zoom, RTL, pointer hover, and safe-area rendering still require visual inspection.

- All 260 tests across 28 files pass, including the revised collection interactions and existing read-state/refresh behavior.
- Formatting, lint, whitespace checks, and all 11 strict OpenSpec validations pass.
- Fresh Next route generation, all workspace TypeScript checks, and the production build pass in an isolated source/dependency copy. Private environment files, local data, and the running app's build output were excluded. The isolated data directory was never created.
- Generated styles contain the dock's valid `calc(100% - 2rem)` maximum width. No user database was accessed or migrated. Existing development-server and checkout work were preserved; these changes remain uncommitted and unarchived.


## Latest screenshot review

The earlier verification sections record earlier iterations. The current collection pass is tracked in `plans/003-collection-polish.md`, with final Standards/Spec review in `plans/code-review.md`. It replaces layout tabs, simple filters/basic tables and the inline reader; compacts cards and pagination; corrects search dimming, collapsed navigation alignment, selected badges and Dashboard actions. The isolated JobCard fixture route at `/dev/job-card` uses static data and bypasses live workspace providers. Browser observation remains unverified.

## Compact toolbar and footer follow-up

The latest screenshot brief supersedes the floating/sticky pagination, outlined count badge and two-row toolbar decisions above. Shared collection controls use one responsive toolbar, with search/filter/sort on the left and an icon-only layout menu first in the right action group, followed by other display controls and actions. Field selection precedes rule creation. One drag handle retains installed keyboard reordering. The shadcn preset `b1D0dv72` supplies Mira component styles, neutral tokens and Inter. Popup alignment follows the trigger side, and unknown unread counts render no badge. Empty filter/sort panels are compact, with Availability and Status inside Filter. Refresh rotates its existing icon without an extra activity label. The reader is capped at 46rem with icon-only Expand and Close on the right; board detail actions align left and its provider badge sits beside the heading. Current evidence is recorded in `plans/004-collection-controls.md`.


## Badge and table interaction follow-up

Keep the exact preset and add product tokens for a stronger company-link hover, muted violet Ashby and teal Lever badges, and a darker neutral Unread surface. Read and numeric counts use the compact outline badge; availability uses an outlined icon badge. Company links have no underline. The selection toggle composes the installed Button with Base UI Toggle, matches its size and changes its icon/label to Done while active. Selection counts match the same density. Card source URLs become ghost icon links beside their heading; the board detail URL remains visible. Archive and remove actions use destructive variants.

The existing DataTable is the official tablecn Base UI source, verified against the current Dice UI CLI dry-run/diff. Preserve its application pagination and keyboard resize adaptations. Column labels sort on click, with Shift-click adding sorts; right-click and Shift+F10 open the CLI-installed ContextMenu. Adapt fm-editor’s grouped column actions for insert, move, pin, remove and fit operations. Pinning divides fixed cells from the remaining columns and adds a header icon; moving stays within its pinned/unpinned group. The Columns picker uses matching icon/typography and offers reset and unpin-all actions. Row whitespace activates the real title link, while selection mode selects the job; inner controls, text selections, modifier clicks and portaled actions retain their behavior. Board rows no longer need Manage.

## Stable collection and badge follow-up

The latest screenshots supersede the availability icon badge and separate board Status toggle. A single application Badge composition keeps the installed preset's dimensions for all motives; variants change colors only. Provider badges retain violet/teal tints, read states use grays, availability uses green, counts use a neutral outline and filter/sort counters use a filled contrasting variant. Company names are text links outside tables and ghost button links in tables, with the stronger hover surface. Tables and cards use outlined icon read actions with visual tooltips and matching accessible names; lists and details use labels without tooltips. Operator controls reserve only the widest option’s intrinsic width. Details place Apply before Employer posting. The info trigger uses the normal icon-button size. Field options and filter labels use the search input's compact type size, outlined Add controls and the label Reset.

Status is a normal Boards select condition, initially Active, with joining, pausing, removal and URL state. Removing it permits both active and archived boards. Legacy view URLs are translated into the same condition model. Job tables always render a fixed 32px checkbox column, aligned with the toolbar search icon, with a select-all/mixed header. Active pinned columns use a filled pin.

Opening the reader previously recreated column renderer functions, remounting table cells and headers. A failing identity test reproduced this before the fix. Memoized definitions now contain stable renderer components; context supplies current selection, read actions and reader callbacks. Reader opening and next/previous preserve those DOM elements. A stable workspace scrollbar gutter also prevents scrollbar-width changes from shifting the collection.

TanStack Virtual renders table rows and grouped list/card rows in the existing workspace scroller, without introducing another scrolling area. ResizeObserver tracks the viewport, collection width and content offset. Card grouping preserves normal row order at one, two or three columns. Small overscan retains the visible range; focused and reader-active rows remain mounted so focus restoration works. Native table spacers and list item positions preserve semantics. Containers without measurable layout retain normal flow. Existing pagination, filtering and sorting remain authoritative; this does not fetch every posting. Query changes, including Availability, within the same board scope and Inbox or Jobs collection retain previous results while fetching and disable read/selection writes until confirmation.


Availability is a regular Jobs select condition, initially Open, rather than a custom toggle. Pausing or removing it includes current and historical postings; Read status combines normally across the library. The Jobs API accepts an all-retained scope so these conditions, including AND/OR, run before totals and pagination. Legacy Open/History URLs translate to regular conditions, and legacy historical read-status parameters keep their previous behavior. Inbox stays current-unread only. Column definitions remain stable across availability changes.


## Apply actions and responsive table sizing

The bounded job list response includes the retained application URL, so Apply never needs a per-row details request. A shared application link composes the installed Button styles and Tooltip: lists retain a label, while cards and tables use an outlined icon. It sits beside read/unread and remains independent of reader and selection activation. The table action column is fixed at 80px to hold both normal icon buttons.

The shared DataTable observes its existing table viewport and reuses the column-menu fitting calculation on mount, layout restoration, width changes and visibility changes. It proportionally fits resizable columns within their limits and preserves fixed control widths. Explicit table width matches the computed column total, keeping pin offsets and fixed controls accurate. Manual resizing is retained until another fit; ordinary row/read updates do not trigger fitting. Minimum-width overflow remains inside the table scroller. The existing manual fit command stays available, and no primitive, dependency, database schema or extra scrolling region is added.

## Neutral palette follow-up

Company hover/focus now uses the preset's accent pair instead of a custom gray mix. Unread badges and all count badges share solid emphasis tokens mapped to the installed neutral ramp: 200/700 in light mode and 700/100 in dark mode. Muted badge labels use neutral 600/400 against the preset muted surface, improving small Read labels without changing the preset's general muted text. Badge geometry and provider/status hues stay intact. The reader uses Lucide's two-arrow Maximize2 icon in the existing ghost icon-sm link, matching Close's sizing and stroke while retaining native link navigation. Token contrast and verification are recorded in `plans/004-collection-controls.md`.

## Reader entrance stagger

The requested sidepanel stagger follows the installed Sheet's opening state. Heading/actions, facts and description use 180ms opacity/8px translation transitions with 0/40/80ms delays, sharing the Sheet's cubic-bezier(.23,1,.32,1) easing. The panel itself retains its 200ms entrance. A closed initial render followed by opening on the next animation frame activates Base UI's native transition when the conditional reader mounts; cleanup cancels that frame. Skeletons use the same groups; later data, refetches and Previous/Next do not replay the entrance. Focused groups reveal immediately. Reduced motion removes translation and delays, retaining only a 120ms content fade. No primitive or dependency changes are needed.
