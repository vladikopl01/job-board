## Component workflow

- [x] Record CLI-only shadcn installation and reinstallation in repository guidance and the README.
- [x] Reinstall all nine existing primitives through the CLI after reviewing dry runs and diffs, and review generated files.

## Shared styles

- [x] Install the official shared-style dependencies and complete global imports and theme tokens.
- [x] Honor reduced motion while retaining standard generated popup motion and existing interactions.

## Verification and documentation

- [x] Verify compiled animation CSS, orientation selectors, and required component surfaces with focused checks.
- [x] Update canonical stack documentation and pass formatting, lint, TypeScript, tests and strict OpenSpec validation.

## Verification record

- Reinstalled `alert`, `button`, `empty`, `field`, `input`, `label`, `popover`, `separator`, and `tabs` using shadcn CLI 4.23.0 after reviewing dry runs and diffs.
- `pnpm test`: 175 tests passed across 16 files, including compiled stylesheet and existing help/form interactions.
- `pnpm lint`, `pnpm format:check`, `pnpm --recursive typecheck`, root `tsc --noEmit`, `git diff --check`, and strict validation of this change passed.
- No browser verification or Next build was run; the user's existing dev server and database were left untouched. CSS was verified through the real Tailwind/PostCSS pipeline.
