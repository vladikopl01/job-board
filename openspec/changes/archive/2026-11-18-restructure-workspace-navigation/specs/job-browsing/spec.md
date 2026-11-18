## MODIFIED Requirements

### Requirement: Local open and historical job lists

The system SHALL provide a Jobs library at `/jobs`, defaulting to Open, and a separate unread Inbox at `/inbox`. Open SHALL contain available current postings from active boards and offer All/Unread/Read filtering. History SHALL contain unavailable/superseded postings and retained postings of archived boards, with the relevant reason distinguished. Inbox SHALL contain unread available postings from active boards. Read state SHALL NOT determine History membership. Lists SHALL show title, tracked company, source/provider, available original location/workplace information, read state, and a link to retained local details without fetching employer content. Current navigation and list views SHALL be visually and accessibly identifiable.

#### Scenario: Browse the current index

- **WHEN** the user opens Jobs after a successful import
- **THEN** Open shows available current postings from active boards regardless of read state
- **AND** Inbox provides the separate daily review destination
- **AND** each result retains a local link using its internal posting identifier

#### Scenario: History and board restoration

- **WHEN** postings become unavailable, are superseded, or belong to an archived board
- **THEN** they remain discoverable in History with accurate reasons and retained read state
- **AND** restoring a board returns its still-current postings to Open and its unread current postings to Inbox without pretending a provider refresh occurred

#### Scenario: Bounded shareable list state

- **WHEN** the user changes availability, discovery filters, or result pages and revisits that URL
- **THEN** the collection state is restored with the selected 10/25/50 page size (50 by default) and deterministic ordering
- **AND** out-of-range pages resolve to available results without mixing filters

#### Scenario: Revisit already read available jobs

- **WHEN** the user selects Read within Open
- **THEN** only read current postings on active boards are shown, with filtering applied before totals and pagination
- **AND** reading alone does not move a posting to History
- **AND** an empty filtered result identifies its read status and offers All open jobs
- **AND** Read status remains combinable with Availability throughout Jobs, while Inbox stays current-unread only
- **AND** legacy History URLs ignore their legacy Open-only read-status parameter

#### Scenario: Company navigation placeholder

- **WHEN** a job card or reader is displayed
- **THEN** its company name is an independent keyboard-accessible link to that board's implemented detail page

#### Scenario: Many posting locations

- **WHEN** a job card has more original locations than fit its compact summary
- **THEN** the card shows its first one or two locations separated by commas and an accurate N more locations count without a plus sign
- **AND** retained details show every location

#### Scenario: Whole-card navigation with an independent company link

- **WHEN** the user browses or enters Select jobs mode
- **THEN** title/company links and individual read actions remain independently available
- **AND** the details link covers the remaining card during ordinary browsing, while Select jobs changes that remaining area to selection
- **AND** company links retain their at prefix, and selecting or changing read state never activates the details link
- **AND** native links retain modifier-click behavior while ordinary title activation opens the contextual reader
- **AND** the existing page-scoped bottom dock, selected-count clear control, Select all, matching read icons, Done, and Escape behavior remain available without card geometry changes; selection controls show Select jobs when off and Done selecting when on, and the persistent dock is viewport-centered without replacing collection controls

### Requirement: Readable posting facts and local navigation

Details SHALL group job facts in a responsive definition list, using consistent workplace labels and readable employment names such as Full Time. Compensation SHALL show employer summaries, tiers, or formatted amounts/currencies/periods without currency conversion; unsupported shapes SHALL link to the employer instead of showing raw JSON. Details SHALL retain safe source formatting, all locations, and employer links. Full-page details SHALL provide local Jobs breadcrumbs; contextual reading SHALL provide a return to the originating collection. Missing pages and unknown postings SHALL offer a custom not-found presentation with local Jobs and Boards navigation. Main navigation SHALL use the shared inset workspace shell.

#### Scenario: Provider-specific labels and compensation

- **WHEN** a posting provides workplace, employment, or compensation values
- **THEN** readable labels and supplied amounts or employer summaries appear in the responsive facts grid without invented values
- **AND** raw source values stay stored without being exposed as JSON
- **AND** compensation follows the same grid columns as other facts rather than forcing a full-width row

#### Scenario: Return from a posting

- **WHEN** a user closes contextual reading
- **THEN** the original collection's filters, pagination, and useful focus are preserved

#### Scenario: Breadcrumb and not-found navigation

- **WHEN** a user opens full posting details or a missing local page
- **THEN** full posting details include a Jobs breadcrumb with an identified current page
- **AND** the missing-page presentation provides usable links to browse Jobs and manage Boards

#### Scenario: Consistent detail links and icons

- **WHEN** a posting header or missing-page action is displayed
- **THEN** the company link has an at prefix and shares a text baseline with provider/status badges
- **AND** button action icons precede labels, including missing-page navigation actions
- **AND** Apply uses the shared paper-plane icon and employer/source links use an external-link icon, while links within imported descriptions retain their source presentation

### Requirement: Accurate and accessible browsing states

Posting collections SHALL distinguish local loading, local data-read failure, no indexed results, no open results, no unread results, and background refresh activity. It SHALL retain confirmed data while refreshing or when scheduling/provider work fails. Controls SHALL support keyboard operation, visible focus, accessible names and errors, and a 320 CSS pixel viewport without page-level horizontal scrolling. Read state SHALL be understandable without relying on color alone. Supplemental explanations SHALL use concise help affordances rather than crowding the list with persistent copy. List views, metadata, prefetches, and background reads SHALL NOT change read state. Successfully displayed detail visits SHALL follow the unread-inbox actual-visit contract. Browsing SHALL NOT create application state or trigger provider work beyond the independent app-visit request.

#### Scenario: Fresh workspace or not-yet-indexed boards

- **WHEN** no boards exist or tracked boards have never completed an index
- **THEN** the user sees an accurate add-board or refresh-board path
- **AND** the UI does not claim a verified empty employer feed or show fabricated jobs/unread counts

#### Scenario: Local read fails while provider refresh is separate

- **WHEN** the local query fails
- **THEN** a retryable local error is shown rather than a successful empty list
- **AND** an employer fetch is not used as a fallback

#### Scenario: Local lists and posting details are still loading

- **WHEN** a Boards or Jobs initial local query has not completed, or posting details are loading
- **THEN** card or detail skeletons fill the content area with a screen-reader loading announcement
- **AND** layout selection and toolbar actions render immediately without skeleton replacements or waiting for list data
- **AND** Jobs renders the URL-selected view in the initial page response, defaulting to Open; Inbox provides the separate Unread destination
- **AND** no empty-state claim appears before the query completes
- **AND** background reads retain confirmed content instead of replacing it with skeletons

#### Scenario: History is still loading

- **WHEN** the user changes the regular Availability condition from Open to History
- **THEN** the collection is marked busy and retains confirmed rows while its local query resolves
- **AND** read and selection writes stay disabled until the new results arrive
- **AND** no empty-history claim appears before confirmation

#### Scenario: Keyboard browsing and correction

- **WHEN** a keyboard user opens details and invokes Treat as new for an eligible posting
- **THEN** the action requires an accessible confirmation with predictable focus restoration
- **AND** cancelling performs no mutation, while failure preserves the original details and permits correction or retry

#### Scenario: Read everything currently in the inbox

- **WHEN** indexed active boards exist and the confirmed Unread query has no remaining results
- **THEN** the interface says there are no unread jobs and offers a path to Open
- **AND** it does not imply that the provider has no jobs or erase retained Open/History results

#### Scenario: Unread is still loading

- **WHEN** the user opens Unread before its local query has completed
- **THEN** the Unread panel is busy and contains card skeletons with an Unread-specific loading announcement
- **AND** no caught-up claim or results from another view appear before its own data is available
