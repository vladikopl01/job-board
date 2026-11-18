# JobCard scenarios

The real JobCard accepts a retained posting, read/selection state and actions, and renders in the Jobs and Inbox collections.

- Empty title: source text can be empty; use the posting fallback.
- One-word title: short external titles must keep the same geometry.
- Typical title: the reference case.
- Several-sentence title: truncate while keeping the full title available.
- Unbreakable title: 120 characters without a wrap opportunity.
- Emoji-only title and mixed emoji text: check glyph height and truncation.
- Arabic RTL title: text direction and punctuation.
- Mixed Arabic and English title: bidirectional text.
- Diacritics and tall scripts: glyph clipping.
- Locations: zero, one, realistic 15, and 150 locations.
- Containers: 320px, squeezed to 200px by a grid sibling, and 1200px.
- States: read/unread, selected/unselected, disabled selection, pending read action, active reader and historical archived posting.

Dropped loading/error: JobCard accepts neither state. Numeric-column alignment does not apply to this card. Dark mode, zoom and reduced motion are viewing modes to toggle in the browser, never simulated by fixtures. Focus and hover are left for the viewer to try.

The route imports only JobCard and static fixture data; it mounts no live workspace providers.
