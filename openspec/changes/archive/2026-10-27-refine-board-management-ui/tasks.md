## Interface

- [x] Install Badge and Dialog through the shadcn CLI and review generated components and dependency changes.
- [x] Move creation into a titled modal with New board and empty-state entry points, URL focus, pending protection, and confirmed-save/duplicate-navigation dismissal.
- [x] Add provider badges and action icons; move rename into the active title position with keyboard save/cancel and retained failures; show Restore only for archived cards.

- [x] Remove the duplicate heading and status badges, and put the view tabs and New board action in one toolbar row.
- [x] Give board cards and empty states the same minimum height while allowing content to grow.
- [x] Install Textarea through the shadcn CLI and preserve title typography and card geometry during renaming, with actions in the existing footer.
- [x] Rename navigation to Boards, show the current route, remove the visible page title, and compact the header spacing while retaining accessible page naming.

## Verification and documentation

- [x] Adapt focused interaction coverage for modal creation, duplicate navigation, inline rename and archived actions.
- [x] Update contributor/product documentation and verify formatting, lint, types, tests and strict OpenSpec validation.
- [x] Verify the refined toolbar and rename interactions, reconcile documentation, and rerun the affected checks.
- [x] Verify the navigation/header refinement and reconcile its documentation.

## Verification

- Formatting and lint: `pnpm format:check` and `pnpm lint`.
- Types: `pnpm --recursive typecheck` and `pnpm exec tsc --noEmit`, without changing the running dev server's Next output.
- Tests: `pnpm exec vitest run --maxWorkers=2 --testTimeout=15000` — 116 tests passed. The default five-second limit timed out in the existing database CLI test in this environment; its source and default timeout were left unchanged.
- Spec: `openspec validate refine-board-management-ui --strict`.
- Existing localhost preview: confirmed the single heading, shared toolbar, provider-only badges, matching 160px card/empty-state height, and toolbar fit without horizontal overflow at a 320px viewport.
- Rename geometry: the title position, dimensions, font, line height, URL position, footer position, and card height are identical when editing starts. A longer draft wraps cleanly; Cancel restores the confirmed title and focus.
- Browser verification caught and fixed a native click issue where reusing Rename as Save submitted immediately. That check submitted Phantom's existing name once; subsequent checks used editing and cancellation without saving.
- Header refinement: formatting, lint, recursive workspace type checks, strict OpenSpec validation and whitespace checks passed. Browser inspection confirmed Boards/Workspace selection follows navigation, the visible page heading is removed, and the compact header fits a 320px viewport without horizontal overflow. These header checks did not write board data.
