# Job board

A local job-search workspace. Track Ashby and Lever boards, refresh their openings into local SQLite, and browse retained posting history. Unread notifications, discovery filters, and application assistance are planned in [OpenSpec](openspec/roadmap.md).

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

Turbopack builds the app. Vite serves Vitest's test transformations. TanStack Query handles the local API and refresh status, TanStack Form handles add/rename forms, and shared Zod schemas validate their boundaries. nuqs stores the Jobs view and page in the URL. AI and document dependencies will be introduced with the features that use them.

## Boards

Open **Boards** from the navigation or visit `/boards`. The selected navigation item identifies the page without a duplicate visible title. The Active/Archived tabs share the toolbar with **Refresh all** and **New board**. A spinner and **Refreshing boards…** appear beside the tabs only for an app-visit or manual all-board refresh. Select **New board** to open the add dialog. Paste an HTTPS board-root URL (at most 2048 characters), then review the suggested company name in the placeholder:

| Provider | Example                                   |
| -------- | ----------------------------------------- |
| Ashby    | `https://jobs.ashbyhq.com/ramp`           |
| Lever    | `https://jobs.lever.co/moonpay`           |
| Lever EU | `https://jobs.eu.lever.co/ExampleCompany` |

The URL immediately suggests a company name from its slug. After entry settles, an optional lookup improves the placeholder using the hosted page's metadata. Suggestions never change the input value. Leave the name blank to save the current suggestion, or enter your own name (1–120 characters). Clearing an override uses the suggestion again; whitespace-only input also uses it. Custom text is preserved across URL changes and late responses. Saving stays available during lookup, including when offline. Saved company names can be renamed later.

Info buttons beside the field labels explain supported URLs and name suggestions on hover, keyboard activation or tap. Labels and validation errors stay visible.

Metadata lookup is limited to supported canonical board roots, follows no redirects, forwards no local credentials, and reads at most 256 KiB within four seconds. It uses a server-only HTML parser without running page scripts. This is a name suggestion, not board verification or job indexing. Saving works without internet access while the local server is running. The first indexing task is queued with the local save and runs after the response; an offline indexing failure retains the board and offers retry.

Paste the hosted board root; individual posting/application links and custom domains are unsupported. Board keys may contain ASCII letters, digits, `-`, `.`, `_`, and `~`, except standalone `.` and `..`. Surrounding whitespace, query strings, fragments, an optional trailing slash, and the default HTTPS port are normalized away. Board-key case and Lever's regional host are retained.

Each canonical source has one local record, including archived boards. Adding an existing source identifies that record without changing its name or state. An archived duplicate offers an explicit restore action. Names may be shared by different sources.

Cards show the provider badge; the selected tab conveys status. Empty states and ordinary board cards share a minimum height. **Refresh** stays on the left; **Rename** and **Archive** sit on the right. **Rename** edits an active card's title with matching typography and wrapping. Save/Cancel replace the existing footer actions so entering edit mode keeps the title, link and card geometry steady. Enter saves and Escape cancels. Archived cards offer **Restore** only. Rename changes only the company label. A saved source URL is fixed: archive an incorrect source and add the correct one. Archive moves the same record into the archived view; restore returns it to the active view with its identity and history retained. Neither action deletes data or starts indexing.

The add dialog closes after a confirmed save. Failed submissions retain entered values; duplicate sources offer navigation to the existing card or an explicit restore when archived. Closing is disabled while a save or restore is pending.

The local write API accepts JSON from the same loopback origin (`127.0.0.1`, `localhost`, or IPv6 loopback). Run the app locally using the commands above.

## Jobs and refreshes

After upgrading, run `pnpm db:migrate` and restart the local server. Existing boards and their names/archive state are preserved; they start without an index. Adding a board automatically queues its first indexing task alongside the local save. The dialog closes after saving, and its active card shows progress while the server fetches openings. A provider failure keeps the saved board and offers **Refresh** to retry. Restoration exposes retained data without starting new work.

Opening or reloading the app requests refreshes for all active boards. Navigation, focus, reconnect, and local data queries do not independently fetch providers. Stored results load immediately, with refresh activity shown separately. There is no periodic provider refresh, and the local server must remain running for accepted work to finish.

Open **Jobs** to browse current openings, or switch to **History** for unavailable/superseded postings and jobs from archived boards. The selected view and page survive in the URL, with 50 results per page. Details read the full retained description locally, including without internet access. Server-sanitized HTML preserves headings, paragraphs, lists, emphasis, and links; scripts, embedded media, source styles, and event handlers are removed. Relative description links resolve against the employer posting, and safe HTTP(S)/email links open externally. Plain-text-only descriptions stay readable. Existing Lever records recover section headings from retained source data without a refresh or migration.

Job cards open details from the whole card, with independently clickable company links prefixed by **at**. Cards show the first five locations separated by commas and an accurate **N more locations** summary; details retain the full list with comma separators. On details, company text and provider/status badges share a text baseline, and compensation follows the same grid columns as the other facts. Boards and Jobs show their tabs and toolbar actions immediately, with skeletons only for pending list content. Posting details also use a route skeleton. Loading announcements remain available to screen readers, and confirmed data stays visible during background refreshes.

Job facts use a responsive layout, readable employment/workplace labels, and employer compensation summaries or formatted ranges and tiers. Unrecognized compensation links to the employer rather than showing JSON. Original values remain stored without geographic inference or salary conversion. Breadcrumbs lead back to Jobs, and missing routes/postings use a custom not-found screen with local navigation. Button icons consistently precede labels. App-authored external links include an external-link icon and open a new tab; links inside imported descriptions retain their source presentation. Employer links do not submit an application.

Each active board shows progress in its Refresh button, last success, result counts, and actionable failures, without a duplicate per-card progress label. The last successful result remains visible while a new attempt queues, runs, or fails, including when opening the page during that attempt. **Refresh all** requests every active board, preserving per-board coalescing and cooldowns. A successful unchanged refresh shows **Up to date** and its cached count. Text stays mounted and uses a brief opacity pulse only on completed updates, including identical counts; initial display and pending states do not animate it. Motion respects the user's reduced-motion setting. Here, cached means unchanged current postings retained after checking the provider; it does not mean the provider request was skipped. Up to two boards refresh at once, with additional work durably queued. Repeated requests coalesce. A failed or incomplete feed leaves the previous index and last-success time unchanged. Only a complete successful snapshot can mark missing postings unavailable; records are never deleted by refresh. Archive cancels unfinished work and hides current jobs from Open, while restore exposes retained data again.

Internal posting UUIDs are independent of provider references. Continuous edits update the current record; a reference returning after an observed absence creates a new record. If an employer reused a continuously present reference for a different job, **Treat as new** in local details asks for confirmation, preserves the old record as superseded, and creates a separate UUID from stored content. No feed can prove a deletion/recreation that occurred between observations.

Provider access uses fixed API origins, blocks redirects, and sends no browser credentials. Attempts allow 20 seconds per request, 90 seconds overall, 20 MiB of aggregate response bodies, 10,000 postings per traversal, and 202 page requests including confirmation. Lever global/EU feeds are traversed through an explicit empty page; proposed closures require a second traversal with the same reference set. Offset pagination still cannot guarantee an atomic employer snapshot. Exceeded limits or observable instability fail safely rather than storing a partial list. Rate-limit retry timing is respected without automatic repeated attempts.

Queued work resumes when a later app visit or manual request starts coordination. After a server interruption, running work keeps its fixed two-minute ownership lease; it is then marked interrupted and offers manual retry. An old or cancelled owner cannot commit later results, including across an archive/restore cycle. Status polling only reads local task records.

Board cards and company names on job cards currently link to placeholder `/boards/[id]` routes; company detail pages remain for a later change. Board source links and management/refresh controls remain independently clickable above the card link, and inline renaming suspends card navigation. Unread/read state, text search, discovery filters, AI classification, and application workflows are separate roadmap themes. Browsing a posting does not yet mark it read or applied.

## Local data and migrations

The default file is `<repository-root>/.data/job-board.sqlite`. SQLite uses foreign keys, WAL journaling, and a five-second busy timeout. Local data, SQLite sidecars, private environment files, and build output are gitignored.

To choose another directory, set **`JOB_BOARD_DATA_DIR` in the process environment** before running both the app and database commands. Absolute paths are preserved; relative paths resolve against the repository root, including paths containing spaces. An app-only Next `.env` file does not configure the database CLI. Empty or unusable overrides fail instead of silently selecting another file.

Run commands from the repository root or a workspace directory so the shared resolver can find `pnpm-workspace.yaml`. The data directory must be writable and support SQLite's local file locking.

Run `pnpm db:migrate` before using the app and after schema upgrades. It applies the checked-in board and job-indexing migrations, preserving existing data. An unmigrated database produces a setup error with this command instead of an empty tracking list. Feature changes define their tables in `packages/db/src/schema.ts`, then generate and review migrations:

```sh
pnpm db:generate
pnpm db:migrate
```

Commit the generated SQL and metadata in `packages/db/drizzle`. Do not edit applied migrations: setup checks their history and hashes. Schema migrations run only through the explicit command; requests and builds do not apply them. Setup does not reset or replace an existing database on failure. Restore missing migration source and resolve the reported error before retrying.

This indexing migration is additive. For a runtime rollback, stop the new runtime and restore the prior application revision while keeping the upgraded database and its data. Prior board columns and operations remain compatible; there is no automatic down migration. Do not drop tables or run an older migration command to undo the upgrade.

`packages/db/test/fixtures` contains a separate generated schema and migrations for tests. They are never applied to the application database. To regenerate the fixture after intentionally changing its schema, run `pnpm --filter @job-board/db exec drizzle-kit generate --config test/fixtures/drizzle.config.ts` and review the result.

## UI components

Install and reinstall shadcn/ui components through the CLI using the existing Base UI / `base-nova` configuration:

```sh
pnpm dlx shadcn@latest add <component> -c apps/web
```

Review `--dry-run` and `--diff` before updating installed components, and review the generated files, dependency changes, and global styles afterward. Run `pnpm format` after generation. Keep the official animation utilities and shared shadcn stylesheet installed and imported. Build application-specific components by composing installed primitives; do not recreate shadcn primitives by hand or copy their source from documentation or GitHub. These rules also apply to agents through [AGENTS.md](AGENTS.md).

The app follows the [shadcn existing-project setup](https://ui.shadcn.com/docs/installation/manual): PostCSS loads Tailwind, `tw-animate-css`, and `shadcn/tailwind.css` from `src/app/globals.css`. Shared theme tokens supply component surfaces and colors. Standard popup motion is enabled; component animations and transitions are disabled when the system requests reduced motion. React interaction tests cover forms, modal behavior, and keyboard actions.

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

The CLI-generated Spinner keeps its SVG status role. A file-scoped Oxlint override disables `jsx-a11y/prefer-tag-over-role` for that primitive because replacing the SVG with an HTML `output` is not equivalent. The surrounding application status uses `output` and hides the decorative spinner from assistive technology. Breadcrumb has the same narrowly scoped exception for its non-navigable current-page span with `role="link"`, `aria-disabled`, and `aria-current`; replacing it with a navigable anchor would change the official component's behavior. Both primitives retain their CLI output, apart from formatting.

Tests use real native SQLite connections in unique temporary directories, close handles before cleanup, and exercise fresh setup, upgrades from the board schema, source/current-reference uniqueness, atomic reconciliation, posting incarnations, archival, queue ownership, interruption, cooldowns, migration history, paths, foreign keys, and bounded contention. Provider tests use controlled feed fixtures without network access, including pagination and transport failures. Route tests use isolated persistence, and React Testing Library interaction tests mock the local HTTP boundary. Root commands include every workspace. Tests do not need job feeds, an agent, or the user's database.

[GitHub Actions](.github/workflows/ci.yml) repeats installation, quality checks, native database tests/setup, and the production build on macOS, Linux, and Windows. Cross-platform support is confirmed only when the matrix passes; creating the workflow does not execute it.

## Native SQLite installation

Use the pinned Node and pnpm versions before installing. The repository allows install scripts only for better-sqlite3, esbuild, and sharp. Do not enable all dependency scripts globally.

better-sqlite3 uses a prebuilt binary where available and otherwise builds locally. A source build needs Python and a C++ toolchain: Xcode Command Line Tools on macOS, compiler/make tools on Linux, or Visual Studio **2022** Build Tools with C++ support on Windows. The pinned pnpm bundles node-gyp 11.5, which cannot detect Visual Studio 2026; Windows CI therefore uses `windows-2022`. See [node-gyp's platform prerequisites](https://github.com/nodejs/node-gyp#installation) and [version history](https://github.com/nodejs/node-gyp/blob/main/CHANGELOG.md).

After changing Node versions, reinstall/rebuild the native dependency with the selected runtime (`pnpm rebuild better-sqlite3`). Cache permission errors concern the package manager/native build cache; choose a writable cache or fix its permissions, rather than changing the application's data path or deleting its database.

## Planning

Read the [technology stack](openspec/tech-stack.md), [architecture](openspec/architecture.md), and [roadmap](openspec/roadmap.md). The [archived workspace-foundation change](openspec/changes/archive/2026-10-17-add-workspace-foundation/proposal.md), [company-board tracking change](openspec/changes/archive/2026-10-27-add-company-board-tracking/proposal.md), [board-name suggestions change](openspec/changes/archive/2026-10-27-add-board-name-suggestions/proposal.md), [board-management UI change](openspec/changes/archive/2026-10-27-refine-board-management-ui/proposal.md), and [job-indexing change](openspec/changes/archive/2026-11-08-add-job-indexing/proposal.md) describe the implemented scope. Later features should use separate OpenSpec changes.
