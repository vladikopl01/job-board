## Why

The application has complete preset palettes for light and dark appearances but no way to choose them. A sidebar settings popover makes the preference available throughout the workspace.

## What Changes

- Add Settings to the sidebar footer, including the collapsed sidebar.
- Offer Light, Dark and System theme choices; default to System and persist the preference in this browser.
- Apply the existing shadcn preset palettes throughout the app and follow OS appearance changes when System is selected.

## Capabilities

### New Capabilities

- `workspace-appearance`: Persistent appearance selection through an accessible sidebar settings popover.

### Modified Capabilities

None.

## Impact

Compose the installed Sidebar, Popover, Field and ToggleGroup components. Add next-themes for root class switching, pre-hydration theme initialization, browser storage and system preference tracking. Keep preset tokens and installed primitives intact. No server API or database changes are needed.
