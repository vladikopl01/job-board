## Why

The product and technology decisions from discovery need a durable home before implementation begins. Recording them now gives contributors a shared architecture and an extensible roadmap for a simple, local-first job-board tracker.

## What Changes

- Document the complete agreed stack in `openspec/tech-stack.md`.
- Document workspace boundaries, runtime and data flows, posting identity, unread state, optional AI, and application package history in `openspec/architecture.md`.
- Document the delivery roadmap through named, unnumbered themes in `openspec/roadmap.md`.
- Record pnpm workspaces and a separately owned Codex provider package in this repository.
- Populate OpenSpec project context so later feature changes inherit the decisions.
- Keep unresolved integration checks visible without turning them into unapproved product features.

This change creates documentation only. It does not scaffold the application, install dependencies, run agents, or implement roadmap features. Each implementation will have a focused OpenSpec change with its own requirements and tasks.

## Capabilities

### New Capabilities

None in this documentation change. The documents describe the agreed target behavior; feature changes will introduce the corresponding capability specs when implementation is planned.

### Modified Capabilities

None. There are no existing application specs or shipped behavior to modify. This change declares `skip_specs: true` because it changes planning documentation only.

## Impact

- Adds canonical planning documents and updates `openspec/config.yaml`.
- Adds a documentation-only OpenSpec change with proposal, design, and completion tasks.
- Establishes the intended `apps/web` and `packages/*` responsibilities without creating those workspaces yet.
- Establishes no production, database, dependency, or application-code changes.
