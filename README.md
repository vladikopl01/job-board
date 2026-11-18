# Job board

A local job-search workspace. Track Ashby and Lever boards, refresh their openings into local SQLite, and review new jobs in a persistent unread inbox with retained posting history. Local title/description search, property filters and multi-column sorting are available; broader discovery and application assistance are planned in [OpenSpec](openspec/roadmap.md).

## Run locally

Install Node.js **24.19.0** (also recorded in `.nvmrc`) and pnpm **10.28.0**. With that Node version active, you can install pnpm using:

```sh
npm install --global pnpm@10.28.0
```

Clone this repository with Git and open a terminal in its root. The following commands are the same on macOS, Linux, and Windows:

```sh
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). Development and production-style local start bind to loopback by default. No agent, credentials, or external database is required.

For a production-style local run, stop the development server, then run:

```sh
pnpm build
pnpm start
```

## Workspace

| Path                  | Responsibility                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `apps/web`            | Next.js 16 App Router, React 19, Tailwind CSS 4, shadcn/ui with Base UI, and local server composition. |
| `packages/db`         | SQLite/better-sqlite3 connection, Drizzle schema, migration tooling, and isolated database tests.      |
| `packages/job-boards` | Browser-safe board identification and posting contracts; server-side Ashby/Lever feed adapters.        |
| `openspec`            | Agreed stack, architecture, roadmap, and feature changes.                                              |

The app consumes `@job-board/db` through workspace exports. Packages expose TypeScript source without a separate package build. Database code in the app goes through `src/server/database.ts`, whose server-only guard keeps it out of client components. The connection is lazy; importing modules, generating types, and building the app do not create a database.

Turbopack builds the app. Vite serves Vitest's test transformations. TanStack Query handles the local API and refresh status, TanStack Form handles add/rename forms, and shared Zod schemas validate their boundaries. nuqs stores layouts, availability, search, compound property filters, sorting, pagination and reader selection in the URL. The official tablecn Base UI components, installed through the Dice UI registry, power the data tables and filter/sort menus. AI and document dependencies will be introduced with the features that use them.

## Navigation

The official shadcn inset sidebar connects **Dashboard**, **Inbox**, **Jobs**, and **Boards**. It collapses to an icon rail on desktop and opens as a sheet on narrow screens. Its seven-day browser preference restores the desktop state on reload, including the initial render; the mobile drawer remains independent. Each destination has a visible title and an active navigation state. The shell header names the current section; detail routes add one breadcrumb trail back to their collection.

The root route opens **Dashboard**, which links to review and source management, shows the actual unread/active-board counts, and highlights failed source refreshes. Each overview query can be retried independently. **Inbox** is the daily unread review queue. **Jobs** is the searchable library of open postings and retained history. **Boards** manages tracked sources and links to each board’s own postings. The brand links to Dashboard.

**Settings** at the bottom of the sidebar offers **Light**, **Dark** and **System** themes. The choice is saved in this browser; System follows the OS appearance and is the default. Settings remains available when the sidebar is collapsed. Both themes use the installed shadcn preset palette.

## Boards

Open **Boards** from the navigation or visit `/boards`. Choose **List**, **Cards**, or **Table** from the layout icon beside **Refresh** and **New**. Search by company/source and open **Filter** for **Status** (Active/Archived), **Provider**, and other conditions. Filters, layout, page, and page size survive in the URL. Filtering happens before pagination; choose 10, 25, or 50 boards per page. Refresh keeps its icon and label while busy; the icon rotates while the request runs. Progress announcements remain available to screen readers without an extra activity row. Select **New** to open the add dialog. Paste an HTTPS board-root URL (at most 2048 characters), then review the suggested company name in the placeholder:

| Provider | Example                                   |
| -------- | ----------------------------------------- |
| Ashby    | `https://jobs.ashbyhq.com/ramp`           |
| Lever    | `https://jobs.lever.co/moonpay`           |
| Lever EU | `https://jobs.eu.lever.co/ExampleCompany` |

Table layouts use tablecn’s Base UI DataTable. Click a column heading to sort, or Shift-click to add it to the current sorting. Right-click a heading (or press Shift+F10) for sorting, inserting hidden columns, moving, pinning, removal and fitting. Pinned columns show a filled pin and a divider. The **Columns** picker searches fields and offers **Reset columns** and **Unpin all columns**; column layout stays in browser storage. Tables automatically fit the available width on mount, window/sidebar resize and column visibility changes. Fitting respects column proportions and limits, keeps checkbox/action columns fixed and preserves pinning. Deliberate manual resizing stays in effect until the next fit; narrow tables scroll horizontally when their minimum widths cannot fit. Job rows open the reader, while row whitespace selects jobs during selection mode. The **Select** toggle changes to **Done** when active. All badges share the preset geometry with color variants: violet/teal providers, distinct gray read states, green availability and filled neutral counters. Company hover, read states and counts use the installed shadcn neutral palette in both themes. Archive and remove actions use destructive styling.

The URL immediately suggests a company name from its slug. After entry settles, an optional lookup improves the placeholder using the hosted page's metadata. Suggestions never change the input value. Leave the name blank to save the current suggestion, or enter your own name (1–120 characters). Clearing an override uses the suggestion again; whitespace-only input also uses it. Custom text is preserved across URL changes and late responses. Saving stays available during lookup, including when offline. Saved company names can be renamed later.

Before entry, Board URL shows `https://jobs.ashbyhq.com/ramp` and the optional company name shows `e.g. Ramp` as examples. A recognized URL replaces the company example with the metadata or offline slug suggestion; examples are never saved as values.

Info buttons beside the field labels explain supported URLs and name suggestions on hover, keyboard activation or tap. Labels and validation errors stay visible.

Metadata lookup is limited to supported canonical board roots, follows no redirects, forwards no local credentials, and reads at most 256 KiB within four seconds. It uses a server-only HTML parser without running page scripts. This is a name suggestion, not board verification or job indexing. Saving works without internet access while the local server is running. The first indexing task is queued with the local save and runs after the response; an offline indexing failure retains the board and offers retry.

Paste the hosted board root; individual posting/application links and custom domains are unsupported. Board keys may contain ASCII letters, digits, internal spaces, `-`, `.`, `_`, and `~`, except standalone `.` and `..`. Spaces remain encoded as `%20` in URLs, for example `https://jobs.ashbyhq.com/Hyperliquid%20Labs`. Surrounding whitespace, query strings, fragments, an optional trailing slash, and the default HTTPS port are normalized away. Pasting a supported URL immediately shows the clean URL in the input, including when replacing selected text or discarding tracking parameters longer than the input limit. Board-key case and Lever's regional host are retained.

Each canonical source has one local record, including archived boards. Adding an existing source identifies that record without changing its name or state. An archived duplicate offers an explicit restore action. Names may be shared by different sources.

Cards use tinted provider badges and keep the external source as a ghost icon link beside the company heading; the full source URL remains on the board detail page. **Status** is a regular filter condition, initially Active; it can be changed, paused or removed like any other field. Removing it shows both active and archived boards. Legacy status URLs remain supported. Empty states and ordinary board cards share a minimum height. **Refresh** stays on the left; **Rename** and **Archive** sit on the right. **Rename** edits an active card's title with matching typography and wrapping. Save/Cancel replace the existing footer actions so entering edit mode keeps the title, link and card geometry steady. Enter saves and Escape cancels. Archived cards offer **Restore** only. Click a table row to open its board page above the **Jobs** collection. Nested links and controls keep their own behavior. That header places the provider badge beside the heading and groups Refresh, Rename, and Archive on the left. Rename changes only the company label. A saved source URL is fixed: archive an incorrect source and add the correct one. Archive moves the same record into the archived view; restore returns it to the active view with its identity and history retained. Neither action deletes data or starts indexing.

The add dialog closes after a confirmed save. Failed submissions retain entered values; duplicate sources offer navigation to the existing card or an explicit restore when archived. Closing is disabled while a save or restore is pending.

The local write API accepts JSON from the same loopback origin (`127.0.0.1`, `localhost`, or IPv6 loopback). Run the app locally using the commands above.

## Jobs and refreshes

After upgrading, run `pnpm db:migrate` and restart the local server. Existing boards, postings, and refresh history are preserved. The unread migration starts existing postings unread because earlier visits were not recorded. Adding a board automatically queues its first indexing task alongside the local save. The dialog closes after saving, and its active card shows progress while the server fetches openings. A provider failure keeps the saved board and offers **Refresh** to retry. Restoration exposes retained data without starting new work.

Opening or reloading the app requests refreshes for all active boards. Navigation, focus, reconnect, and local data queries do not independently fetch providers. Stored results load immediately, with refresh activity shown separately. There is no periodic provider refresh, and the local server must remain running for accepted work to finish.

Open **Inbox** to review unread current openings on active boards. **Jobs** defaults to **Open**, which includes both read and unread current openings. The tablecn **Filter** menu supports text conditions and selectable **Availability**, **Board**, **Provider**, **Workplace**, **Read status**, **Country**, **Region** and **Department** properties. **Availability** starts with Open; choosing History shows retained historical postings, while pausing or removing this condition includes both. Read status combines with the other properties throughout Jobs; Inbox keeps its fixed current-unread scope. Conditions can match all (AND) or any (OR), be paused, removed or reordered; empty draft conditions do not filter results. Up to 12 conditions and five ordered sorts are URL-addressable, and jobs are filtered and sorted before totals and pagination. **History** retains unavailable/superseded postings and jobs from archived boards; reading a job alone never moves it there. Availability reflects the last successful index. Search retained titles and plain descriptions, optionally restricted to a board, without fetching employer content. Search text is limited to 200 characters and treated literally, including `%` and `_`. Search applies after 300 ms of settled typing and waits for IME composition to finish; property filters apply immediately. Back/forward navigation replaces pending search text with the restored URL query.

**Country**, **Region** and **Department** are ordinary searchable property filters in Inbox, Jobs and board-scoped results, including retained history. For example, combine **Region: Europe**, **Department: Engineering** and **Workplace: Remote** to narrow the local index. Country and department options work across both providers. These filters use stored data immediately; no provider refresh, AI setup or new migration is needed. Restart an already running server after upgrading so its SQLite connection loads the discovery functions.

Country matching uses recognized source countries or complete explicit country labels across every retained location. **Spain** matches explicit Spain postings; **Europe** includes European countries and EU/Europe-labelled postings without assuming those regional roles are eligible in Spain. City-only and ambiguous labels stay **Unknown**. Country membership also contributes its geographical region, including Americas and Latin America/Caribbean where applicable. APAC, EMEA and Worldwide match explicit source labels and do not expand into individual countries. Exclusion clauses do not add excluded countries. Original locations, addresses and employer restrictions remain available in details and remain authoritative for eligibility.

Department choices group explicit provider department labels, falling back to team only when department is absent. **Engineering** includes Engineering, Software Engineering and Eng; **Marketing** includes Product Marketing. Combined explicit labels can match multiple groups. Missing labels stay **Unknown** and unfamiliar supplied departments stay **Other**; titles and descriptions do not establish a department. Country, Region and Department columns start hidden and can be enabled in Columns. Their filters work in every layout regardless of column visibility. See the [normalization data notice](packages/job-boards/NOTICE.md) for geographical group definitions and source attribution.

A single responsive toolbar groups search, Filter and Sort on the left and actions with a labeled layout select on the right. Outlined **Add filter** and **Add sort** open searchable field lists with the same compact text size as their search fields; no rule is created until a field is chosen. Both menus use **Reset**, with filled counters for active options. Operator controls fit their widest option. Drag handles also support keyboard reordering. Left-side menus open from the start edge, right-side menus from the end edge. Normal fields, buttons, separators and popup outlines share one border token.

Table is the default view for Inbox, Jobs and Boards, including when the layout URL value is missing or invalid. Explicit List and Cards URLs retain their selected view. The layout menu showing the selected view icon and label, first in the right action group, switches between **List**, **Cards** and **Table** while retaining the confirmed collection, filters, selected jobs and reader. The Columns menu uses searchable, labeled shadcn checkboxes. Table columns can be hidden, reordered, pinned and resized, with customization retained in this browser separately for Inbox, Jobs and Boards. Availability, layout, text, board, read status, page, page size, and the selected posting survive in the URL. A compact divided footer below the workspace scroller keeps the result range, page position, previous/next and 10/25/50 rows per page accessible (default 50). Filter changes reset pagination, selection, and the reader; changing page size also ends selection and returns to page one. Legacy Open/History URLs remain supported; historical URLs continue to ignore their legacy Open-only read-status parameter. Inbox navigation and its header share the total active unread count across all pages and filters, hiding the badge until a count is known and retaining the last confirmed count with retry on failure. An empty inbox offers **Browse open jobs**. Legacy `/jobs?view=unread` URLs redirect to Inbox, retaining their collection context.

Ordinary card activation opens one contextual reader beside the list when there is enough room; narrow layouts show the reader with **Back to Inbox/jobs**. Native modifier-clicks and **Open full posting** still support full details. Previous/next move within the confirmed displayed page. While reading, the current page stays in place even as its rows become read; the global unread count updates immediately. Closing the reader reconciles the list and restores the prior list position and useful row focus. Manual unread remains effective through refetches.

Opening retained local details in the reader or full page marks that posting read once per visit. Cards and tables offer outlined icon-only **Mark read** or **Mark unread** buttons with tooltips; lists and details use labeled buttons without tooltips. **Apply** uses a paper-plane icon and sits beside the read action in every job collection and opens the stored application URL in a new tab without opening local details, changing read state or selecting the row. It uses an icon with a tooltip in cards/tables and a label in lists. Marking unread while reading stays effective through refetches until an actual later visit or an explicit read action. Prefetches, metadata, and background reads do not mark jobs read. Choose **Select** for bulk actions: clicking a card outside its title/company links and read action toggles selection, with a border and checkmark on selected jobs. Tables always show a compact checkbox column with a select-all header; selecting a checkbox enters selection mode. Existing links, actions, and filters remain available. A selection row above pagination in the workspace footer offers a selected-count chip with an **X** to clear selection, **Select all**, **Mark read**, **Mark unread**, and **Done**. **Select all** selects the displayed page, up to 50 jobs; repeating it keeps them selected. The X clears selection while keeping the dock open. **Done** or **Escape** restores whole-card navigation, clears selection, and returns focus to **Select** or the empty-state heading when no results remain. Geometry stays stable across rapid toggles, and the dock shows or hides immediately as one unit. Arrow keys move between dock actions. Page, page size, availability, search, board, or read-filter changes leave selection mode; successful writes clear only their submitted selected IDs, newly arriving jobs remain unselected, and failed writes preserve confirmed results and selection for retry. Normal cards have no selection checkboxes or bulk toolbar.

Read state survives refreshes, ordinary source edits, restarts, and board archive/restore. New posting identities start unread. Historical postings retain their state without contributing to active counts. This inbox is local to the app; provider refresh progress and result counts stay separate.

Details read the full retained description locally, including without internet access. Server-sanitized HTML preserves headings, paragraphs, lists, emphasis, and links; scripts, embedded media, source styles, and event handlers are removed. Relative description links resolve against the employer posting, and safe HTTP(S)/email links open externally. Plain-text-only descriptions stay readable. Existing Lever records recover section headings from retained source data without a refresh or migration.

Outside selection mode, job cards open details from the whole card, with an independently clickable company text link prefixed by **at** and a distinct hover/focus surface. It opens the board page; tables present this link as a ghost button. Cards use one hover background across their border and content. Card headings stay on one line with truncation, grid cards share their row height and keep actions at the bottom. Cards show one location, lists show two, with an accurate **N more locations** summary; details retain the full list with comma separators. On details, company and provider/status badges share a text baseline, and compensation follows the same grid columns as the other facts. **Apply** appears before **Employer posting**. Boards and Jobs show their layout select, filters and toolbar actions immediately, with skeletons only for initial list content. Posting details also use a route skeleton. Loading announcements remain available to screen readers.

Tables, lists and card grids use TanStack Virtual within the existing workspace scroller. Only visible rows and a small overscan render; focused rows and the posting open in the reader stay mounted. Card grids retain normal row order and adapt to the available width. Pagination and filtering over the full local collection remain unchanged. Within the same board scope and Inbox or Jobs collection, previous results stay visible while new search, filter or sort results resolve, including Availability changes; read and selection writes are disabled until those results arrive. Reader navigation keeps column renderers and table elements mounted instead of rebuilding the table.

Job facts use a responsive layout, readable employment/workplace labels, and employer compensation summaries or formatted ranges and tiers. Posting content is centered at a readable 72-character maximum width, with 16px description text and 1.6 line height. The workspace content scrolls within the viewport beneath its header. The reader opens as an overlay Sheet with independent content scrolling and labeled Previous, Next, Expand and Close controls. Its heading, facts and description enter in a brief stagger on opening; Previous/Next stays immediate. Reduced motion uses an undelayed fade, and focused content appears immediately. Route changes reset the workspace scroll without focus scrolling the document. Unrecognized compensation links to the employer rather than showing JSON. Original source values remain stored alongside conservative discovery projections, without salary conversion. One shell breadcrumb leads back to Jobs or Boards, and missing routes/postings use a custom not-found screen with local navigation. Button icons consistently precede labels. App-authored external links include an external-link icon and open a new tab; links inside imported descriptions retain their source presentation. Employer links do not submit an application.

Each active board shows progress in its Refresh button, last success, result counts, and actionable failures, without a duplicate per-card progress label. The last successful result remains visible while a new attempt queues, runs, or fails, including when opening the page during that attempt. The toolbar’s **Refresh** action requests every active board, preserving per-board coalescing and cooldowns. A successful unchanged refresh shows **Up to date** and its cached count. Text stays mounted and uses a brief opacity pulse only on completed updates, including identical counts; initial display and pending states do not animate it. Motion respects the user's reduced-motion setting. Here, cached means unchanged current postings retained after checking the provider; it does not mean the provider request was skipped. Up to two boards refresh at once, with additional work durably queued. Repeated requests coalesce. A failed or incomplete feed leaves the previous index and last-success time unchanged. Only a complete successful snapshot can mark missing postings unavailable; records are never deleted by refresh. Archive cancels unfinished work and hides current jobs from Open and Unread, while restore exposes retained data again.

Internal posting UUIDs are independent of provider references. Continuous edits update the current record; a reference returning after an observed absence creates a new record. If an employer reused a continuously present reference for a different job, **Treat as new** in local details asks for confirmation, preserves the old record as superseded, and creates a separate UUID from stored content. No feed can prove a deletion/recreation that occurred between observations.

Provider access uses fixed API origins, blocks redirects, and sends no browser credentials. Attempts allow 20 seconds per request, 90 seconds overall, 20 MiB of aggregate response bodies, 10,000 postings per traversal, and 202 page requests including confirmation. Lever global/EU feeds are traversed through an explicit empty page; proposed closures require a second traversal with the same reference set. Offset pagination still cannot guarantee an atomic employer snapshot. Exceeded limits or observable instability fail safely rather than storing a partial list. Rate-limit retry timing is respected without automatic repeated attempts.

Queued work resumes when a later app visit or manual request starts coordination. After a server interruption, running work keeps its fixed two-minute ownership lease; it is then marked interrupted and offers manual retry. An old or cancelled owner cannot commit later results, including across an archive/restore cycle. Status polling only reads local task records.

Board cards and company names link to implemented `/boards/[id]` pages with source identity, existing rename/archive/restore/refresh controls, and a board-scoped Jobs library. Archived boards open on History. Board source links and management/refresh controls remain independently clickable above the card link, and inline renaming suspends card navigation. Source-backed geography and department filters are available alongside location text and workplace filters. AI classification and application workflows remain separate roadmap work. Reading a posting does not set application status.

## Local data and migrations

The default file is `<repository-root>/.data/job-board.sqlite`. SQLite uses foreign keys, WAL journaling, and a five-second busy timeout. Local data, SQLite sidecars, private environment files, and build output are gitignored.

To choose another directory, set **`JOB_BOARD_DATA_DIR` in the process environment** before running both the app and database commands. Absolute paths are preserved; relative paths resolve against the repository root, including paths containing spaces. An app-only Next `.env` file does not configure the database CLI. Empty or unusable overrides fail instead of silently selecting another file.

Run commands from the repository root or a workspace directory so the shared resolver can find `pnpm-workspace.yaml`. The data directory must be writable and support SQLite's local file locking.

Run `pnpm db:migrate` before using the app and after schema upgrades. It applies the checked-in board, job-indexing, and unread-state migrations, preserving existing data. An unmigrated database produces a setup error with this command instead of an empty tracking list. Feature changes define their tables in `packages/db/src/schema.ts`, then generate and review migrations:

```sh
pnpm db:generate
pnpm db:migrate
```

Commit the generated SQL and metadata in `packages/db/drizzle`. Do not edit applied migrations: setup checks their history and hashes. Schema migrations run only through the explicit command; requests and builds do not apply them. Setup does not reset or replace an existing database on failure. Restore missing migration source and resolve the reported error before retrying.

The indexing and unread-state migrations are additive. For a runtime rollback, stop the new runtime and restore the prior application revision while keeping the upgraded database and its data. Prior columns and operations remain compatible; there is no automatic down migration. Do not drop tables or run an older migration command to undo the upgrade.

`packages/db/test/fixtures` contains a separate generated schema and migrations for tests. They are never applied to the application database. To regenerate the fixture after intentionally changing its schema, run `pnpm --filter @job-board/db exec drizzle-kit generate --config test/fixtures/drizzle.config.ts` and review the result.

## UI components

Install and reinstall shadcn/ui components through the CLI using the existing Base UI / `base-mira` configuration (preset `b1D0dv72`, neutral colors and Inter):

```sh
pnpm dlx shadcn@latest add <component> -c apps/web
```

Review `--dry-run` and `--diff` before updating installed components, and review the generated files, dependency changes, and global styles afterward. Run `pnpm format` after generation. Keep the official animation utilities and shared shadcn stylesheet installed and imported. Build application-specific components by composing installed primitives; do not recreate shadcn primitives by hand or copy their source from documentation or GitHub. These rules also apply to agents through [AGENTS.md](AGENTS.md).

The app follows the [shadcn existing-project setup](https://ui.shadcn.com/docs/installation/manual): PostCSS loads Tailwind, `tw-animate-css`, and `shadcn/tailwind.css` from `src/app/globals.css`. The CLI-generated preset supplies component sizing, surfaces, colors, and typography. Empty filter and sort panels stay compact and widen when rule rows need room. Standard popup motion is enabled; component animations and transitions are disabled when the system requests reduced motion. React interaction tests cover forms, modal behavior, and keyboard actions.

## Quality checks

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use `pnpm format` to write Oxfmt formatting changes. The other diagnostic commands leave source unchanged. `typecheck` generates Next route types before running `tsc --noEmit`, so it works on a clean checkout. `test` runs once and exits.

Oxlint explicitly enables supported TypeScript, React, Next.js, accessibility, and Vitest checks. It uses the configured native rules, without ESLint compatibility or additional type-aware lint plugins. Type checking remains a separate command; linting and DOM tests do not provide visual accessibility verification.

The lint configuration has no file-scoped rule exemptions. Small semantic adaptations to CLI-installed components keep them compliant: spinners are decorative alongside application status text, current breadcrumbs use `aria-current` on static text, labels explicitly forward their association and children, and input adornments remain static around real inputs and buttons. Related controls use native fieldsets. The mobile hook uses React's external-store subscription to a media query with a stable server snapshot, avoiding an effect that copies viewport state. Review these adaptations when updating components through the CLI.

Tests use real native SQLite connections in unique temporary directories, close handles before cleanup, and exercise fresh setup, upgrades from the board schema, source/current-reference uniqueness, atomic reconciliation, posting incarnations, archival, queue ownership, interruption, cooldowns, migration history, paths, foreign keys, and bounded contention. Provider tests use controlled feed fixtures without network access, including pagination and transport failures. Route tests use isolated persistence, and React Testing Library interaction tests mock the local HTTP boundary. Root commands include every workspace. Tests do not need job feeds, an agent, or the user's database.

[GitHub Actions](.github/workflows/ci.yml) repeats installation, quality checks, native database tests/setup, and the production build on macOS, Linux, and Windows. Cross-platform support is confirmed only when the matrix passes; creating the workflow does not execute it.

## Native SQLite installation

Use the pinned Node and pnpm versions before installing. The repository allows install scripts only for better-sqlite3, esbuild, and sharp. Do not enable all dependency scripts globally.

better-sqlite3 uses a prebuilt binary where available and otherwise builds locally. A source build needs Python and a C++ toolchain: Xcode Command Line Tools on macOS, compiler/make tools on Linux, or Visual Studio **2022** Build Tools with C++ support on Windows. The pinned pnpm bundles node-gyp 11.5, which cannot detect Visual Studio 2026; Windows CI therefore uses `windows-2022`. See [node-gyp's platform prerequisites](https://github.com/nodejs/node-gyp#installation) and [version history](https://github.com/nodejs/node-gyp/blob/main/CHANGELOG.md).

After changing Node versions, reinstall/rebuild the native dependency with the selected runtime (`pnpm rebuild better-sqlite3`). Cache permission errors concern the package manager/native build cache; choose a writable cache or fix its permissions, rather than changing the application's data path or deleting its database.

## Planning

Read the [technology stack](openspec/tech-stack.md), [architecture](openspec/architecture.md), and [roadmap](openspec/roadmap.md). The [archived workspace-foundation change](openspec/changes/archive/2026-10-17-add-workspace-foundation/proposal.md), [company-board tracking change](openspec/changes/archive/2026-10-27-add-company-board-tracking/proposal.md), [board-name suggestions change](openspec/changes/archive/2026-10-27-add-board-name-suggestions/proposal.md), [board-management UI change](openspec/changes/archive/2026-10-27-refine-board-management-ui/proposal.md), [job-indexing change](openspec/changes/archive/2026-11-08-add-job-indexing/proposal.md), [unread-inbox change](openspec/changes/archive/2026-11-18-add-unread-inbox/proposal.md), and [workspace navigation change](openspec/changes/archive/2026-11-18-restructure-workspace-navigation/proposal.md) describe the implemented scope. The completed unread, navigation, appearance, [source-backed discovery](openspec/changes/archive/2026-11-18-add-geography-department-filters/tasks.md) and [sidebar persistence](openspec/changes/archive/2026-11-18-persist-sidebar-collapse/tasks.md) work is synced into the main specifications and archived. Later features should use separate OpenSpec changes.
