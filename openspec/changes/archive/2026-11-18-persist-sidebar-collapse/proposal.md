## Why

Collapsing the desktop sidebar already writes a preference cookie, but reloading always expands it. The initial server render must use the saved choice so reloads preserve the user's workspace layout.

## What Changes

- Restore the saved desktop sidebar state on initial rendering and keep the installed shadcn toggle's existing cookie behavior.
- Default to expanded when the cookie is missing or invalid; keep the narrow-screen drawer independent.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `workspace-navigation`: Desktop sidebar state persists across reloads without a delayed collapse after hydration.

## Impact

Root layout request rendering, workspace provider props, shell initialization, focused render/interaction tests and navigation documentation. No storage migration, new dependencies or primitive changes.
