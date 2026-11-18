## Workspace shell

- [x] Install and review the official sidebar-08 Base UI composition, removing unused demo navigation.
- [x] Add the shared inset shell, visible page headers, Dashboard landing route, and active navigation with shared unread counts.

## Local browsing

- [x] Add validated local text and board filters before totals and pagination, with focused storage and route coverage.
- [x] Separate Inbox from Jobs and preserve URL state, legacy explicit views, meaningful empty states, and the stable selection dock.
- [x] Add one responsive contextual reader with bounded previous/next navigation, stable list membership, actual-visit marking, and focus restoration.
- [x] Connect real board detail pages to existing management controls and board-scoped postings.
- [x] Replace the Workspace placeholder with independently retryable, actionable Dashboard data.

## Verification and documentation

- [x] Cover navigation, discovery, reader continuity, read overrides, and selection behavior with focused tests.
- [x] Update product documentation and complete formatting, lint, type checks, OpenSpec validation, and an isolated build without opening the user database or touching the daily-driver preview.

## Navigation and collection refinements

- [x] Default to Dashboard, use a text-only brand, and provide one meaningful shell breadcrumb trail for details.
- [x] Center posting typography, turn board details into a page header, and remove nested vertical collection scrolling and misaligned padding.
- [x] Compose official shadcn search/property-filter controls with debounced text, URL-restored List/Cards/Table layouts, and 10/25/50-item pagination across Jobs and Boards.
- [x] Stabilize selection geometry and hover surfaces, retain the Select jobs label with pressed state, and portal the bottom dock to the viewport.
- [x] Cover revised filters, debounce, page size, layouts, breadcrumbs, and selection with focused tests; rerun checks and an isolated production build.

## Screenshot review refinements

- [x] Contain workspace scrolling, prevent navigation focus scroll, and use an independently scrolling overlay reader with labeled controls.
- [x] Replace layout tabs and property menus with shadcn selects and official tablecn advanced filters, multi-sort and DataTable column customization.
- [x] Apply filtering/sorting before counts and pagination, retain shareable URL state and browser-local column settings.
- [x] Compact cards and location summaries, anchor footers, remove redundant Inbox badges, align collapsed navigation and distinguish the brand.
- [x] Replace the footer divider and permanent blank allowance with compact sticky pagination and preserve selection-dock access.
- [x] Build the isolated JobCard fixture report without production queries.
- [x] Complete final Standards/Spec review, resolve findings and rerun all checks and isolated build.

## Compact controls follow-up

- [x] Use a divided footer below the workspace scroller, with selection actions above pagination.
- [x] Combine toolbar groups, move an icon-only layout control right, and shorten action labels.
- [x] Add searchable field pickers before rule creation and retain one drag handle per rule.
- [x] Unify normal border colors and side alignment, hide unknown unread badges and distinguish their gray fill.
- [x] Complete focused checks, final source review and isolated production validation for this follow-up.

- [x] Restore company text links outside tables, ghost table links, outlined read actions, labeled list actions, filled option counters and intrinsic operator widths.
- [x] Move Availability into normal Jobs property conditions with all-retained API filtering, preserved legacy URLs and retained pending results.

- [x] Add independent direct Apply links beside read actions in lists, cards and tables using retained application URLs.
- [x] Automatically fit shared tables to the current width and visible columns while preserving fixed controls, pinning, manual resizing and minimum-width overflow.

- [x] Replace mixed gray states and primary-filled counters with shadcn neutral palette tokens, improve muted badge contrast and align the reader expand icon with its neighboring control.

- [x] Add an opening-only reader content stagger with shared Sheet easing, immediate navigation/focus and an undelayed reduced-motion fade; verify reader interactions and the isolated build.

## Final interface follow-up

- [x] Show the selected layout label without a Layout heading, align toolbar border tokens, provide board-entry examples, and use installed shadcn column checkboxes with keyboard operation; retain Apply icon/outline consistency and update the final interface contract.

The 2026-11-18 follow-up passes all 39 focused collection, board-form, board-interaction and Jobs-route checks. Browser appearance remains unverified.

## Closeout

Synced to the main specifications and archived on 2026-11-18. Later navigation and collection decisions supersede earlier presentation details. Existing verification limits remain recorded above; archival does not claim additional browser or cross-platform checks.
