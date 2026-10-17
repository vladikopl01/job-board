# Agreed technology stack

Status: agreed target as of 2026-10-17, with the workspace foundation implemented in `apps/web` and `packages/db`. Foundation dependencies are pinned in the manifests and lockfile; the remaining feature dependencies will be introduced when needed. Read this with the [architecture](architecture.md) and [roadmap](roadmap.md).

## Platform and workspace

| Concern | Choice | Responsibility |
| --- | --- | --- |
| Application runtime | Node.js 24 LTS | Run the local Next.js server and server-side packages. |
| Supported systems | macOS, Linux, Windows | Support documented clone, install, migrate, and run workflows. |
| Package manager | pnpm | Install dependencies using a committed lockfile and pinned package-manager version. |
| Repository structure | pnpm workspaces | Separate `apps/web` from focused `packages/*`; maintain one repository. |
| Language | TypeScript, strict mode | Share typed contracts across application and package boundaries. |
| Web framework | Next.js 16 App Router and React 19 | Deliver a responsive browser interface and the local server. |
| Application build | Next.js with Turbopack | Use the framework's build pipeline. |
| Planning | OpenSpec | Maintain this baseline and plan focused feature changes. |

The latest workspace decision selects pnpm, replacing the earlier Bun package-manager preference. The application runtime remains Node.js. Start with pnpm's workspace commands; add a build orchestrator only if a concrete need emerges.

## Interface and local API

| Concern | Choice | Responsibility |
| --- | --- | --- |
| Styling | Tailwind CSS 4 | Responsive layout, theme tokens, and component styles. |
| Components | shadcn/ui with Base UI primitives | Accessible, locally owned interface components. |
| Icons | Lucide | A consistent icon set. |
| Server data in the browser | TanStack Query 5 | Cache local API results, manage mutations, and observe task progress. |
| Forms | TanStack Form | Profile blocks, board forms, notes, and application inputs. |
| Validation | Zod 4 | Validate route payloads, provider inputs, and generated content at runtime. |
| URL state | nuqs | Represent search, filters, sort, and pagination in URL search parameters. |
| Transient interface state | React state | Manage open panels, dialogs, and other ephemeral interactions. |
| Local API | Next.js Route Handlers | Expose validated reads, mutations, downloads, and task status from the Node runtime. |

Keep schemas shared between a route and its callers without importing server-only dependencies into browser code. A separate API service, RPC framework, and global state store are unnecessary for the initial design.

## Persistence, ingestion, and tasks

| Concern | Choice | Responsibility |
| --- | --- | --- |
| Database | SQLite | Store boards, indexed postings, unread state, profile context, tasks, and application history locally. |
| SQLite driver | better-sqlite3 | Access the database from the Next.js Node server. |
| ORM | Drizzle ORM | Define schemas and execute queries and transactions. |
| Migrations | Drizzle Kit and committed migrations | Version database changes and make clone-and-run setup reproducible. |
| Initial text search | Drizzle `like()` predicates | Search indexed titles and plain-text descriptions using parameterized contains queries. |
| Board ingestion | Typed Ashby and Lever adapters | Read public feeds, validate complete snapshots, and return a shared job format. |
| Refresh and AI task state | SQLite task records | Persist queued work, ownership, progress, outcomes, and interruptions. |
| Task execution | A bounded coordinator inside the Next.js server | Run asynchronous provider requests and Codex executions without a separate worker process. |
| Files | A configurable local data directory | Keep SQLite and generated package bytes outside tracked source files. |

Prefer Drizzle for all supported SQL. Use a raw SQL migration or query only when an actual requirement cannot be expressed through Drizzle, and keep that exception contained. SQLite FTS5 is deferred: it offers a specialized full-text index and relevance features, but introduces virtual-table, synchronization, and query work that basic contains search does not require.

Use SQLite foreign keys, WAL mode, a bounded busy timeout, and short transactions. Fetching boards, waiting for an agent, and rendering documents must happen outside database transactions. SQLite remains an explicit local choice; moving to an external database later would require a deliberate migration rather than merely replacing a driver.

## AI and generated documents

| Concern | Choice | Responsibility |
| --- | --- | --- |
| Generation interface | Vercel AI SDK Core | Standardize generation requests and results at the application boundary. |
| Codex integration | Our own provider in `packages/ai-codex` | Implement the AI SDK language-model contract for local Codex execution. |
| Execution layer | Evaluate the official `@openai/codex-sdk` first | Use it if the pinned version supports the required execution, schema, isolation, and cancellation controls; otherwise use a focused `codex exec` runner behind our provider. |
| Structured results | JSON Schema and application-owned Zod schemas | Validate categorization and application content before persistence or rendering. |
| Model selection | Explicit user configuration from available Codex models | Allow an inexpensive supported model for categorization; verify availability instead of hard-coding a promised Luna model or silently choosing a more expensive fallback. |
| PDF output | `@react-pdf/renderer` 4 | Render structured resume and optional cover-letter content into PDFs. |
| Editable content | Markdown and plain text | Provide editable resume content, answers, and other application material. |
| Package archives | fflate | Bundle stored package files into downloadable ZIP archives. |

Do not depend on the previously discussed community Codex CLI provider. Do not require Vercel hosting, AI Gateway, or a hosted sandbox for the local execution route. AI SDK and the execution runner stay server-only.

The provider starts with text input and schema-constrained output, a fresh execution per task or batch, explicit unsupported-capability errors, and cancellation/error mapping. Implement the AI SDK generation and streaming contracts; the initial stream may deliver completed text in one chunk. Actual token streaming is not an initial requirement.

Codex manages its own sign-in; the application must not extract or duplicate authentication tokens. Local agent execution can still use remote inference. The core tracker works without an agent, and automatic AI categorization starts only after the user configures and enables it.

The model generates structured content. Application code renders files, persists their exact bytes, and serves downloads. DOCX support is excluded.

## Quality and automation

| Concern | Choice | Responsibility |
| --- | --- | --- |
| Formatting | Oxfmt | Format source and supported configuration files. |
| Linting | Oxlint | Enforce TypeScript, React, Next.js, accessibility, and test rules that are supported and explicitly configured. |
| Type checking | `tsc --noEmit` | Check types independently of formatting, linting, and test execution. |
| Unit and integration tests | Vitest | Test provider contracts, reconciliation, normalization, task transitions, and package history. |
| Test toolchain | Vite | Support Vitest; it is not the application bundler. |
| Component tests | React Testing Library | Verify meaningful form, inbox, and interaction behavior. |
| Database tests | Temporary SQLite databases with real migrations | Check relational constraints, transactions, and persistence behavior. |
| Continuous integration | GitHub Actions | Check the supported operating systems and the workspace dependency graph. |

The root commands are `dev`, `build`, `start`, `db:generate`, `db:migrate`, `format`, `format:check`, `lint`, `typecheck`, and `test`. Their concrete script definitions are in the root manifest; the [README](../README.md) documents their use.

Validate native SQLite installation, migrations, package exports, and core tests on macOS, Linux, and Windows. Use fixtures for routine provider and Codex integration tests; real network or agent runs should be explicit. Keep tests focused on behavior and failure boundaries.

## Verification before introducing dependencies

- Pin compatible versions of Next.js, React, TypeScript, the AI SDK provider contract, and the official Codex SDK if used; compile the chosen package versions rather than copying stale example interfaces.
- Verify the chosen Codex execution layer can use the intended installed runtime and saved login while limiting working directory, configuration inheritance, tools, and unrelated context.
- Verify schema output, cancellation, timeout cleanup, interrupted execution, and nonzero exits across supported operating systems.
- Confirm Oxc rule coverage against the pinned versions, and explicitly address any required checks it does not cover.
- Verify actual SQLite native-module installation on the selected Node runtime in CI.

Apply these checks as the relevant feature dependencies are introduced. The workspace-foundation change records its own verification; future feature integrations are not validated by the foundation checks.

## Source references

- [AI SDK custom-provider contract](https://ai-sdk.dev/providers/community-providers/custom-providers)
- [Official Codex SDK documentation](https://learn.chatgpt.com/docs/codex-sdk)
- [Codex non-interactive execution](https://learn.chatgpt.com/docs/non-interactive-mode)
