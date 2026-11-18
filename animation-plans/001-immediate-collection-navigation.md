# Plan 001: Keep routine navigation immediate

- Status: complete
- Planned at: `e5e2c3e`, 2026-11-11, including uncommitted navigation work.
- Priority: P2. Effort: S. Risk: low. Depends on: none.
- Scope: application shell/sidebar policy and CollectionViews. Preserve generated Sidebar/Tabs primitives.

Historical implementation snapshot. The latest screenshot request replaces tabs with a Select and the inline reader with an overlay Sheet; see [current motion decisions](README.md). The verification below belongs to the original snapshot.

## Current state and rationale

`apps/web/src/components/ui/sidebar.tsx:214,226` transitions desktop width/left/right for 200ms, while `app-sidebar.tsx:27,37` hides brand/footer immediately. Cmd/Ctrl+B invokes that same layout animation. `collection-views.tsx` inherits `transition-all` and a separate indicator opacity transition from the official TabsTrigger.

This is an information-dense daily dashboard. Keyboard and repeated navigation fail the frequency gate for added motion. Selection, the portaled dock, reader navigation, filters, and list data must remain still. Standard help popup motion and the reduced-motion-aware 180ms refresh completion opacity pulse are documented intentional behavior; preserve them.

## Steps

1. Give the application shell a desktop-only CSS policy that applies `transition: none` to its sidebar geometry, group labels, and menu layout. Limit this to `[data-app-shell]` at the project's desktop breakpoint (48rem); retain the mobile Sheet's existing overlay behavior. Target 0ms geometry and visibility together; no new easing or motion dependency.
2. Set `transition-none after:transition-none` on the three application CollectionViews triggers, including the indicator. Target0ms activation for pointer and keyboard alike.
3. Preserve the intentional refresh completion pulse, increasing its minimum opacity from 0.55 to 0.85. On the declared light muted-text/background pair this raises its minimum contrast from 2.53:1 to 4.89:1; preserve the 180ms ease-out curve, cancellation, and reduced-motion opt-out.

## Verification and done criteria

- Inspect the generated production CSS for the scoped desktop policy and indicator transition suppression.
- Run `pnpm lint`, `pnpm test --reporter=dot`, `pnpm format:check`, and workspace TypeScript checks with Node24.19.0/pnpm10.28.0; all must exit0.
- Build only in an isolated copy with a temporary data path; do not touch the running app's `.next` or database.
- No new animation on selection, navigation, data, empty states, or commands; no reduced-motion regression. No new package, source primitive rewrite, server, browser, or commit.
- Browser frame timing, slow-motion replay, mobile feel, 320px/200%/RTL geometry remain unverified. Source timing is not proof of observed frame drops.

## Maintenance and exclusions

Keep high-frequency keyboard actions immediate. No additive opportunity survived all four gates: existing unanimated seams are repeated actions or data users need to read. Rejected candidates include the selection dock (frequency), reader/list changes (frequency/function), property command pages (keyboard), Dashboard count-up (function), and first-board empty-state stagger (purpose/function).

## Completed verification

All 267 tests, lint, formatting, fresh workspace TypeScript checks, and the isolated production build pass. Generated production CSS contains the app-scoped desktop `transition: none` policy, immediate tab transition utility, and immediate tab-indicator utility. The isolated data directory was never created. Runtime frame timing and visual rendering remain unverified.
