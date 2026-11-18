# Standards and Spec review

The 282-test review below records the earlier screenshot pass. The [compact controls follow-up](004-collection-controls.md) supersedes its floating-footer, Select jobs label and outlined-badge decisions; its final review is appended separately.

Two independent read-only reviewers inspected the current tracked and untracked work against `e5e2c3e8f03d105783810ebf4b04757729688b05`. Tracked diff: `git diff e5e2c3e8f03d105783810ebf4b04757729688b05 -- .`; untracked coverage: `git ls-files --others --exclude-standard`. No commits were created. The parent owns all fixes.

Sources: root/app AGENTS, README, TypeScript guidance, the latest screenshot brief, active unread-inbox/navigation OpenSpec changes and [collection polish report](003-collection-polish.md). The latest screenshot request supersedes earlier tab, inline-reader and document-flow pagination decisions. The review skill's `docs/agents/issue-tracker.md` is absent; `/setup-matt-pocock-skills` would configure it. The local specs and screenshot brief supplied this review's requirements.

## Standards

- **Medium — `components/collection/use-collection-table.ts`:** The storage schema allowed only five pinned columns while the actual menus permitted six or more. Reloading discarded the entire layout, including unrelated widths and visibility. This violated boundary-validation guidance: valid domain state must survive parsing. **Resolved:** pinning accepts the same 30-column bound as ordering. A real table test pins six columns, changes another column's width, remounts and verifies both survive.
- **Low — `features/boards/board-columns.tsx`:** The table's Source URL lacked the external-link icon required by README. **Resolved:** add the decorative icon beside independently truncated text. The reviewer verified this correction in source.

No further documented-standard breaches or meaningful abstraction smells were reported in the inspected code. Oxlint's previous per-file overrides are removed; no lint suppression was added for the new implementation. The existing URL-parser security exception predates this work.

## Spec

- **P2 — `features/jobs/jobs-client.tsx`:** The header changed Select jobs to Done selecting, contradicting the unread spec's stable-label requirement. **Resolved:** retain Select jobs and its pressed state; the dock already supplies Done. Interaction tests assert the stable name and keyboard/touch behavior.
- **P2 — `features/jobs/jobs-client.tsx`, `features/boards/boards-client.tsx`:** Legacy board/read/provider URL conditions used arrays, while single-select controls expected strings. Rows were filtered but the current value appeared blank. **Resolved:** normalize the legacy single-select values to strings. Jobs and Boards tests assert their effective values in the actual filter menus.
- **P2 — saved column pinning:** The same persistence defect above contradicted the requirement to retain column customization. **Resolved** by the shared schema correction and six-pin remount test.

No other source-level specification gap was reported across the shell, layouts, advanced controls, cards, pagination, reader or Boards. The parent verified the small corrections and regression tests; no second independent review or browser approval is implied.

## Final validation

- **282 tests pass across 30 files.** Coverage includes real SQLite filter/sort execution before counts/pagination, advanced-control interactions, combined reset, saved columns, legacy URL values, reader focus/continuity, read-state behavior and route/page focus.
- Lint, formatting, diff whitespace checks and all **11 strict OpenSpec validations** pass.
- Fresh Next route generation, all workspace TypeScript checks and the production build pass with Node 24.19.0 / pnpm 10.28.0 in an isolated copy. No environment files or existing data were copied; its data directory was never created. The running app's output was untouched.
- Generated production CSS includes viewport height, sticky positioning, the reader's 200ms ease-out curve and reduced-motion handling. The development fixture's scenarios are excluded from the production page.
- `/dev/job-card` retains 24 static scenarios for user observation. **Browser rendering, geometry, zoom, RTL, safe areas, rendered contrast and animation frame timing remain unverified.** No browser, new server, live database, migration or provider refresh was used.

Remaining findings: **Standards 0; Spec 0.** Worst unresolved issue within either axis: none confirmed in the inspected scope.

## Earlier audit review

The earlier 267-test snapshot also resolved duplicated posting-link interception, stale lint documentation and pending-rename focus theft. Those corrections remain in place. Its historical audit decisions are preserved in [the audit index](README.md); current screenshot-specific behavior and validation are described above.

## Compact controls follow-up review

Two fresh independent read-only reviewers used the same fixed point and tracked/untracked coverage, concentrating on the latest [screenshot follow-up](004-collection-controls.md). The parent owned every edit. The current screenshot brief supersedes earlier floating pagination, viewport-centered selection dock, outlined badge and Select jobs wording.

### Standards

- **Low — field picker/layout icon conventions:** Add the installed button icon-position attribute to the picker chevron and remove redundant manual layout-icon sizing. **Resolved.**
- **Low — navigation badge classes:** Use `cn()` for the conditional count background instead of duplicating the base classes in a ternary. **Resolved.**

No meaningful abstraction smell was reported. The small footer context, shared toolbar and field picker each serve current collection behavior.

### Spec

- **P2 — keyboard reordering:** Sortable returned when the original activation event was default-prevented. The installed keyboard sensor prevents that event itself, so a keyboard drop could not update ordering. **Resolved:** remove those guards, restoring the installed start/drop handling. The real collection test now chooses fields, reorders through the keyboard sensor, verifies the announced position and asserts the resulting multi-sort order.
- **Narrow toolbar layout concern:** The left group's zero flex basis could let it shrink beside the actions. **Addressed in source:** use its content basis so the outer toolbar can wrap the action group. Browser geometry remains unverified.

Remaining confirmed findings: **Standards 0; Spec 0.** Worst unresolved issue within either axis: none confirmed in this refinement. Small fixes were completed and verified by the parent; no additional independent review is implied.

### Validation

- **283 tests pass across 30 files**, including field selection before query mutation, searchable choices, keyboard rule reordering, footer ownership, selection/focus continuity and unknown-count loading/failure behavior.
- Lint, formatting, whitespace checks and all **11 strict OpenSpec validations** pass. No lint exemption was introduced.
- Fresh Next route generation, all workspace/root TypeScript checks and the production build pass in an isolated Node 24.19.0 / pnpm 10.28.0 copy. The copied source matches the final implementation; its validation-data directory was not created.
- Generated CSS includes the common popup border ring and distinct navigation-count token. Rendering, narrow-width geometry, zoom, safe areas, RTL and frame timing remain **not browser-verified**.
- No browser, new dev server, live database, migration or provider request was used. Existing app output was untouched; work remains uncommitted.
