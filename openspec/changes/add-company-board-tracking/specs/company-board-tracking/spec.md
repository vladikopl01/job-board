## Purpose

Let users maintain a durable local list of supported company job boards, with clear source identities and reversible management that preserves future job and application history.

## ADDED Requirements

### Requirement: Supported company board URLs

The system SHALL accept absolute HTTPS board-root URLs on `jobs.ashbyhq.com`, `jobs.lever.co`, and `jobs.eu.lever.co`, containing one nonempty board-key path segment and an optional trailing slash. It SHALL trim surrounding whitespace, normalize the scheme/host and default port, decode percent-encoded unreserved board-key characters, and discard query parameters and fragments. It SHALL preserve board-key case and Lever's regional host. It SHALL reject credentials, non-default ports, unsupported hosts or schemes, ambiguous encoded path separators, and posting/application URLs rather than guessing a board from them.

#### Scenario: Equivalent board URLs

- **WHEN** the user supplies ` https://JOBS.ASHBYHQ.COM/%72amp/?utm_source=test#jobs `
- **THEN** the identified source is Ashby board `ramp` at `https://jobs.ashbyhq.com/ramp`
- **AND** the discarded query and fragment are not retained in the stored source URL

#### Scenario: Regional and case-sensitive identities

- **WHEN** the user supplies `https://jobs.eu.lever.co/ExampleCompany`
- **THEN** the source retains board key `ExampleCompany` and host `jobs.eu.lever.co`
- **AND** it is not rewritten to Lever's global host or a lowercased board key

#### Scenario: Unsupported or unsafe URL

- **WHEN** a URL is malformed, uses a lookalike/custom host, contains credentials or an encoded path separator, or points to an individual posting/application
- **THEN** the system explains which supported board-root URLs can be used
- **AND** no board is created and no supplied URL is fetched

### Requirement: Durable local registration

The system SHALL register a board with a server-assigned internal identifier, a trimmed company display name of 1–120 characters, a supported canonical source, and an initially active state. URL input SHALL be limited to 2048 characters. It SHALL save locally without contacting an employer, scraping metadata, fetching jobs, or claiming the board's existence or availability has been verified. Successful registrations SHALL survive reloads and server restarts.

#### Scenario: Register a company board

- **WHEN** the user submits company name `Ramp` and `https://jobs.ashbyhq.com/ramp`
- **THEN** one active board appears with that company name, provider, canonical source link, and a stable internal identifier
- **AND** it remains present after reopening the application

#### Scenario: Registration while offline

- **WHEN** the local application is running without internet access and a supported URL and valid name are submitted
- **THEN** the board can be saved locally
- **AND** success is presented as a saved tracking source without a verified/open-job claim

#### Scenario: Invalid input

- **WHEN** the name is blank or too long, or URL input exceeds its limit or fails validation
- **THEN** submission fails with an error associated with the relevant input
- **AND** existing boards remain unchanged

### Requirement: One record per canonical source

The system SHALL enforce uniqueness of the provider, regional host, and board key across active and archived boards, including concurrent creation attempts. Company display names SHALL NOT determine source identity. A duplicate attempt SHALL identify the existing board and its archive state without renaming it, creating another identifier, or restoring it implicitly.

#### Scenario: Duplicate active source

- **WHEN** an already tracked source is submitted using an equivalent trailing-slash/query variant or a different company name
- **THEN** no new board is created and the original name remains unchanged
- **AND** the user can locate the existing record

#### Scenario: Duplicate archived source

- **WHEN** an archived source is submitted again
- **THEN** the system identifies the archived record and offers explicit restoration
- **AND** submitting the add form does not itself restore that record

#### Scenario: Competing additions and distinct sources

- **WHEN** two requests attempt to add the same canonical source
- **THEN** at most one record is created and the other receives a duplicate result
- **AND** the same company label on different providers or on different Lever regional hosts remains permitted

### Requirement: Read the local tracking list

The system SHALL provide board management at `/boards` with working navigation from the workspace. It SHALL label the navigation item Boards, visually and accessibly identify the current page, and omit a duplicate visible page title while retaining an accessible page heading. It SHALL show active boards by default and provide a separate archived view. View tabs and New board SHALL share a toolbar row. Each record SHALL show its company name, provider as a text badge, canonical source link, and applicable management actions with icons and visible labels. The selected tab SHALL communicate archive state without a redundant status badge. The add form SHALL open in a modal from the toolbar or the active empty-state action. Local reads SHALL NOT fetch employer data, start indexing, or change board state. Empty, loading, and failure states SHALL be distinguishable.

#### Scenario: Active and archived views

- **WHEN** the user opens board management with both active and archived records
- **THEN** active records are shown initially and archived records can be viewed explicitly
- **AND** toggling views does not modify any board

#### Scenario: Identify the current page through navigation

- **WHEN** the user visits `/boards`
- **THEN** the Boards navigation link is visibly selected and marked as the current page for assistive technology
- **AND** the list toolbar appears without a duplicate visible page heading
- **AND** navigating to the workspace moves the selected state to Workspace

#### Scenario: Create a board in a modal

- **WHEN** the user opens New board
- **THEN** the registration form opens in an accessible modal and focuses the board URL
- **AND** successful registration closes the modal and displays the confirmed active board
- **AND** validation or save failures keep the modal and entered values available for correction

#### Scenario: Locate an existing source

- **WHEN** the user chooses to view a duplicate board from the creation modal
- **THEN** the modal closes, the appropriate list opens, and the existing card receives focus
- **AND** no duplicate is created or implicitly restored

#### Scenario: Card actions match archive state

- **WHEN** the user browses saved cards
- **THEN** each card displays its provider badge and its archive state is conveyed by the selected tab
- **AND** active cards offer Rename and Archive with icons and visible labels
- **AND** archived cards offer Restore with an icon and visible label, without Rename

#### Scenario: Empty list

- **WHEN** the selected view has no records
- **THEN** the user sees a truthful empty state and an appropriate add-board or return-to-active action
- **AND** Add your first board in the active view opens the same creation modal
- **AND** the empty state has the same minimum height as an ordinary board card
- **AND** no fabricated jobs, unread counts, refresh controls, or verification badges are displayed

#### Scenario: Local read fails

- **WHEN** local board data cannot be loaded
- **THEN** the user sees a failure with a retry action rather than a successful empty list
- **AND** no employer request is used as a fallback

### Requirement: Rename company labels without changing source identity

The system SHALL let users change an active board's company display name by editing its title position with the same name validation as creation. The editor SHALL support explicit save and cancel, Enter to save, and Escape to cancel, retaining failed drafts and restoring focus after editing. Archived cards SHALL NOT expose rename controls. Renaming SHALL preserve the internal identifier, canonical source, archive state, and creation history. Changing the provider, board key, or source URL of a saved record SHALL NOT be supported.

#### Scenario: Rename a board

- **WHEN** the user changes an active board's display name to another valid name
- **THEN** the new name persists and appears in the list
- **AND** the identifier, source URL, and archive state are unchanged

#### Scenario: Rename at the title

- **WHEN** the user chooses Rename on an active card
- **THEN** the title position becomes an editor with the current name selected and matching typography, insets and wrapping
- **AND** Save/Cancel replace the existing footer actions without moving the source link or enlarging the card just by entering edit mode
- **AND** a confirmed valid save restores the title with the saved name

#### Scenario: Cancel a rename

- **WHEN** the user cancels or presses Escape before submitting a rename
- **THEN** the original title remains and focus returns to Rename
- **AND** no write is requested

#### Scenario: Failed or invalid rename

- **WHEN** a replacement name is invalid, its save fails, or a request tries to replace the source identity
- **THEN** the editor retains the proposed name and shows an actionable error
- **AND** the confirmed stored name and source remain intact

### Requirement: Reversible archive and restore

The system SHALL archive and restore boards through explicit, idempotent state changes. Archival SHALL remove a board from the active list and preserve its identifier, source, name, and creation history. Restoration SHALL reactivate that same record. Neither action SHALL delete data, mark employer postings unavailable, fetch jobs, or start refresh work. Hard deletion SHALL NOT be exposed.

#### Scenario: Archive a board

- **WHEN** the user archives an active board
- **THEN** it leaves the active view and remains available in the archived view
- **AND** its identity and stored data are retained

#### Scenario: Restore a board

- **WHEN** the user restores an archived board
- **THEN** the original identifier returns to the active view with the same source and company label
- **AND** no new board or job refresh is created

#### Scenario: Repeat the requested state

- **WHEN** an archive or restore request is repeated after that state has already been reached
- **THEN** it succeeds without toggling the board back or replacing its original state-change timestamp

### Requirement: Explicit safe local mutations

The local API SHALL validate input, record identifiers, JSON content type, and request origin/host boundaries before changing stored state. Cross-origin or non-loopback mutation requests SHALL be rejected. GET requests SHALL be read-only. A request for an unknown board SHALL return a not-found result, and any failed mutation SHALL preserve previously stored records. Errors SHALL NOT expose stack traces, filesystem paths, or private configuration.

#### Scenario: Rejected caller or malformed mutation

- **WHEN** a mutation has an unsupported origin/host, non-JSON content, malformed JSON, invalid fields, or an invalid identifier
- **THEN** it returns a clear error and performs no write

#### Scenario: Board no longer exists

- **WHEN** a rename/archive/restore request targets a validly formed identifier that is not stored
- **THEN** the API reports that the board was not found
- **AND** no replacement record is created

### Requirement: Accessible management and recoverable feedback

Forms, view controls, and per-board actions SHALL have accessible names, keyboard operation, associated validation errors, and visible focus. The screen SHALL remain usable at a 320 CSS pixel viewport without page-level horizontal scrolling. Source links SHALL open the canonical HTTPS board safely. Pending mutations SHALL prevent repeat submission; failed operations SHALL retain entered values and the last confirmed board data, and successful operations SHALL refresh affected local list data.

#### Scenario: Keyboard registration and correction

- **WHEN** a keyboard user submits invalid board information, corrects it, and resubmits
- **THEN** they can discover the errors and complete registration without losing the entered company name
- **AND** loading and success feedback are accessible

#### Scenario: Mutation failure and retry

- **WHEN** saving or changing a board fails
- **THEN** the UI does not pretend the change succeeded or discard the last confirmed list
- **AND** the user can retry without re-entering valid values
