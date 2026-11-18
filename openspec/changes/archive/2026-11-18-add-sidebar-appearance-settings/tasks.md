## Implementation

- [x] Compose a footer Settings popover and labeled single-selection theme controls from the installed primitives, retaining collapsed-sidebar access.
- [x] Add root theme persistence, System tracking, native color-scheme support and pre-hydration initialization with next-themes.
- [x] Preserve the existing shadcn preset palette and measure declared text contrast in both themes.

## Verification

- [x] Cover Light/Dark switching, saved preference restoration, System updates and collapsed-sidebar keyboard/focus behavior with focused interaction tests.
- [x] Complete formatting, lint, type checks, strict OpenSpec validation and the isolated production build; record limitations.

All eight focused settings/workspace tests pass, including three new appearance interaction checks. Formatting, lint, whitespace checks, all 12 strict OpenSpec validations, fresh route generation, workspace TypeScript checks and the isolated production build pass. The generated Dashboard HTML includes the class-based System initialization script before page content. Application source, manifest and lockfile match the validation copy. The preset configuration, CSS palette and installed primitives are unchanged; the only dependency addition is next-themes 0.4.6.

No browser, dev server, provider refresh, migration, live database or workspace build output was used. The isolated data directory was never created. Browser appearance, mobile positioning and first-paint theme behavior remain unverified; declared color verification is recorded in design.md.

## Closeout

Synced to the main specifications and archived on 2026-11-18. Later navigation and collection decisions supersede earlier presentation details. Existing verification limits remain recorded above; archival does not claim additional browser or cross-platform checks.
