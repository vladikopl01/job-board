# Job Indexing Specification

## Purpose

Turn supported company boards into a durable local index with complete source content, independent posting identities, and preserved history when openings disappear or references are reused.

## Requirements

### Requirement: Complete supported public feeds

The system SHALL index discoverable postings from tracked Ashby, Lever global, and Lever EU boards without employer credentials or an AI dependency. It SHALL accept a board result only after validating the complete feed, all required pages, consumed posting fields, and unique external references. It SHALL exclude explicitly unlisted Ashby postings and SHALL NOT exclude postings by role, department, or user discovery preferences. A malformed or ambiguous included posting SHALL fail the board result rather than being silently skipped.

#### Scenario: Supported providers and regions

- **WHEN** a valid complete feed is retrieved for an Ashby, Lever global, or Lever EU board
- **THEN** its discoverable postings can be indexed through the same internal posting contract
- **AND** Lever regional identity is retained without substituting the other regional feed
- **AND** no employer credential or AI call is required

#### Scenario: Public listing visibility

- **WHEN** an Ashby response contains both listed postings and postings explicitly marked unlisted
- **THEN** only discoverable postings enter the board's snapshot
- **AND** role and department values do not otherwise exclude jobs from indexing

#### Scenario: Lever traversal exhaustion

- **WHEN** a Lever page contains fewer postings than requested but is not empty
- **THEN** collection continues at the next offset based on the count actually received
- **AND** completion requires an empty page within the allowed request and size budgets

#### Scenario: Unstable paginated removals

- **WHEN** a Lever traversal would mark any current posting unavailable
- **THEN** a second complete traversal must confirm the same discoverable reference set before that result is accepted
- **AND** a differing set, overlapping duplicate, or failed confirmation leaves the entire prior index unchanged

#### Scenario: Invalid or incomplete provider result

- **WHEN** a response is unsuccessful, truncated, malformed, unsupported, contains an invalid included posting or duplicate reference, or cannot finish within its bounds
- **THEN** the board refresh fails with a safe actionable reason
- **AND** no partial feed or fabricated empty feed is reconciled

### Requirement: Retained posting content and source fidelity

Each indexed posting SHALL retain its title, complete plain-text description, source HTML when supplied, job/application links, original location information, separate workplace type, source organizational/employment fields, compensation metadata, available source timestamps, and relevant raw provider data. Missing optional information SHALL remain absent or unknown rather than inferred. The system SHALL preserve multiple locations and restrictions without claiming geographic eligibility or normalizing compensation across currencies or periods.

#### Scenario: Provider descriptions use multiple sections

- **WHEN** a provider supplies description sections, lists, additional information, and salary text
- **THEN** the stored plain description retains those sections with readable boundaries
- **AND** opening/body content is not duplicated merely because combined and separate fields coexist

#### Scenario: Original locations and ambiguous workplace

- **WHEN** a posting supplies multiple locations or a remote flag that does not distinguish hybrid from fully remote
- **THEN** the original locations and restrictions are retained
- **AND** workplace type is normalized only to the degree established by source data, otherwise remaining unknown

#### Scenario: Optional and future source fields

- **WHEN** optional salary or location details are absent and additional unknown fields are present
- **THEN** the posting remains indexable if its required fields are valid
- **AND** unknown source data is retained without inventing a salary, country, or department

### Requirement: Atomic durable board reconciliation

The system SHALL commit an accepted snapshot as one atomic board update: update present current postings, create new ones, mark missing current postings unavailable, and advance successful-refresh metadata together. Failed, interrupted, cancelled, incomplete, or superseded refresh attempts SHALL preserve the prior posting data and last successful refresh. An accepted complete empty feed SHALL mark current postings unavailable without deleting them. Stored results SHALL survive reloads and server restarts and remain readable without provider access.

#### Scenario: Mixed changes in a complete snapshot

- **WHEN** an accepted snapshot contains one existing posting and one new posting but omits another current posting
- **THEN** the existing posting is updated, the new posting is created, and the missing posting becomes unavailable in the same committed result
- **AND** all changes share the successful board refresh outcome

#### Scenario: Complete empty feed

- **WHEN** the provider successfully returns a validated complete empty discoverable feed, including required pagination confirmation
- **THEN** all of that board's current postings become unavailable
- **AND** their retained content and internal identities remain accessible

#### Scenario: Reconciliation fails

- **WHEN** persistence fails before the board update commits
- **THEN** none of the candidate posting changes or successful-refresh metadata takes effect
- **AND** previously stored results remain usable

#### Scenario: Local index after restart or loss of internet

- **WHEN** the app restarts or a provider becomes unreachable after a successful import
- **THEN** the last committed postings and availability history remain readable locally
- **AND** a failed refresh does not replace them with an empty list

### Requirement: Internal identity across source lifecycle

The system SHALL assign an internal UUID independent of provider identifiers. A continuously present reference on the same board SHALL update its current internal posting, including full content changes, without creating a new identity. A reference that reappears after an accepted snapshot observed its absence SHALL receive a new UUID and full re-indexing. Historical matches SHALL NOT be revived or automatically inherit another posting's user-owned history. References on different boards SHALL remain independent.

#### Scenario: Continuous presence with changed content

- **WHEN** a current reference remains present while its title or description changes
- **THEN** the existing internal UUID is retained and its stored content is updated
- **AND** the edit alone does not create another posting incarnation

#### Scenario: Reappearance after observed absence

- **WHEN** an unavailable reference returns after a prior accepted snapshot omitted it
- **THEN** a separate internal UUID is created from the new source content
- **AND** the old record remains unavailable with its data and relationships preserved

#### Scenario: External reference is not globally unique

- **WHEN** different boards publish the same external reference
- **THEN** they receive independent internal posting identities
- **AND** one board's reconciliation cannot update or close the other's records

### Requirement: Confirmed treat-as-new correction

The system SHALL let the user explicitly treat an available posting on an active board as new after confirmation. It SHALL atomically retain the original as superseded and create a new internal UUID from the current stored source data, without a provider fetch or transferred user-owned history. It SHALL NOT infer replacement from content differences. Historical or archived targets SHALL reject this operation, and competing corrections targeting the same old record SHALL NOT create multiple replacements.

#### Scenario: Reference was reused without an observed absence

- **WHEN** the user confirms Treat as new for a current posting
- **THEN** its original UUID remains accessible as superseded and a new current UUID is returned
- **AND** the source reference is retained without claiming a new provider observation occurred

#### Scenario: Cancelled or conflicting correction

- **WHEN** confirmation is cancelled or the targeted posting is no longer current or belongs to an archived board
- **THEN** no replacement is created
- **AND** a stale submitted request receives an actionable conflict rather than silently targeting another incarnation

#### Scenario: Refresh overlaps a correction

- **WHEN** a correction and a refresh complete concurrently for the same reference
- **THEN** at most one current incarnation remains
- **AND** a successful refresh updates the current mapping without reviving a superseded record
