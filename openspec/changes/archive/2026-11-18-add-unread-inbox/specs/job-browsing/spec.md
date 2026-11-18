## MODIFIED Requirements

### Requirement: Local open and historical job lists

The system SHALL provide Jobs navigation and a local list at `/jobs`, defaulting to Unread. Unread SHALL contain unread available current postings from active boards. Open SHALL contain available current postings from active boards and offer an All / Unread / Read status filter, defaulting to All. History SHALL contain unavailable/superseded postings and retained postings of archived boards, with the relevant reason distinguished. Read-status filtering SHALL apply only within Open and SHALL NOT change the Unread population, History membership, or workspace-wide unread count. Lists SHALL show title, tracked company, source/provider, available original location/workplace information, read state, and a link to local details without fetching employer content. Current navigation and list views SHALL be visually and accessibly identifiable.

#### Scenario: Browse the current index

- **WHEN** the user opens Jobs after a successful import without an explicit view in the URL
- **THEN** Unread shows only unread available current postings from active boards
- **AND** selecting Open shows all available current postings regardless of read state
- **AND** each result links to details using its internal posting identifier

#### Scenario: History and board restoration

- **WHEN** postings become unavailable, are superseded, or belong to an archived board
- **THEN** they remain discoverable in History with accurate reasons and their retained read state
- **AND** restoring a board returns its still-current postings to Open and its still-current unread postings to Unread without pretending a provider refresh occurred

#### Scenario: Bounded shareable list state

- **WHEN** the user changes Unread/Open/History, the Open read-status filter, or result pages and reloads or revisits that URL
- **THEN** the selected view, Open read status, and page are represented in the URL and restored, including existing explicit Open/History URLs
- **AND** results use a bounded page size of 50 and stable ordering with a deterministic tie-breaker
- **AND** an out-of-range page after index or read-state changes resolves to an available page
- **AND** changing the read-status filter resets to the first page, clears selection, and does not show a previous filter's results while loading

#### Scenario: Revisit already read available jobs

- **WHEN** the user selects Read within Open
- **THEN** only read current postings on active boards are shown, with filtering applied before totals and pagination
- **AND** reading a posting alone does not move it to History
- **AND** an empty filtered result accurately identifies the selected read status and offers All open jobs
- **AND** switching away from Open clears the filter and ignores any Open-only read-status parameter for other views

#### Scenario: Company navigation placeholder

- **WHEN** a job card is displayed
- **THEN** its company name is a keyboard-accessible link to that board's future `/boards/[id]` page
- **AND** prefetching that placeholder is disabled; company page implementation remains deferred

#### Scenario: Many posting locations

- **WHEN** a job card has more than five original locations
- **THEN** the card shows the first five separated by commas and the accurate N more locations count without a plus sign
- **AND** local details retain the complete comma-separated location list

#### Scenario: Whole-card navigation with an independent company link

- **WHEN** a user activates a job card during normal browsing outside its company link or read-state action
- **THEN** its details link covers the remaining card and retains native link keyboard and modifier-click behavior
- **AND** the company link remains independently clickable and focusable, with an at prefix before the company name
- **AND** selecting a posting or changing its read state does not activate the details link
- **AND** Select jobs explicitly switches activation of the remaining card to page-scoped selection until Done, Escape, the header toggle, or a view/filter/page change returns to browsing
- **AND** title/company links and individual read actions remain mounted, visible, and independently operable in selection mode
- **AND** the header label and card dimensions remain stable across selection toggles, with bulk controls in a bottom dock that shows or hides as one unit

### Requirement: Safe imported content and external navigation

Imported content SHALL be treated as untrusted data. The detail API SHALL sanitize retained HTML on the server with an explicit allowlist that preserves headings, paragraphs, lists, emphasis, and safe links. Scripts, embedded media, source styles, event handlers, and arbitrary attributes SHALL be removed. Source H1s SHALL render below the page title as H2s. Relative description links SHALL resolve against the employer posting, allow only HTTP(S)/email destinations without credentials, and open safely in a new tab. Descriptions without HTML SHALL remain readable inert text. Original source values SHALL remain unchanged in local storage. Top-level employer/application links SHALL accept only safe HTTPS URLs without credentials; unsafe supplied top-level URLs SHALL cause feed validation failure rather than being exposed as actionable UI.

#### Scenario: Active markup in a source description

- **WHEN** a source description contains scripts, event attributes, remote images, or other active markup
- **THEN** the stored readable description can be viewed without executing or loading that content
- **AND** its textual job information remains inspectable

#### Scenario: Retain source formatting and links

- **WHEN** a description contains headings, paragraphs, lists, emphasis, or safe links
- **THEN** details retain that semantic structure with visible heading hierarchy, paragraph/list spacing, and usable links
- **AND** relative links resolve at the employer rather than within the local application

#### Scenario: Existing Lever descriptions

- **WHEN** an existing or historical Lever record has retained source sections
- **THEN** details reconstruct section headings, list wrappers, and plain-only sections from that local source data
- **AND** reconstruction does not modify retained source content or require a provider refresh; actual-visit read marking is a separate local mutation

#### Scenario: Follow an employer application link

- **WHEN** the user opens a validated employer job or application link
- **THEN** it opens safely as external navigation
- **AND** the action does not submit an application, set an application status, or claim the job is still open at the employer

### Requirement: Accurate and accessible browsing states

The Jobs interface SHALL distinguish local loading, local data-read failure, no indexed results, no open results, no unread results, and background refresh activity. It SHALL retain confirmed data while refreshing or when scheduling/provider work fails. Controls SHALL support keyboard operation, visible focus, accessible names and errors, and a 320 CSS pixel viewport without page-level horizontal scrolling. Read state SHALL be understandable without relying on color alone. Supplemental explanations SHALL use concise help affordances rather than crowding the list with persistent copy. List views, metadata, prefetches, and background reads SHALL NOT change read state. Successfully displayed detail visits SHALL follow the unread-inbox actual-visit contract. Browsing SHALL NOT create application state or trigger provider work beyond the independent app-visit request.

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
- **AND** list tabs and toolbar actions render immediately without skeleton replacements or waiting for list data
- **AND** Jobs renders the URL-selected view in the initial page response, defaulting to Unread when no view is supplied
- **AND** no empty-state claim appears before the query completes
- **AND** background reads retain confirmed content instead of replacing it with skeletons

#### Scenario: History is still loading

- **WHEN** the user selects History before its local query has completed
- **THEN** the History panel is marked busy and contains card skeletons with a History-specific screen-reader loading message
- **AND** it shows neither an empty-history claim nor results from Open or Unread until its own data is available

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
