## Decisions

- Use the installed nuqs string-literal parser, matching Jobs. An absent or unsupported value selects Active; selecting Active removes the default value from the URL. Keep the existing replace-history convention.
- Use the existing Jobs page's `connection()` pattern to render the requested tab initially.
- Keep duplicate-board location, dialog dismissal and archive/restore focus behavior intact. Changing views does not mutate stored boards.

## Risks / Trade-offs

All tests that compose Boards need a nuqs testing adapter, matching the application layout. The URL retains a view, not a particular loaded query result.

## Migration Plan

No migration. Reverting the component and page changes restores the previous local tab state.
