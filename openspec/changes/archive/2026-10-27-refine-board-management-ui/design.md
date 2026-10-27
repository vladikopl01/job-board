## Context

Board registration, local persistence and archive/restore already work. The user wants a list-focused page and concise card controls. This change refines the implemented `add-company-board-tracking` interface without changing its API or data model.

## Goals / Non-Goals

**Goals:** Put creation behind a modal, identify the page through navigation and a compact toolbar, make providers scannable, edit active names without shifting the card, and remove rename from archived cards.

**Non-Goals:** New indexing behavior, API authorization changes, board deletion, custom UI primitives or another state library.

## Decisions

- Install Badge, Dialog and Textarea using the existing shadcn Base UI / base-nova configuration. Compose them in feature code and retain their shared styles and motion behavior.
- Label the navigation link Boards and show the current page with a filled background and `aria-current="page"`. Keep pathname-dependent navigation in a small client component within the server layout. Remove the visible page heading while retaining a screen-reader heading and the Boards document title. Use compact header/content spacing and put the view tabs and New board trigger in one toolbar row, wrapping only when needed for narrow layouts or enlarged text.
- Own the creation dialog's open state in BoardsClient. Focus the URL field on opening; close on confirmed save or explicit navigation to a duplicate. Keep failed values and duplicate actions inside the modal. Standard modal focus restoration handles dismissal, while duplicate navigation explicitly focuses the saved card after closing.
- Keep the existing URL-first form logic and information popovers. Remove the form's page-level section and duplicate heading; the dialog supplies its title and accessible description.
- In active cards, a borderless rename textarea replaces the visible title with the same font, line height and inset. A hidden text mirror sizes its grid row for wrapped names without measuring the DOM. Keep an accessible heading and hidden field label, select the current name, support Enter to save and Escape to cancel, and restore focus to Rename afterward. Save/Cancel replace the normal footer actions, so entering edit mode does not move the source link or enlarge the card. Save failures retain the proposed value without modifying the confirmed board.
- Show only the provider badge; the selected tab already communicates archive state. Actions retain visible labels, accessible board-specific names and decorative Lucide icons. Archived cards expose Restore only; restoring makes Rename available again.
- Give board cards and empty states the same 10rem minimum height. Let longer names, URLs and error feedback grow naturally rather than clipping content.

## Risks / Trade-offs

- Modal focus can fight duplicate navigation: close the modal first, then explicitly focus the target card instead of restoring focus to the New board trigger.
- Discarding a pending save could hide its outcome: prevent closing the creation dialog during a save or restore, then close only after confirmation.
- Native dependency installation can invalidate the running dev server: review CLI output and avoid unnecessary package changes. Browser verification uses the existing server only with the already granted inspection permission.

## Migration Plan

No data migration is required. Integrate the company-board tracking baseline before this delta when synchronizing specs. Verification uses isolated HTTP mocks and temporary database tests; no test boards are added to the user's workspace.
