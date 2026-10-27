## Why

The local workspace can run and store data, but users cannot maintain the company boards they want to follow. Add a durable board list as the first product feature so later indexing can operate on explicit, user-managed sources.

## What Changes

- Add and list Ashby and Lever company boards using a required company display name and supported HTTPS board URL, including Lever's global and EU hosts.
- Canonicalize board identities locally, reject unsupported or malformed URLs, and prevent duplicate sources across both active and archived records.
- Let users rename the company display name, archive a board, and restore the same record without deleting its history. Keep the source identity fixed after creation.
- Add an accessible `/boards` screen and working navigation from the workspace, with active/archived views, form validation, pending states, local errors, and safe source links.
- Persist boards in SQLite through a reviewed Drizzle migration and validated local Route Handlers. Add TanStack Query, TanStack Form, and application-owned Zod schemas where this feature uses them.
- Introduce `packages/job-boards` for the shared provider identification/canonicalization contract and its Ashby/Lever implementations. Extend root quality checks to cover the new workspace.

Registration validates the URL format without contacting the employer or claiming the board exists. Live verification, feed fetching, posting storage, refresh scheduling, unread counts, and AI remain separate changes. This proposal documents future implementation only.

## Capabilities

### New Capabilities

- `company-board-tracking`: Register supported board sources, retain unique local identities, show the tracking list, rename labels, and archive/restore without data loss.

### Modified Capabilities

- `workspace-quality`: Require the root diagnostic commands to cover all workspaces, including the new provider workspace.

## Impact

- `apps/web`: Adds board-management UI, feature schemas/services, local API endpoints, and the form/query providers needed by this feature.
- `packages/db`: Adds the first product table, a unique source constraint, and a generated forward migration; existing foundation databases are upgraded with the explicit `pnpm db:migrate` command.
- `packages/job-boards`: Adds a small browser-safe source package with typed provider identities and URL parsing, without database access or network requests. Snapshot fetching and a normalized posting format arrive with indexing.
- Workspace manifests, lockfile, test discovery, and README: Include the new package and dependencies, describe supported inputs and archival semantics, and keep all three CI jobs checking the expanded workspace.
- No external database, credentials, live provider dependency, account system, destructive deletion endpoint, or background worker is introduced.

See the agreed [stack](../../tech-stack.md), [architecture](../../architecture.md#company-boards-and-provider-adapters), and [company board tracking roadmap](../../roadmap.md#company-board-tracking).
