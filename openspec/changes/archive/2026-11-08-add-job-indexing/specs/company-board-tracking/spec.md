## MODIFIED Requirements

### Requirement: Durable local registration

The system SHALL register a board with a server-assigned internal identifier, a trimmed company display name of 1–120 characters, a supported canonical source, and an initially active state. URL input SHALL be limited to 2048 characters. It SHALL save the board and its first queued indexing task atomically before acknowledging registration. Provider work SHALL run after the local save response and SHALL NOT determine registration success. Successful registration SHALL NOT claim the board's existence or open jobs are verified before indexing succeeds. Saved boards and queued tasks SHALL survive reloads and server restarts.

#### Scenario: Register a company board

- **WHEN** the user submits company name `Ramp` and `https://jobs.ashbyhq.com/ramp`
- **THEN** one active board appears with that company name, provider, canonical source link, and a stable internal identifier
- **AND** its first indexing task is queued and runs without another manual Refresh click
- **AND** the saved board remains present after reopening the application

#### Scenario: Registration while offline

- **WHEN** the local application is running without internet access and a supported URL and valid name are submitted
- **THEN** the board and its first indexing task can be saved locally
- **AND** provider failure keeps the saved board and exposes a retry action without claiming verified open jobs

#### Scenario: Invalid input

- **WHEN** the name is blank or too long, or URL input exceeds its limit or fails validation
- **THEN** submission fails with an error associated with the relevant input
- **AND** neither a board nor an indexing task is created

#### Scenario: First task cannot be persisted

- **WHEN** persisting the initial indexing task fails
- **THEN** the board insert also rolls back and registration reports a save failure
- **AND** no partially saved board is reported as successful

### Requirement: Read the local tracking list

The system SHALL provide board management at `/boards` with working navigation from the workspace. It SHALL label the navigation item Boards, visually and accessibly identify the current page, and omit a duplicate visible page title while retaining an accessible page heading. It SHALL show active boards by default and provide a separate archived view. View tabs and New board SHALL share a toolbar row. Each record SHALL show its company name, provider as a text badge, canonical source link, and applicable management actions with icons and visible labels. Active boards SHALL additionally expose a real Refresh action and concise per-board refresh feedback. The selected tab SHALL communicate archive state without a redundant status badge. The add form SHALL open in a modal from the toolbar or the active empty-state action. Local reads SHALL NOT fetch employer data, start indexing, or change board state; the independent app-visit refresh request SHALL NOT delay those reads. Empty, loading, and failure states SHALL be distinguishable.

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
- **AND** active cards offer Refresh, Rename, and Archive with icons and visible labels
- **AND** archived cards offer Restore with an icon and visible label, without Rename or Refresh

#### Scenario: Board card navigation preserves its controls

- **WHEN** the user activates a saved card outside its source link or controls
- **THEN** a stretched native link opens its future `/boards/[id]` company route with prefetch disabled
- **AND** the source link and Refresh/Rename/Archive/Restore controls remain independently clickable and keyboard accessible
- **AND** entering inline rename suspends card navigation until the edit is finished

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

#### Scenario: Refresh feedback preserves confirmed board data

- **WHEN** an active board is queued, refreshing, successfully refreshed, or failed
- **THEN** its card shows that outcome and its last successful refresh when one exists
- **AND** its saved name/source and retained jobs are not replaced by a loading screen or fabricated result

### Requirement: Reversible archive and restore

The system SHALL archive and restore boards through explicit, idempotent state changes. Archival SHALL remove a board from the active list, hide its postings from Open discovery, cancel or invalidate unfinished refreshes, and preserve its identifier, source, name, creation history, and indexed data. Restoration SHALL reactivate that same record and expose its retained current postings. Neither action SHALL delete data, mark employer postings unavailable, fetch jobs, or start refresh work. A refresh started before archival SHALL NOT commit after an intervening archive/restore transition. Hard deletion SHALL NOT be exposed.

#### Scenario: Archive a board

- **WHEN** the user archives an active board
- **THEN** it leaves the active view and remains available in the archived view
- **AND** its identity and stored data are retained
- **AND** its postings leave Open discovery without being marked unavailable at the employer

#### Scenario: Restore a board

- **WHEN** the user restores an archived board
- **THEN** the original identifier returns to the active view with the same source and company label
- **AND** no new board or job refresh is created
- **AND** its retained current postings become visible in Open while historical postings remain historical

#### Scenario: Repeat the requested state

- **WHEN** an archive or restore request is repeated after that state has already been reached
- **THEN** it succeeds without toggling the board back or replacing its original state-change timestamp

#### Scenario: Archive while refresh is unfinished

- **WHEN** a board with queued or running refresh work is archived
- **THEN** that work cannot commit an index update
- **AND** restoring the board before the old response returns does not make that old work valid again
