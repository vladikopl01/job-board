## MODIFIED Requirements

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
