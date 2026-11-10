## Implementation

- [x] Confirm existing company URLs return 404 in the running app.
- [x] Add a validated request-time temporary redirect using saved archive state.
- [x] Reproduce deferred fragment focus with a failing test and focus the linked card after loading.

## Verification

- [x] Pass formatting, lint, types and the complete test suite.
- [x] Verify active/archived 307 locations and invalid/missing 404 responses over HTTP.
- [x] Follow existing company links and verify the correct view, focused card and narrow layout in the isolated app.
