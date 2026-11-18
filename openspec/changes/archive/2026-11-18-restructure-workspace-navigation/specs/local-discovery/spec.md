## Purpose

Help users find retained postings by text, source board, read state, and availability without leaving the local workspace or losing list context.

## ADDED Requirements

### Requirement: Bounded local text and board filtering

Posting collections SHALL support a trimmed text query of at most 200 characters matching retained titles or plain descriptions and an optional validated board identifier. These filters SHALL combine with the collection's availability/read predicates before totals and bounded pagination. Search text SHALL be treated as a literal value, including wildcard and punctuation characters. No provider request SHALL be required. Inbox SHALL remain unread-only; Jobs SHALL default to Open and offer History. Availability and Read status SHALL be regular library filter conditions; removing or pausing Availability SHALL include both current and historical postings.

#### Scenario: Revisit a previously read posting

- **WHEN** a user searches Jobs with a board and Read filter
- **THEN** only matching read available postings appear, and totals and pages describe that filtered collection
- **AND** the workspace unread count remains independent

#### Scenario: Search retained history

- **WHEN** the user searches History for text from an unavailable posting's description
- **THEN** the matching retained posting remains discoverable without an employer fetch

### Requirement: Shareable discovery state and recovery

Text, property filter conditions, their AND/OR join, ordered sorts, availability, layout, page size, page and reader selection SHALL be represented in the URL. Legacy board and Open read-status URLs SHALL remain supported. Changing a collection filter SHALL reset the page, selection, and reader. Filtered empty states SHALL offer a way to clear filters, independently of a truly empty workspace. Invalid API filters SHALL fail validation before storage opens. Explicit legacy Unread Jobs URLs SHALL retain a path to the Inbox with their pagination intact.

#### Scenario: Restore a filtered list

- **WHEN** the user reloads or revisits a filtered collection URL
- **THEN** its filters and page are restored without showing a different board scope or mixing Inbox and library results
- **AND** a no-match result can be cleared without deleting postings or modifying read state

### Requirement: Consistent collection controls and layouts

Jobs and Boards SHALL provide List, Cards and Table layouts selected through an installed shadcn radio menu whose trigger shows the current view icon and List, Cards or Table label, without a redundant Layout menu heading first in the right action group. Search, filters and sorts SHALL occupy the left group of one responsive toolbar; actions and display controls SHALL occupy the right. Toolbar controls SHALL use matching installed component sizes and the same semantic border color for search and outlined buttons. Boards actions SHALL be labeled New and Refresh. Popovers and dropdowns SHALL align to the side of their trigger: start for the left group and end for the right group. The application SHALL use the CLI-generated shadcn preset b1D0dv72 for component styles, theme tokens and Inter typography. They SHALL share the same filtered collection and URL state. Search SHALL compose the installed shadcn input, debounce after 300ms, preserve IME composition, and retain a leading icon and a clear action. The tablecn advanced filter and sort menus SHALL support up to 12 text/select conditions and five ordered sort fields, AND/OR joining, disabled conditions, removal, reset and reordering through one drag handle per rule with keyboard support. Add filter and Add sort SHALL open a searchable field list and create no rule until the user chooses a field. Separate move-up/down buttons SHALL NOT be shown. Availability and board Status SHALL be regular select filter conditions, initially Open and Active respectively, with no separate toggles. Empty filter and sort popovers SHALL stay compact and expand only when condition rows require room. Refresh SHALL retain its label and rotate the existing refresh icon while busy, respecting reduced motion; no separate activity row SHALL be shown. Read status SHALL be unavailable in Inbox and combinable with Availability throughout Jobs. Jobs SHALL filter and sort the full local collection before count and pagination; Boards SHALL do the same over its confirmed local result set. Table layout SHALL use tablecn DataTable with column visibility, ordering, pinning and resizing retained in browser storage. Column visibility SHALL use labeled installed shadcn checkboxes; required columns SHALL be disabled and keyboard Space SHALL toggle optional columns. A compact divided workspace footer below the content scroller SHALL retain result range, page position, previous/next and 10/25/50 per-page choice. Selection actions SHALL occupy a separate row above pagination in the same footer without covering results or raising pagination into the content. Layout changes SHALL NOT change read state or membership. Cards SHALL use one-line truncated headings, compact location summaries, equal grid heights and bottom-aligned actions; full values SHALL remain reachable in details. Inbox SHALL omit redundant per-row unread badges and show the count in its heading and navigation. Board detail headers SHALL place the provider badge beside the heading and group Refresh, Rename and Archive on the left. The reader SHALL use a compact width with Previous/Next on the left and icon-only Expand/Close controls on the right.

#### Scenario: Change presentation and page size

- **WHEN** the user switches a filtered collection between List, Cards, and Table
- **THEN** its filters, page, and selected IDs stay consistent
- **AND** changing page size resets to the first page and reconciles page-scoped selection

#### Scenario: Type and clear a query

- **WHEN** the user types a query, navigates to a URL with another query, or clears the query
- **THEN** only the settled current query drives the collection and obsolete pending input cannot overwrite the navigated query
- **AND** typing through an input method does not search unfinished composition


#### Scenario: Refine and customize a collection

- **WHEN** the user adds, pauses, reorders or resets conditions and ordered sorts
- **THEN** the collection and URL represent those choices before pagination
- **AND** clearing conditions and sorting together clears both and restores AND joining
- **AND** column width, order, pinning and visibility survive remounting without changing membership

#### Scenario: Choose a field before adding a rule

- **WHEN** the user opens Add filter or Add sort
- **THEN** a searchable list of eligible fields appears without changing the query
- **AND** choosing a field creates its rule and closes the field picker


### Requirement: Consistent badge motives and action states

The application SHALL retain shadcn preset b1D0dv72. Badges SHALL share one application component and preset geometry, with color-only variants for providers, read states, availability and counts. Company names SHALL use text links outside tables and ghost button links in tables, with visible hover and no underline. Read states, company hover and counters SHALL use the installed shadcn neutral palette in both themes. Filter/sort counters SHALL use a filled contrasting neutral badge variant, shared with unread totals. Selection controls SHALL match Button sizes and change to Done while active. Archive and remove actions SHALL use destructive variants.

#### Scenario: Entering selection mode

- **WHEN** a user activates Select
- **THEN** the same toggle changes to Done with an active treatment and matching button size
- **AND** finishing selection restores Select and its focus behavior

### Requirement: Direct table navigation and column actions

Tables SHALL use tablecn’s Base UI DataTable. Left-click SHALL cycle sorting and Shift-click SHALL add sort fields. Right-click or Shift+F10 on a heading SHALL open supported sort, insert, move, pin, remove and fit actions. Pinned columns SHALL show a filled pin icon and shared-border divider. Moving SHALL stay within the pinning group. The Columns picker SHALL match app typography and offer reset and unpin-all.

#### Scenario: Sorting and opening column options

- **WHEN** a user left-clicks a sortable column label
- **THEN** sorting changes without opening a menu
- **WHEN** the user right-clicks that label or presses Shift+F10
- **THEN** column actions open without changing sorting

### Requirement: Responsive table sizing

Tables SHALL fit visible columns to the available collection width on mount, saved-layout restoration, viewport/sidebar width changes and column visibility changes. Fitting SHALL respect column minimums and maximums, preserve relative current widths and pinning, and leave non-resizable selection/action columns fixed. Tables SHALL scroll horizontally when column minimums exceed the available width. Manual resizing SHALL remain in effect until the next fit; ordinary row updates and opening the overlay reader SHALL NOT refit columns.

#### Scenario: Resize a customized table

- **WHEN** the available width changes or the user changes visible columns
- **THEN** the current visible columns fit that width within their limits without remounting existing headers or changing pinning
- **AND** fixed checkbox and action columns keep their widths
- **AND** saved layouts are fitted to the current window when restored

### Requirement: Row navigation without duplicate actions

Row whitespace SHALL open its primary job or board link; in job selection mode it SHALL toggle that job’s selection instead. Nested interactive controls, text selections, modifier clicks and portaled actions SHALL retain their independent behavior. Board tables SHALL omit Manage. Board cards SHALL retain source access through an icon link beside the heading; board details SHALL retain the full source link.

#### Scenario: Keeping row actions independent

- **WHEN** a user activates a nested source link, read action or portaled row action
- **THEN** that action runs without opening the row’s primary destination

### Requirement: Regular board status conditions

Boards SHALL expose Status as a regular select filter, initially Active, without a separate status toggle. Status SHALL support normal joining, pausing, removal and URL restoration. Removing Status SHALL include both active and archived boards. Legacy active and archived view URLs SHALL remain supported.

#### Scenario: Removing the initial board status

- **WHEN** a user removes or pauses the initial Active status condition
- **THEN** active and archived boards are eligible under the remaining filters

### Requirement: Regular job availability conditions

Jobs SHALL expose Availability as a regular select filter, initially Open, with joining, pausing, removal and URL restoration. History SHALL include unavailable, superseded and archived-board postings. Removing or pausing Availability SHALL include both current and historical postings under the remaining filters. Legacy Open and History URLs SHALL translate into the corresponding condition. Inbox SHALL retain its fixed current-unread scope.

#### Scenario: Pausing availability

- **WHEN** a user pauses or removes the initial Open condition
- **THEN** current and historical postings are eligible under the remaining filters before totals and pagination
- **AND** changing Availability preserves other property conditions, including Read status

### Requirement: Stable virtualized collections

Tables, lists and card grids SHALL virtualize rows in the workspace scroller while retaining focused and reader-active rows. Pagination and full-collection filtering SHALL remain intact. Within one board scope and the same Inbox or Jobs collection, previous results SHALL remain mounted while query changes resolve, with stale-row writes disabled. Opening or navigating the reader SHALL preserve table elements and column layout.

#### Scenario: Sorting while results resolve

- **WHEN** a user changes sorting or Availability within the current board scope
- **THEN** previous rows remain visible and read or selection writes are disabled until the new results arrive
- **AND** the existing table and unchanged row links remain mounted

#### Scenario: Scrolling with a focused row

- **WHEN** a user scrolls a table, list or card grid away from the focused or reader-active row
- **THEN** the visible range renders with bounded overscan and those rows remain mounted

### Requirement: Compact row controls

Job tables SHALL always show row checkboxes and a compact select-all checkbox header. Checking a row SHALL enter selection mode without opening the reader. Apply SHALL use the same paper-plane icon throughout the application and sit beside read/unread in job collection actions and link directly to the retained application URL in a new tab. Table and card quick actions SHALL be outlined icon buttons with descriptive tooltips; list actions SHALL retain labels without tooltips. Applying SHALL NOT open the local reader, change read state or change row selection. Operator controls SHALL fit the widest option. Filter and sort field labels SHALL match their search text size; Add controls SHALL be outlined and reset controls labeled Reset. Details SHALL place Apply before Employer posting.

#### Scenario: Selecting jobs from a table

- **WHEN** a user checks a job row
- **THEN** selection mode starts and the header reflects the page's unchecked, mixed or checked state
- **AND** the reader remains closed


#### Scenario: Apply directly from a collection

- **WHEN** a user activates Apply in a list, card or table, including during selection mode
- **THEN** the retained employer application URL opens in a new tab with an accessible name
- **AND** the local reader stays closed and read state and selection remain unchanged

### Requirement: Reader entrance continuity

The reader SHALL reveal heading/actions, facts and description in a brief stagger when the panel opens. Previous/Next navigation, refetches and late query results SHALL remain immediate. Reader controls SHALL remain usable throughout entry, and focused groups SHALL appear immediately. Reduced motion SHALL remove movement and stagger delays.

#### Scenario: Opening a reader

- **WHEN** a user opens the posting reader
- **THEN** its available content or skeleton groups enter in reading order
- **AND** navigation and closing controls remain available

#### Scenario: Continuing to read

- **WHEN** a user navigates to the previous or next posting or query data changes inside the open reader
- **THEN** the content updates without replaying the entrance

#### Scenario: Reduced motion

- **WHEN** the reader opens with reduced motion enabled
- **THEN** content fades in without translation or stagger delays
