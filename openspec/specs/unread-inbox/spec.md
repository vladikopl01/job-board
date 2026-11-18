# Unread Inbox Specification

## Purpose

Let users keep track of unreviewed local postings over time, with persistent read state, explicit overrides, and accurate counts independent of provider refresh activity.

## Requirements

### Requirement: Durable read state per posting
The system SHALL persist read/unread state for each internal posting identifier. Existing postings on upgrade and newly created posting identities SHALL start unread. Refreshes, ordinary content edits, failures, application restarts, and board archive/restore SHALL preserve existing read state. A reappearance after an observed absence or an explicit Treat as new correction SHALL create an unread posting without changing the previous posting's retained state.

#### Scenario: Upgrade an existing local index

- **WHEN** the unread capability is added to a workspace containing current and historical postings
- **THEN** those postings start unread because no previous read history exists
- **AND** their identities, source content, availability, boards, and refresh history are preserved

#### Scenario: Unread leftovers survive refresh and restart

- **WHEN** ten postings are imported, four are marked read, and a successful refresh adds fifteen new postings while all twenty-five remain current on active boards
- **THEN** twenty-one postings are unread
- **AND** restarting the application preserves that result and the four read states

#### Scenario: Ordinary edits and failed refreshes

- **WHEN** a continuously present posting is updated by its source or a board refresh fails
- **THEN** its stored read state is unchanged
- **AND** a content edit does not create a new unread notification for a read posting

#### Scenario: Separate posting incarnations

- **WHEN** a posting reappears after an observed absence or the user confirms Treat as new
- **THEN** the new internal posting starts unread regardless of the previous posting's state
- **AND** the old posting and its read state remain available in history

### Requirement: Read marking on actual detail visits
Successfully displaying a posting's full local details during an actual route visit SHALL mark that posting read through a local mutation. Rendering list cards, generating page metadata, prefetching a route, and background data requests SHALL NOT change read state. Automatic marking SHALL occur at most once per actual visit and SHALL NOT be repeated merely because details rerender, refetch, regain focus, or receive updated content. Marking unread while details are open SHALL remain effective until a later actual visit or an explicit Mark read action.

#### Scenario: Display full local details

- **WHEN** a user navigates directly or from a list to a stored posting and its full details are displayed
- **THEN** that posting is marked read and active counts are updated if it contributes to them
- **AND** the same behavior applies to retained historical details without provider access

#### Scenario: Prefetch and failed details are inert

- **WHEN** a posting link is prefetched, metadata is generated, data is read in the background, or details fail to load
- **THEN** no read state changes occur from those operations
- **AND** an invalid or missing identifier does not create a posting or state record

#### Scenario: Mark unread while reading

- **WHEN** the user marks the currently displayed posting unread and the details rerender or refetch
- **THEN** it remains unread
- **AND** leaving and actually returning to its full details, including back/forward navigation, marks it read again

#### Scenario: Automatic marking fails

- **WHEN** the local read mutation fails after details have loaded
- **THEN** the full details remain usable and confirmed read state is retained
- **AND** a retryable error is offered without an automatic retry loop

### Requirement: Explicit individual read changes
Job cards and full details SHALL offer explicit Mark read and Mark unread actions appropriate to the confirmed state, including for historical postings. Individual card read actions SHALL remain visible and usable in Select mode, independently of card selection and navigation. These actions SHALL set a desired state rather than invert it, SHALL be idempotent, and SHALL leave content, identity, availability, application state, and refresh tasks unchanged. Pending writes to the same posting SHALL prevent conflicting actions until the result is known. Failed actions SHALL preserve confirmed state and offer retry without discarding displayed content.

#### Scenario: Mark a card without visiting details

- **WHEN** the user activates a card's Mark read or Mark unread action
- **THEN** only that posting's read state changes and local details navigation is not triggered
- **AND** repeating the same desired-state action leaves it in that state

#### Scenario: Override on historical details

- **WHEN** the user explicitly changes read state for an unavailable, superseded, or archived-board posting
- **THEN** the chosen state is retained locally
- **AND** it does not make that posting eligible for the active inbox or revive it at the provider

#### Scenario: Change one card during selection

- **WHEN** the user activates an individual card read action while selection mode is active
- **THEN** only that posting changes read state without toggling selection or opening details
- **AND** unrelated selected identifiers remain selected after success

#### Scenario: Failed explicit mutation

- **WHEN** an individual change is rejected or storage cannot save it
- **THEN** the prior confirmed read state and content remain visible
- **AND** the affected action exposes an accessible error and can be retried

### Requirement: Bounded selected-posting bulk changes
The Jobs list SHALL support an explicit Select mode for selecting postings on the current result page and marking the selection read or unread in any view. Normal browsing SHALL show no card selection checkboxes or bulk toolbar. In selection mode, cards SHALL expose keyboard/touch-operable selection buttons with pressed state, and selected cards SHALL show a border and checkmark. Title links, company links, and individual read actions SHALL remain mounted, visible, and independently operable in both modes. A selection row above pagination in the divided workspace footer SHALL expose a selected-count/X control, Select all, bulk read actions with the same icons as individual actions, and Done without shifting the layout controls or changing card dimensions when selection mode starts or ends. The toolbar Select label SHALL remain unchanged, with pressed state identifying selection mode. Dock visibility SHALL change immediately as a unit during rapid toggles. When no read-state write is pending, Done or Escape SHALL clear selection and restore whole-card navigation, returning focus to Select or the empty-state heading when no results remain. Select all SHALL select only the displayed confirmed page, containing at most 50 postings, and repeating it SHALL preserve that selection. The X SHALL clear selected identifiers without leaving selection mode or removing dock controls. Selection mode and selected identifiers SHALL NOT carry over to another view, Open read-status filter, or page, include hidden results, or automatically include jobs added by a refresh. A mutation SHALL target a nonempty set of at most 50 distinct internal identifiers and a desired state; malformed, invalid, or missing targets SHALL cause the whole operation to fail without partial writes. Read-state mutations SHALL require the existing local same-origin JSON protections and SHALL NOT be performed by GET requests.

#### Scenario: Enter and leave selection mode

- **WHEN** the user chooses Select
- **THEN** activating a card outside its title link, company link, or read action selects or deselects that posting without opening its details or marking it read
- **AND** selection buttons expose their posting names and selected state without relying on color or hover
- **AND** the footer selection row exposes the selected count, page selector, bulk actions, and Done while the layout controls remain available
- **AND** the selection row wraps at narrow widths and supports arrow-key navigation between actions
- **AND** entering or leaving selection mode preserves header and card geometry
- **AND** Done or Escape returns to normal navigation with no selected identifiers and focus on Select or the empty-state heading

#### Scenario: Clear the selected page without closing the dock

- **WHEN** the user chooses Select all and then activates the X beside the selected count
- **THEN** only the displayed page was selected, and its selected identifiers are cleared
- **AND** selection mode remains active with zero selected and all dock controls still visible
- **AND** read actions are disabled until there is a selection

#### Scenario: Rapid selection toggles

- **WHEN** the user repeatedly turns Select on and off
- **THEN** the dock surface and its buttons become visible or hidden together without delayed remnants
- **AND** the header label, title links, and individual read controls retain their identity and geometry
- **AND** toggling mode alone does not move focus or write read state

#### Scenario: Mark a selected page read

- **WHEN** the user selects some or all postings on the current page and invokes Mark read
- **THEN** only those concrete posting identifiers are changed in one operation
- **AND** successful results, active counts, and any now-out-of-range page are updated
- **AND** no unselected or newly arriving posting is implicitly included

#### Scenario: Move to another result page or view

- **WHEN** the user changes the result page, the Open read-status filter, or switches between Unread, Open, and History
- **THEN** the previous selection is cleared and selection mode ends
- **AND** the next bulk action cannot affect selections from the previous page or view

#### Scenario: Invalid or failed bulk mutation

- **WHEN** a request contains invalid identifiers, duplicates, no targets, more than 50 targets, a nonexistent posting, an unauthorized origin, or a storage failure
- **THEN** no posting is partially changed by that operation
- **AND** the interface preserves confirmed results, explains the failure, and permits correction or retry

#### Scenario: Accessible selection and removal

- **WHEN** a keyboard or screen-reader user selects postings and marks them read in Unread
- **THEN** selection controls identify their postings, the page selector exposes whether the entire page is selected, and the count announces partial selections
- **AND** focused card controls remain visible above the dock
- **AND** pending work and its outcome are announced without moving focus unexpectedly
- **AND** Done and Escape cannot dismiss selection while a read-state write is pending
- **AND** if the focused card or action disappears after success, focus moves to an appropriate remaining result or the list's empty state

### Requirement: Active unread counts and retained history
The Unread view and active unread counts SHALL include only unread current postings on active boards. Unavailable/superseded postings and postings on archived boards SHALL retain their read state without contributing to this view or count. Jobs navigation and the Unread tab SHALL expose the same workspace-wide active unread count, independent of pagination. Confirmed changes to read state, posting availability, and board archive/restore SHALL be reflected when local data is refreshed. Pending or failed count reads SHALL NOT fabricate a verified zero; prior confirmed counts SHALL remain available with an indication when stale. Provider refresh progress and result counts SHALL remain separate from unread information.

#### Scenario: Archive and restore a board

- **WHEN** a board with unread current postings is archived
- **THEN** those postings leave the active unread view and count without losing read state
- **AND** restoring the board returns its still-current unread postings to the inbox without implying a provider refresh

#### Scenario: Posting becomes unavailable

- **WHEN** a complete successful refresh marks an unread posting unavailable or it is explicitly superseded
- **THEN** it no longer contributes to active unread counts
- **AND** its retained historical record still exposes its stored read state

#### Scenario: Counts across views and local failures

- **WHEN** the user changes pages or visits Boards or posting details
- **THEN** the Jobs count continues to describe the entire active unread inbox
- **AND** initial loading or a local count failure is distinguishable from a confirmed zero without hiding unrelated page content
