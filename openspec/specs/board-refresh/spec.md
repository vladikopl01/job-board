# Board Refresh Specification

## Purpose

Refresh active boards on app visits and explicit requests while keeping local results available, persisting progress, and safely handling competing requests, failures, archival, and server restarts.

## Requirements

### Requirement: Explicit refresh triggers independent of local reads

The system SHALL queue first indexing when a new board is registered, request refreshes for active boards on the initial browser visit to the running app, including a reload or reopening, and provide a manual Refresh action for each active board. Local results SHALL be read and displayed without waiting for refresh completion. Navigation, prefetching, focus/reconnect events, status polling, local GET requests, and restoration SHALL NOT independently start provider refreshes. There SHALL be no periodic provider polling in this change.

#### Scenario: First indexing after registration

- **WHEN** a new board is registered
- **THEN** its first refresh is durably queued in the same transaction as the board
- **AND** the local save returns before provider work runs through the existing post-response coordinator
- **AND** indexing progress and failures use the existing per-board feedback without requiring another click

#### Scenario: Initial visit with indexed jobs

- **WHEN** the user opens or reloads the app with active tracked boards and stored jobs
- **THEN** local results load independently of refresh work
- **AND** active boards receive refresh requests with visible progress or an actionable scheduling failure

#### Scenario: Navigation and query activity

- **WHEN** the user moves between app routes, focuses the window, reconnects, or triggers local query revalidation or prefetch
- **THEN** those events do not independently request another provider refresh

#### Scenario: Manual refresh and ineligible target

- **WHEN** the user requests Refresh for an active board
- **THEN** its refresh is accepted or coalesced with existing work
- **AND** an unknown board returns not found and an archived board returns a conflict without starting work

#### Scenario: Refresh every active board

- **WHEN** the user selects the secondary Refresh all action beside New board
- **THEN** all active boards are accepted/coalesced or individually deferred for provider cooldowns
- **AND** archived boards are excluded and no duplicate requests are sent while scheduling is pending
- **AND** an accessible spinner with Refreshing boards… appears beside the view tabs while that batch is scheduling or its accepted tasks are pending

#### Scenario: Single-board progress after a completed batch

- **WHEN** a completed all-board refresh is followed by a manual refresh of one board
- **THEN** progress appears in that board's Refresh button without duplicate per-card progress text
- **AND** Refreshing boards… does not appear beside the tabs for that standalone task

#### Scenario: No active boards

- **WHEN** an app-visit request finds no active boards
- **THEN** it completes successfully without creating work or contacting any provider

### Requirement: Durable deduplicated execution

The system SHALL persist refresh requests before acknowledging acceptance and SHALL expose queued, running, succeeded, failed, interrupted, and cancelled outcomes. It SHALL keep at most one queued/running attempt per board, coalesce competing requests onto that attempt, and bound simultaneous board attempts. Work SHALL run within the local application server and remain independent of whether the requesting browser stays on the page.

#### Scenario: Competing tabs or repeated actions

- **WHEN** multiple requests target a board that already has queued or running work
- **THEN** they identify the same active attempt
- **AND** they do not create duplicate provider traversals for that attempt

#### Scenario: Multiple boards exceed execution capacity

- **WHEN** more boards are queued than can run simultaneously
- **THEN** remaining boards stay durably queued and are processed as capacity becomes available
- **AND** a board's failure does not cancel or block unrelated boards

#### Scenario: Requesting page closes

- **WHEN** the browser navigates away or closes after a refresh is accepted while the server remains running
- **THEN** the persisted work can finish and its outcome remains available on a later visit

### Requirement: Bounded work and conservative recovery

Each refresh attempt SHALL have bounded transport, payload, and execution limits. Exceeding a limit or losing execution ownership SHALL prevent that attempt from changing the index. Queued work SHALL be recoverable after restart, and abandoned running work SHALL become interrupted once its ownership is known to be stale. Potentially live work SHALL NOT be stolen merely because a module or server process starts. Interrupted/failed work SHALL offer explicit retry rather than a silent repeated-attempt loop.

#### Scenario: Server stops with unfinished work

- **WHEN** the server stops with queued and running attempts and a subsequent app visit or manual request resumes coordination
- **THEN** queued attempts can resume and stale running attempts become interrupted
- **AND** unexpired ownership is respected until it becomes stale
- **AND** stored posting data remains unchanged by the unfinished attempt

#### Scenario: Late completion from a stale owner

- **WHEN** an expired, replaced, interrupted, or cancelled attempt later supplies a result
- **THEN** it cannot commit postings or overwrite the current task/board outcome

#### Scenario: Provider timeout or rate limit

- **WHEN** provider access times out, exceeds a budget, fails, or is rate limited
- **THEN** the attempt terminates with a safe reason and retains prior indexed data
- **AND** retry timing supplied by the provider is respected without an automatic retry loop

### Requirement: Archive invalidates in-flight work

Archival SHALL cancel queued/running board refreshes and prevent their results from committing. A refresh begun before an archive SHALL remain invalid even if the board is restored before that refresh finishes. Cancellation SHALL preserve the existing index and successful-refresh metadata. Restoration SHALL allow a later explicit or app-visit request to create fresh work.

#### Scenario: Archive during provider access

- **WHEN** the user archives a board while its refresh is queued or running
- **THEN** the work becomes cancelled and cannot change the board's index
- **AND** previously stored jobs remain retained

#### Scenario: Archive followed by immediate restore

- **WHEN** a board is archived and restored before an earlier provider result returns
- **THEN** the earlier attempt remains invalid and cannot commit
- **AND** a later eligible request can refresh the restored board

### Requirement: Truthful per-board refresh feedback

The system SHALL expose per-board current/latest task state, last successful refresh, and recoverable failures without replacing confirmed data. It SHALL distinguish never-refreshed boards from successful empty results, use truthful progress rather than invented totals, and make completed changes visible in local lists. Errors SHALL use safe actionable messages without raw payloads or private runtime details. Pending and terminal changes SHALL be accessible to assistive technology without repetitive announcements.

#### Scenario: Independent board outcomes

- **WHEN** one board succeeds and another fails
- **THEN** the successful board's result is visible and the failed board keeps its prior index
- **AND** each board shows its own outcome and last-success time

#### Scenario: Successful refresh with unchanged postings

- **WHEN** a refresh succeeds without adding, updating, or removing listings
- **THEN** its card shows Up to date and the number of unchanged current postings cached locally
- **AND** historical unavailable postings are excluded from that count
- **AND** this success is distinguishable from a failed refresh or a board that was never indexed
- **AND** completed result text stays mounted and uses a brief opacity pulse even when the previous result had the same counts, without moving keyboard focus and with reduced motion respected

#### Scenario: Preserve the previous result throughout another attempt

- **WHEN** a board with a successful result has a later queued, running, or failed attempt
- **THEN** its last successful counts and timestamp remain visible, including when opening the page during that attempt
- **AND** initial display and pending-state transitions do not animate or remove that result
- **AND** a new successful result updates the same text element and triggers completion feedback

#### Scenario: Pending refresh or scheduling failure

- **WHEN** refresh work is pending or its scheduling request fails
- **THEN** stored jobs and board data remain visible
- **AND** the UI shows the pending state or an actionable retry without claiming an empty successful refresh

### Requirement: Safe local refresh mutations

Refresh requests SHALL validate local request origin/host, JSON content, identifiers, and allowed inputs before creating work. Rejected requests SHALL perform no writes or provider calls. Status and data GETs SHALL be read-only. The server SHALL derive provider targets from stored supported sources and SHALL NOT fetch arbitrary request-supplied URLs or follow provider redirects.

#### Scenario: Rejected refresh caller

- **WHEN** a refresh request has an unsupported origin/host, malformed JSON, invalid input, or an invalid identifier
- **THEN** it fails without creating tasks, changing records, or contacting a provider

#### Scenario: Unexpected transport destination

- **WHEN** a provider returns a redirect or a caller supplies an arbitrary destination instead of the allowed request shape
- **THEN** no request is made to that destination
- **AND** previously committed data remains unchanged
