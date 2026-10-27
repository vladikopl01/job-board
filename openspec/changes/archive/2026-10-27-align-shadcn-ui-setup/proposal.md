## Why

The generated popover references animation utilities that the app does not load. The custom stylesheet also omits shared shadcn styles and some theme tokens, so reinstalling primitives alone cannot restore their expected appearance and behavior.

## What Changes

- Document CLI-only installation and reinstallation for shadcn primitives in repository guidance and the README.
- Reinstall all nine existing primitives using the configured Base UI / `base-nova` registry through the shadcn CLI.
- Complete the official Tailwind installation, including animation utilities, shared shadcn styles, and required theme tokens.
- Honor reduced-motion preferences while preserving accessible form and help behavior.
- Verify generated CSS as well as existing interaction and quality checks.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-foundation`: Require the shared component styles and standard popup motion to be available, with reduced-motion support.

## Impact

Changes affect repository contributor guidance, the web app's dependency manifest and lockfile, global CSS, installed UI primitives, and stylesheet verification. There are no API or database changes. Shared sliding tab indicators and new panel transitions remain outside this repair.
