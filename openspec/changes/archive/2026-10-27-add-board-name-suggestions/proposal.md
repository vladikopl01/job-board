## Why

Adding a board currently requires typing a company name that is often already available on the hosted board page. Make URL entry sufficient to suggest a useful label while preserving offline registration and the user's choice of name.

## What Changes

- Put the board URL first and immediately show a readable slug-name placeholder.
- Look up page metadata after URL entry settles and improve the suggested name when available.
- Keep suggestions in the placeholder and let users enter a custom company name. Use the current suggestion when saving an empty name field.
- Move supplemental explanations into accessible info bubbles; retain concise labels and inline errors.
- Keep saving independent of the lookup and use the slug when metadata or internet access is unavailable.
- Restrict metadata requests to supported canonical board roots with bounded response reads, cancellation, a timeout and no redirects.

## Capabilities

### New Capabilities

- `board-name-suggestions`: URL-first registration with optional page metadata, an offline slug fallback and editable names.

### Modified Capabilities

None. The local registration API still saves the submitted name without fetching employer data; this adds a separate optional form lookup alongside the unarchived company-board tracking change.

## Impact

The add-board form, shared board contracts, local API, browser-safe slug helper, focused tests and current documentation change. A server-only HTML parser is added for metadata extraction. No database migration or job indexing is needed.
