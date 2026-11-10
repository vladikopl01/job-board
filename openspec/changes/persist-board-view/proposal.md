## Why

Reloading or bookmarking Archived boards currently opens Active instead. Jobs already preserves its selected view in the URL.

## What Changes

- Preserve the selected board view in `?view=archived`, with Active as the default.
- Render the requested tab in the initial response and retain existing modal, focus and refresh behavior.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `company-board-tracking`: Preserve the selected board view when revisiting its URL.

## Impact

Boards page, its existing nuqs integration, and interaction test adapters. No schema, API, provider, dependency or visual changes.
