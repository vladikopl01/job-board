## Context

The existing form uses TanStack Form and submits an explicit company name to the local board API. Supported board roots are already identified in the browser-safe `@job-board/job-boards` package. This change adds an optional lookup before saving; the registration service and database schema remain unchanged. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:** Reuse URL validation and local API guards, keep saving usable without internet, and preserve user edits during asynchronous lookup.

**Non-Goals:** Job indexing, board verification, arbitrary websites, AI name guessing or updating names of existing records.

## Decisions

- Keep slug formatting in the browser-safe board package so the form suggests a name immediately, including offline. Retain mixed-case words, separate common slug delimiters and bound suggestions to the existing name limit.
- Add `POST /api/boards/name-suggestion` with shared Zod request/response contracts and the existing same-origin JSON guard. It performs no SQLite reads or writes. Fetching on the server avoids provider CORS restrictions; making this a separate endpoint keeps registration independent of network work.
- Fetch only the validated canonical URL, with a four-second timeout, request cancellation, no redirects, no forwarded credentials and at most 256 KiB of decoded response data. Parse the available HTML prefix with server-only `parse5`, already present transitively, rather than matching HTML tags with regular expressions or launching a browser.
- Prefer usable site-name, Open Graph title, Twitter title and document title metadata. Decode entities through the parser, collapse whitespace, remove common `Jobs`/`Careers` decoration and reject generic provider/error titles or invalid names. Return the slug fallback on failure.
- Use TanStack Query with a 400 ms debounce, a canonical-URL query key, cancellation and no focus/reconnect retries. Derive a placeholder from the current result or slug instead of writing suggestions into form values; this removes the effect and manual-edit bookkeeping.
- Validate an optional name override in the client form, then submit a normal creation payload using the trimmed override or current suggestion. The API still requires a valid explicit name. Keep saving available during lookup; clearing an override reuses the suggestion.
- Move URL examples, fallback behavior and local-saving context into named info bubbles. Use shadcn/Base UI popovers with hover opening for these infotips so touch and screen-reader users can also open them. Keep labels and errors visible, show lookup progress compactly and remove redundant page and empty-state prose.

## Risks / Trade-offs

- Page metadata is not a stable company-identity API → keep it optional and editable, with a deterministic fallback.
- Metadata can be generic or decorative → remove common wrappers and reject obvious provider/error names; do not attempt comprehensive brand inference.
- An old response can race with typing or saving → cancel replaced queries and derive the placeholder from the current canonical URL; suggestions never write to the input value.
- Reading only a bounded prefix can miss metadata → use the slug; never require a full scrape to save a board.

## Migration Plan

No database migration. Install the pinned parser dependency and run the existing local app. Reverting this change restores manual naming without changing saved records.
