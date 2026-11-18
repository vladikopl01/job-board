# Plan 002: Pass lint by correcting the implementation

- Status: complete
- Planned at: `e5e2c3e`, 2026-11-11, including uncommitted navigation work.
- Priority: P1. Effort: S. Risk: low. Depends on: none.
- Scope: `.oxlintrc.json`, CLI-installed input-group/breadcrumb/spinner/field/label primitives, the generated mobile hook, and focused existing component tests.

## Current state

`.oxlintrc.json` disables accessibility rules for InputGroup, Spinner, and Breadcrumb and the effect-state rule for `use-mobile.ts`. Field and Label also suppress individual accessibility checks. The offending patterns are an anonymous group role and div click handler, a static current breadcrumb posing as a disabled link, a decorative SVG posing as a live region, and an effect copying `window.innerWidth` into state.

The user's latest instruction explicitly rejects lint exemptions. Preserve the installed Base UI/base-nova primitives and styles; make small semantic changes rather than replacing them. CLI dry-run and diffs were reviewed before editing. Label must explicitly forward its association and children. Related-control groups already have native FieldSet/FieldLegend compositions.

## Steps

1. Delete the config overrides and UI inline suppressions. Remove unnecessary ARIA from static wrappers and current breadcrumb text. Keep real labels, inputs, and buttons responsible for focus and activation; do not simulate input focus with clickable divs.
2. Make Spinner decorative; the owning button or mounted status text already announces its task. Preserve the animated SVG and its public styling props.
3. Replace the mobile effect/state mirror with `useSyncExternalStore` over the matching media query and a stable false server snapshot. Subscribe/unsubscribe to media-query changes.

## Verification and done criteria

- `pnpm lint` exits 0 with no config overrides or UI disable comments. Do not weaken rules or add alternative suppressions.
- Run existing form, breadcrumb, shell, and refresh interaction tests, then the full test suite and TypeScript checks. Match existing React/TypeScript conventions and keep the current API.
- `pnpm format:check` and `git diff --check` pass. Use Node24.19.0/pnpm10.28.0.
- No source replacement, package update, database access, migration, commit, or server restart. Stop if an official component needs a broad rewrite; prefer a smaller composition change.

## Maintenance

Future CLI updates must retain these semantic corrections and pass the unchanged lint rules. The URL parser's separate control-character regex suppression is not a UI exemption: it protects the validated URL boundary and remains intentional.

## Completed verification

Lint passes without config overrides or UI inline suppressions. All 267 tests, formatting, fresh workspace TypeScript checks, and the isolated production build pass. The Standards review found no unresolved implementation-standard breach; its stale README exception description was corrected.
