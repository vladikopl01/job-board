## Decisions

- Keep the existing `/boards/[id]` contract. Validate the UUID and read only the saved board's archive state at request time, then use a temporary 307 redirect to `/boards` with the appropriate view and card fragment.
- Keep full company pages deferred. A temporary redirect can be replaced without changing existing links or permanently caching the destination.
- Focus the matching card when it mounts: local data can arrive after the router's initial fragment handling. Reuse its existing accessible name, programmatic focus target and focus tokens.
- Invalid and missing IDs use the existing not-found boundary. Storage errors use the existing application error boundary.

## Risks / Trade-offs

This destination offers board management, not company-specific job browsing. It depends on the archived-view URL behavior in `persist-board-view`.

## Migration Plan

No migration. Removing the new route restores the placeholder behavior. Dedicated company pages can replace the route later.
