## Context

The app uses Tailwind 4 and CLI-generated Base UI / `base-nova` primitives. Its global stylesheet currently imports only Tailwind, substitutes custom orientation variants, and omits some standard surface tokens. See `proposal.md` for the repair scope.

## Goals / Non-Goals

**Goals:** Restore generated components' shared styles and popup motion, reinstall existing primitives through the CLI, and make the same workflow explicit for future changes.

**Non-Goals:** A preset change, a new animation library, custom tab motion, new product features, or database changes.

## Decisions

- Keep the configured preset and use CLI dry runs and diffs before reinstalling all nine installed primitives. Format generated files using Oxfmt and review compatibility with existing callers.
- Follow shadcn's documented existing-project installation: add pinned `shadcn` and `tw-animate-css` build dependencies and import both shared stylesheets after Tailwind. Use the shared orientation variants instead of maintaining duplicates.
- Supply the official semantic theme token structure while retaining the app's current palette. A component's surface belongs in the theme rather than a local replacement class.
- Keep generated primitive motion intact and honor reduced motion with a small scoped stylesheet rule. Do not introduce a JavaScript motion dependency or a sliding tab indicator.
- Verify the actual compiled stylesheet through `@tailwindcss/postcss` and a pinned direct `postcss` dependency, including its CSS-package export resolution. Check popup entrance/exit keyframes, fade/scale utilities, orientation selectors, and required surface colors. Existing DOM tests verify interaction; they cannot demonstrate visible animation.
- Keep only minimal compatibility adjustments after the reinstall: forward the tab orientation to Base UI, and narrowly suppress false-positive accessibility lint rules in the generated label and field wrappers. The label still forwards association props; the field keeps the generated group semantics.
- Record CLI-only installation in `AGENTS.md`, the README, and canonical stack context. Product-specific components continue to compose installed primitives.

## Risks / Trade-offs

- Reinstalling can replace intentional local fixes → save a temporary source snapshot, inspect CLI diffs, then run lint, TypeScript and interaction tests against the result.
- Tests can pass despite missing CSS imports → verify compiled CSS from the app's stylesheet with its real dependencies.
- The user's local dev server may already be running → avoid building into its `.next` directory or starting another server; use isolated checks.

## Migration Plan

Install the updated lockfile and use the existing local app. No data migration is required. Reverting the dependency, CSS and primitive changes restores the previous UI setup without changing stored data.
