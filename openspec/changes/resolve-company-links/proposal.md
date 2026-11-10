## Why

Existing company links on job cards, posting details and saved boards lead to a missing `/boards/[id]` page. The board list already contains the relevant saved record and its management actions.

## What Changes

- Temporarily redirect existing company URLs to their saved board cards in the correct Active or Archived view.
- Focus an explicitly linked card when its local data arrives.
- Preserve not-found behavior for missing and invalid identifiers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `company-board-tracking`: Resolve saved company URLs while dedicated company pages remain deferred.

## Impact

A request-time route and board-card focus behavior. Depends on `persist-board-view` for archived destinations. No schema, provider requests, dependencies or dedicated company-detail interface.
