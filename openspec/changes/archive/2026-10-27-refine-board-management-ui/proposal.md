## Why

The boards page gives the add form more space than the saved list, and card metadata and actions are difficult to scan. Renaming also opens a second name field below the title and is offered for archived boards.

## What Changes

- Open the existing add-board form in a modal from a top-right New board action and the empty-state action.
- Use Boards in the navigation, mark the current page, and omit the duplicate visible page heading. Keep the view tabs and New board action on one row.
- Show the provider badge and action icons; the selected tab communicates archive state.
- Give empty states and ordinary board cards the same minimum height.
- Replace an active card's title with an inline editor that preserves title typography and layout, retaining validation, explicit save/cancel and failed drafts.
- Offer restoration as the only management action on archived cards.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `company-board-tracking`: Refine the implemented board management interface and available actions.

## Impact

The change affects browser components, focused interaction tests and documentation. Badge, Dialog and Textarea are installed through the shadcn CLI. Existing APIs, schema, stored boards and provider requests are unchanged. This delta follows the unarchived `add-company-board-tracking` baseline.
