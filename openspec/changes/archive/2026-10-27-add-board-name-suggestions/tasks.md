## Name suggestions

- [x] Add a browser-safe slug-name fallback and shared lookup contracts.
- [x] Implement the guarded, bounded metadata endpoint and HTML name extraction.

## URL-first form

- [x] Put the URL first and add debounced suggestions with editable names, progress feedback and cancellation.
- [x] Preserve manual edits and reject stale results after URL changes, saves and restores.

## Verification and documentation

- [x] Cover metadata parsing, fallback and request boundaries with focused tests.
- [x] Cover URL-first keyboard entry, editing, stale responses and saving without metadata in interaction tests.
- [x] Update current documentation and pass formatting, lint, TypeScript, tests and OpenSpec validation without disrupting the running dev server.

## Placeholder and help refinement

- [x] Render suggestions as placeholders, preserve custom input, and resolve empty or cleared names when saving.
- [x] Replace supplemental board-screen prose with accessible info bubbles and compact lookup progress.
- [x] Update focused interaction tests and documentation, then repeat the relevant quality checks.

Validation on Node.js 24.19.0: all 173 tests in 15 files, workspace/root `tsc --noEmit`, lint, formatting, `git diff --check` and strict OpenSpec validation passed. Interaction coverage includes placeholder-only suggestions, blank/cleared/whitespace override saving, stale lookups, and keyboard/hover/touch help activation. Browser, production-build and cross-platform CI verification were not run.
