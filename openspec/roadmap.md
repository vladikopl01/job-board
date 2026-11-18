# Product roadmap

Status: agreed direction, updated 2026-11-18. Workspace foundations, company board management, indexed openings, the unread inbox, inset workspace navigation, contextual reading, and local text/board/workplace/geography/department discovery are implemented; AI taxonomy and later themes remain planned. This roadmap uses named delivery themes without numbered stages, fixed dates, or release commitments. Extend it as the project develops.

The [stack](tech-stack.md) and [architecture](architecture.md) define the current baseline. Each theme should be delivered through focused OpenSpec feature changes with behavior specs, design where needed, and implementation tasks. Completing this documentation does not complete any product theme below.

## Workspace foundation

Implementation is present in the [archived workspace-foundation change](changes/archive/2026-10-17-add-workspace-foundation/tasks.md). Local checks run on macOS; cross-platform readiness still requires the three-system CI matrix to pass.

Establish the pnpm workspace repository, Node.js runtime, and Next.js application. Add packages only as their responsibilities become real.

- Configure strict TypeScript, workspace imports, the application build, and server-only boundaries.
- Establish Tailwind, shadcn/ui with Base UI, icons, responsive navigation, and accessible empty/loading/error states.
- Configure Oxfmt, Oxlint, type checking, Vitest/Vite, and React Testing Library.
- Establish the local data root, SQLite connection, Drizzle schema/migration workflow, and temporary-database test helpers.
- Document clone, install, migrate, develop, and production-style local start commands.
- Add GitHub Actions checks for macOS, Linux, and Windows, including native SQLite installation and core tests.

Ready when a fresh clone can install, create its local database, run, and pass the defined checks on all supported systems. No AI account is required to reach this point.

## Company board tracking

Implementation is present in the [company-board tracking change](changes/archive/2026-10-27-add-company-board-tracking/tasks.md): local registration, renaming, duplicate handling, active/archived views, and reversible archive/restore. The source-identification package is in use; complete feed snapshots are delivered by indexed openings below. Cross-platform checks remain pending until the expanded CI matrix runs.

The [board-name suggestions change](changes/archive/2026-10-27-add-board-name-suggestions/tasks.md) adds URL-first entry with name placeholders from optional page metadata and an immediate offline slug fallback. Users can enter an override or leave the name blank to save the suggestion. Supplemental help opens through info buttons. Saving remains independent of lookup completion.

The [board-management UI change](changes/archive/2026-10-27-refine-board-management-ui/tasks.md) moves creation into a New board dialog, identifies the page through selected Boards navigation and a shared tabs/action toolbar, adds provider badges and action icons, matches empty-state and ordinary-card minimum heights, edits active titles inline without shifting the card, and limits archived actions to restoration.

Let the user build and manage the tracking list.

- Add Ashby and Lever company board URLs through a validated form.
- Canonicalize provider identities and reject duplicate or unsupported sources clearly.
- Display tracked companies and their source links.
- Archive and restore boards while preserving local data and history.
- Introduce the shared job-board adapter contract in `packages/job-boards`.

Depends on workspace persistence and the application shell. Ready when the tracked list survives restarts and active/archive behavior is predictable.

## Indexed openings

Implementation is present in the [job-indexing change](changes/archive/2026-11-08-add-job-indexing/tasks.md): complete validated Ashby and Lever global/EU adapters, atomic local reconciliation, persisted bounded refresh execution, app-visit/manual triggers, archive fencing, retained history, and confirmed Treat as new. Jobs provides local lists and descriptions with nuqs pagination. Fixture and temporary-SQLite tests cover failure/identity/recovery boundaries; the expanded three-system CI matrix still needs to run. The unread theme below adds read state and actual-visit marking; richer discovery remains separate work.

Turn supported boards into a durable local index.

- Implement complete, validated Ashby and Lever snapshots, including pagination when required.
- Store normalized posting content, descriptions, original location and salary data, and relevant raw fields.
- Use internal UUIDs and board-scoped external references with the agreed disappearance/reappearance rules.
- Implement persisted tasks and bounded execution inside the Next.js server.
- Display local results immediately; refresh on initial app visits and through per-board manual actions.
- Show per-board progress, last successful refresh, and independent error states.
- Mark missing jobs unavailable only after complete successful reconciliation.
- Handle restart recovery, coalesced refreshes, malformed snapshots, valid empty feeds, and explicit treat-as-new corrections.

Depends on board tracking. Ready when incomplete or failed feeds cannot falsely close postings, and a reappearing external reference creates a separate internal record with its old history preserved.

## Unread inbox

Implementation is present in the [unread-inbox change](changes/archive/2026-11-18-add-unread-inbox/tasks.md): actual detail visits mark read once, and cards/details offer explicit overrides. Open's URL-backed All/Unread/Read filter makes read postings easy to revisit. Select jobs enters page-scoped selection mode with card buttons, selected borders/checkmarks, and a stable bottom action dock for atomic bulk actions on up to 50 displayed jobs; Done or Escape restores normal navigation and focus to the mode button or empty-state heading without card checkboxes. Shared Inbox navigation/header counts exclude unavailable postings and archived boards and stay independent of the read filter. Existing records start unread after the explicit `pnpm db:migrate` upgrade. Read state survives ordinary edits, refreshes, restarts, and archive/restore; new posting identities start unread. Reading alone never moves a posting to History. Main specs are synced and this change is archived.

Make new openings easy to revisit over time.

- Persist unread state for initial imports and newly discovered postings.
- Mark read on an actual full-details visit, with explicit mark read and mark unread actions.
- Add bulk read/unread actions.
- Preserve unread leftovers across refreshes and restarts.
- Exclude unavailable postings and archived boards from active counts without deleting history.
- Keep source refresh activity distinct from unread notifications.

Depends on indexed openings. Ready when ten imported postings with four read, followed by fifteen new postings, leave twenty-one unread. Prefetching and content edits must not silently change that state.

## Workspace navigation

Implementation is present in [restructure-workspace-navigation](changes/archive/2026-11-18-restructure-workspace-navigation/tasks.md): the official shadcn inset sidebar connects Dashboard, Inbox, Jobs, and Boards. Dashboard is the root landing page, Inbox is the unread review queue, and Jobs defaults to Open with History, board pages expose scoped postings and existing management controls, and Dashboard offers real local counts and source-failure links. One URL-addressed responsive reader retains review context and restores useful focus/position on close. Collections share debounced search, property menus, List/Cards/Table layouts, and 10/25/50-item pagination. Single shell breadcrumbs, readable centered details, one workspace scroller, and a stable footer selection dock refine navigation. Main specs are synced and both changes are archived, with these newer navigation decisions taking precedence. The [sidebar persistence follow-up](changes/archive/2026-11-18-persist-sidebar-collapse/tasks.md) restores the saved desktop collapse state on the initial render after reload.

## Local discovery

Title/plain-description search and board/workplace filters are implemented alongside debounced input, property menus, shared layouts, and configurable pagination. The [geography and department change](changes/archive/2026-11-18-add-geography-department-filters/tasks.md) adds source-backed Country, Region and Department conditions before totals/pagination, for current and retained historical records, with no reindexing or migration. EU/Europe groups retain exact-country limits and original eligibility restrictions; missing data remains Unknown and unfamiliar departments remain Other. AI role/taxonomy classification and tag storage remain separate future work.

Provide useful browsing over all indexed postings without requiring an agent.

- Search titles and plain-text descriptions using Drizzle contains queries.
- Filter by company, country/broad region, and separate remote/hybrid/on-site workplace type.
- Support multiple locations, show original text, and preserve eligibility restrictions.
- Group EU-labelled jobs under Europe for discovery while keeping exact-country matching precise.
- Represent query, filters, sort, and pagination with nuqs.
- Filter broad departments from explicit provider labels, with team fallback, Other and Unknown; defer role/taxonomy tag storage to the classifier theme.
- Retain salary metadata without introducing compensation filters.

Depends on indexed openings. Ready when filters have consistent options across providers and an exact Spain selection does not broaden to unrelated EU countries or unspecified regional roles.

## Local Codex provider

Create our own reusable AI SDK provider as a package in the pnpm monorepo.

- Verify the pinned AI SDK provider contract and evaluate the official Codex SDK's execution controls.
- Implement text generation and schema output against local Codex execution, using a focused direct CLI runner only if necessary.
- Delegate authentication to Codex and provide clear configuration/unavailable-model errors.
- Isolate each task's context, working directory, and tools from unrelated repository and user configuration.
- Map generation results, usage when available, cancellation, timeouts, and failures into AI SDK behavior.
- Implement the streaming contract without requiring incremental token output initially.
- Cover execution and protocol boundaries with fixtures and focused cross-platform tests.

Depends on workspace foundations and the task coordinator. Ready when local execution can produce validated structured data, cancel cleanly, and fail without damaging task or application state. Do not add the rejected community provider or require hosted sandbox infrastructure.

## Role and department classification

Add optional AI categorization to local discovery.

- Seed Software Engineer, Design Engineer, Frontend Engineer, Backend Engineer, and Fullstack Engineer roles.
- Support overlapping department tags such as Software Engineering, AI/ML, Data, Product, Design, and Finance.
- Reuse known roles, normalize aliases, and accept validated new roles when existing roles do not apply.
- Enable automatic categorization only after explicit configuration and opt-in.
- Batch new or meaningfully changed jobs with only the relevant posting context, taxonomy, and output schema.
- Cache by content, model, taxonomy, and prompt/schema versions; allow explicit retry.
- Keep Unknown for uncategorized or uncertain work, and keep ingestion usable on AI failure.
- Expose role and department filtering without mixing departments with company industry.

Depends on local discovery and the Codex provider. Ready when one posting can carry multiple relevant tags, proposed tags cannot fragment the catalog through trivial aliases, and failed classification does not block the index.

## Profile workspace

Give application generation useful, reusable context owned by the user.

- Add contact fields and experience, skills, projects, education, notes, and custom text/Markdown blocks.
- Allow relevant blocks to be selected for a posting's application context.
- Support per-posting instructions and manually entered employer questions and answer limits.
- Validate and save everything locally using TanStack Form and shared Zod schemas.

Depends on local persistence and the form infrastructure. Ready when context can be maintained independently from generated files, and editing it leaves every existing package unchanged.

## Application packages

Prepare useful application material for one posting at a time.

- Generate grounded, structured resume content and answers from that posting and the selected profile context.
- Render a PDF resume plus editable Markdown/text; include a requested cover letter and other supported answers.
- Provide copyable answers, individual downloads, and a ZIP using `packages/documents`.
- Record exact generation inputs and provenance alongside locally stored output files.
- Replace a posting's unsubmitted draft only after a successful explicit regeneration.
- Keep every posting's package independent from other postings and later profile changes.
- Support retaining submitted packages and later versions according to the application lifecycle.
- Allow redownload of drafts and retained versions from their saved bytes, including for unavailable postings or archived boards.
- Offer navigation to the employer's application page without marking the application applied.

Depends on the profile workspace, Codex provider, and persisted tasks. Implement the package submission/version boundary together with the minimum manual applied confirmation below; the remaining tracker interface can follow separately.

Ready when a user can generate, review, edit source content as appropriate, and download a useful application package independently of form prefilling. Failed regeneration must preserve the previous valid package, and redownload must not call the model.

## Manual application tracking

Record the user's actual progress for each internal posting.

- Maintain one application record with Preparing, Applied, Interviewing, Offer, Accepted, Rejected, or Withdrawn status.
- Support explicit applied dates and dated notes.
- On manual applied confirmation, select the package actually used or record an application without a generated package.
- Freeze submitted files, answers, and their generation context; retain later generated versions.
- Keep application history available after posting closure or board archival.
- Make status updates explicit: file generation, downloads, and employer-page navigation never confirm submission.

Depends on indexed openings; integrate the submission/package boundary with application packages. Ready when the user can identify what they submitted and when, and later regeneration cannot overwrite that record. Repeated application attempts are outside this model.

## Interview preparation

Explore tailored advice, learning paths, practice questions, and preparation material using the relevant posting and user context.

This is a later product theme. Determine output formats, controls, and success criteria in its own OpenSpec exploration before implementation. Do not make preparation features prerequisites for indexing, package generation, or manual tracking.

## Later explorations

| Theme | Scope to explore before committing |
| --- | --- |
| More board providers | Add adapters that meet the complete-snapshot contract; prioritize concrete user needs. |
| Periodic refresh | Add configurable timers and lifecycle behavior for a running local server. |
| Application form prefilling | Explore a browser integration that fills supported fields and attaches files after user confirmation; the user performs final submission. A normal cross-origin tab alone does not grant the app access to its form. |
| Batch generation and application assistance | Define review, cost, cancellation, per-posting context, and package retention before adding bulk actions. |
| Additional AI backends | Add providers or agents through the standardized generation boundary with explicit authentication and capability rules. |
| Full-text search | Revisit SQLite FTS5 if relevance or measured search performance warrants it. |
| Salary filters | Define currency, compensation period, ranges, and missing-data behavior first. |
| Backup/export and restore | Design recovery for the database and saved package files together. |
| Optional paid capabilities | Explore sustainable additions without requiring hosted storage or billing for the local core. |
| External database or synchronization | Treat this as a separate product and migration decision; it is not part of the current local runtime. |

DOCX support is deliberately excluded, rather than scheduled for a later theme. Automatic final employer submission is not part of the agreed application workflow.

## Keeping the plan current

- Create a focused OpenSpec change for the next concrete feature, with requirements and meaningful failure scenarios.
- Use this roadmap for sequencing and dependencies, not as one giant implementation task list.
- Update the stack and architecture when a change intentionally revises a baseline decision.
- Sync feature specs and archive their changes only through the corresponding OpenSpec workflow when the work is actually complete.
- Extend or reorder named themes as experience reveals better priorities; do not introduce numbered stages.
