## Purpose

Let users inspect the locally indexed openings and retained posting history immediately, with safe readable details and clear distinctions between missing data, refresh activity, and source availability.

## ADDED Requirements

### Requirement: Local open and historical job lists

The system SHALL provide Jobs navigation and a local list at `/jobs`, defaulting to Open. Open SHALL contain available current postings from active boards. History SHALL contain unavailable/superseded postings and retained postings of archived boards, with the relevant reason distinguished. Lists SHALL show title, tracked company, source/provider, available original location/workplace information, and a link to local details without fetching employer content. Current navigation and list views SHALL be visually and accessibly identifiable.

#### Scenario: Browse the current index

- **WHEN** the user opens Jobs after a successful import
- **THEN** Open shows only available current postings from active boards
- **AND** each result links to details using its internal posting identifier

#### Scenario: History and board restoration

- **WHEN** postings become unavailable, are superseded, or belong to an archived board
- **THEN** they remain discoverable in History with accurate reasons
- **AND** restoring a board returns its still-current postings to Open without pretending a provider refresh occurred

#### Scenario: Bounded shareable list state

- **WHEN** the user changes Open/History or moves between result pages and reloads or revisits that URL
- **THEN** the selected view and page are represented in the URL and restored
- **AND** results use a bounded page size and stable ordering with a deterministic tie-breaker
- **AND** an out-of-range page after index changes has a recoverable path to available results

#### Scenario: Company navigation placeholder

- **WHEN** a job card is displayed
- **THEN** its company name is a keyboard-accessible link to that board's future `/boards/[id]` page
- **AND** prefetching that placeholder is disabled; company page implementation remains deferred

#### Scenario: Many posting locations

- **WHEN** a job card has more than five original locations
- **THEN** the card shows the first five separated by commas and the accurate N more locations count without a plus sign
- **AND** local details retain the complete comma-separated location list

#### Scenario: Whole-card navigation with an independent company link

- **WHEN** a user activates a job card outside its company link
- **THEN** its details link covers the card and retains native link keyboard and modifier-click behavior
- **AND** the company link remains independently clickable and focusable, with an at prefix before the company name

### Requirement: Complete retained posting details

The system SHALL provide local details at `/jobs/[id]` for current and historical internal postings. Details SHALL show the retained full description, company and source, original locations, separate workplace type, compensation information when supplied, availability/replacement context, and safe employer job/application links. They SHALL remain usable offline after indexing, including for archived boards. Unknown internal identifiers SHALL return a not-found state without provider lookup.

#### Scenario: Open historical details while offline

- **WHEN** the user opens a retained posting after it became unavailable, was superseded, or its board was archived and internet is unavailable
- **THEN** its stored content and status remain visible
- **AND** no provider request is required to render the details

#### Scenario: Incomplete optional source information

- **WHEN** a posting lacks compensation, workplace, or some location fields
- **THEN** the details omit unavailable information or identify it as unknown
- **AND** they do not invent eligibility, salary, or workplace claims

#### Scenario: Unknown or invalid detail identifier

- **WHEN** the requested internal identifier is invalid or is not stored
- **THEN** the user receives a clear invalid/not-found result and a way back to the local list
- **AND** no external lookup or replacement posting is created

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
- **AND** reading does not modify the record or require a provider refresh

#### Scenario: Follow an employer application link

- **WHEN** the user opens a validated employer job or application link
- **THEN** it opens safely as external navigation
- **AND** the action does not submit an application, set an application status, or claim the job is still open at the employer

### Requirement: Readable posting facts and local navigation

Details SHALL group job facts in a responsive definition list, using consistent workplace labels and readable employment names such as Full Time. Compensation SHALL show employer summaries, tiers, or formatted amounts/currencies/periods without currency conversion; unsupported shapes SHALL link to the employer instead of showing raw JSON. Details SHALL provide breadcrumbs back to Jobs. Missing pages and unknown postings SHALL offer a custom not-found presentation with local Jobs and Boards navigation. Main navigation SHALL retain the original compact rounded-link styling.

#### Scenario: Provider-specific labels and compensation

- **WHEN** a posting provides `FullTime`, an on-site workplace, and compensation tiers or salary ranges
- **THEN** facts show readable labels such as Full Time and On-site, with readable compensation information
- **AND** raw provider values stay stored without being exposed as JSON in the interface
- **AND** compensation follows the same responsive grid columns as other facts rather than forcing its own full-width row

#### Scenario: Breadcrumb and not-found navigation

- **WHEN** a user opens a posting detail or a missing local page
- **THEN** posting details include a Jobs breadcrumb with an identified current page
- **AND** the missing-page presentation provides usable links to browse Jobs and manage Boards

#### Scenario: Consistent detail links and icons

- **WHEN** a posting header and its actions are displayed
- **THEN** the company link has an at prefix and shares a text baseline with provider/status badges
- **AND** button action icons precede labels, including the two not-found navigation actions
- **AND** app-authored external links include an external-link icon, while links within imported descriptions retain their source presentation

### Requirement: Accurate and accessible browsing states

The Jobs interface SHALL distinguish local loading, local read failure, no indexed results, no open results, and background refresh activity. It SHALL retain confirmed data while refreshing or when scheduling/provider work fails. Controls SHALL support keyboard operation, visible focus, accessible names and errors, and a 320 CSS pixel viewport without page-level horizontal scrolling. Supplemental explanations SHALL use concise help affordances rather than crowding the list with persistent copy. List/detail visits SHALL NOT create unread/application state or trigger provider work beyond the independent app-visit request.

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
- **AND** Jobs renders the URL-selected view in the initial page response
- **AND** no empty-state claim appears before the query completes
- **AND** background reads retain confirmed content instead of replacing it with skeletons

#### Scenario: History is still loading

- **WHEN** the user selects History before its local query has completed
- **THEN** the History panel is marked busy and contains card skeletons with a History-specific screen-reader loading message
- **AND** it shows neither an empty-history claim nor results from Open until its own data is available

#### Scenario: Keyboard browsing and correction

- **WHEN** a keyboard user opens details and invokes Treat as new for an eligible posting
- **THEN** the action requires an accessible confirmation with predictable focus restoration
- **AND** cancelling performs no mutation, while failure preserves the original details and permits correction or retry
