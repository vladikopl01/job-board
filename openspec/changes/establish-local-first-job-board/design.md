## Context

See [proposal.md](proposal.md) for the motivation and documentation-only scope. The repository has an OpenSpec scaffold but no application code, package manifest, database, or shipped capabilities. Discovery established the target product behavior and stack; the latest decision is a pnpm monorepo with our own Codex provider package.

The canonical target documents are [the stack](../../tech-stack.md), [the architecture](../../architecture.md), and [the roadmap](../../roadmap.md). This artifact explains how that baseline is captured and maintained; it does not authorize implementation of the described application.

## Goals / Non-Goals

**Goals:**

- Give contributors one discoverable place for each of the stack, architecture, and roadmap.
- Preserve the agreed edge cases and distinguish accepted behavior from later explorations and integration checks.
- Separate package responsibilities while retaining a single local Next.js runtime.
- Make subsequent OpenSpec feature changes inherit the baseline without pretending features already exist.

**Non-Goals:**

- Scaffolding workspaces, installing libraries, implementing product features, or creating a database.
- Defining every future feature's detailed capability spec in one oversized change.
- Archiving this change or claiming that any roadmap theme is implemented.

## Decisions

### Canonical documents live at the OpenSpec root

Store the agreed baseline in `openspec/tech-stack.md`, `openspec/architecture.md`, and `openspec/roadmap.md`. Keep concise operational context and artifact rules in `openspec/config.yaml`.

Alternative considered: keep the complete baseline only in this change's design artifact. Root documents are easier to discover and retain stable locations when a change is eventually archived. Another alternative is to copy the entire baseline into config; concise context with canonical references avoids duplicating the full documents in every future artifact prompt.

### This change explicitly skips capability deltas

Set `skip_specs: true` because this change documents the agreed target without changing executable behavior. Introduce observable requirements and failure scenarios through the corresponding feature changes when implementation is planned.

Alternative considered: add delta specs for every future capability now. That would combine the complete product roadmap into one implementation change and make status misleading. Existing main specs remain untouched because there are none to update and no implemented behavior to sync.

### pnpm workspaces express package ownership

Record `apps/web` plus focused database, job-board, AI-provider, and document packages. The app composes workflows; packages expose narrow capabilities without depending on the app. Introduce concrete packages as their implementation is needed.

Alternative considered: keep every concern inside the Next.js directory. The requested monorepo gives the Codex provider a clear reusable boundary. A separate repository or build orchestrator is unnecessary at this point.

### Preserve runtime and product invariants explicitly

The architecture records in-process task execution, complete-refresh reconciliation, internal posting UUIDs, persistent unread state, deterministic geography, optional AI classification, and independent per-posting package lifecycles. It also records exact downloads and submitted-version retention so later features do not infer destructive behavior from source closure or regeneration.

Alternative considered: capture only library names. That would omit the invariants most likely to be lost during implementation, even if the stack stayed identical.

### Separate decisions from implementation verification

Our own AI SDK provider is settled. The official Codex SDK is the first execution-layer candidate, subject to a focused compatibility check; a direct CLI runner remains contained behind our provider if necessary. Exact dependency versions, Oxc rule coverage, and native SQLite installation are also explicit checks for the relevant feature changes.

Alternative considered: treat unverified SDK signatures or cross-platform behavior as established facts. Recording verification gates avoids committing the design to capabilities that have not been exercised.

### Use named roadmap themes

Describe dependencies and readiness evidence under unnumbered headings. Keep later explorations separate from accepted feature behavior. The roadmap can grow without renumbering stages or implying fixed release dates.

Alternative considered: one numbered delivery sequence or a large implementation checklist. Named themes preserve the requested flexibility while smaller OpenSpec changes supply executable tasks.

## Risks / Trade-offs

- [Baseline documents can drift from feature changes] → Require intentional baseline updates when decisions change, and use OpenSpec context to point contributors to the canonical documents.
- [Target architecture could be mistaken for implemented behavior] → Mark documents as a planned target and roadmap themes as unimplemented; keep feature specs separate.
- [Package boundaries could create unnecessary ceremony] → Add packages only when used, avoid a generic shared package, and start with pnpm workspace tooling.
- [Owning the Codex provider creates maintenance work] → Limit initial capabilities, pin the integration contract, and plan focused execution/compatibility tests.
- [Local data and tasks can be interrupted] → Record durable task state, preserve previous committed data and package files, and require explicit retry where repeating AI work could incur cost.

## Migration Plan

This change adds planning files and replaces the example OpenSpec context with the agreed project context. It requires no dependency, application, or database migration. Future implementation changes define their own setup, migration, and validation steps.
