## Purpose

Give the local job-search workspace consistent destinations and preserve context while moving between sources, posting lists, and retained descriptions.

## ADDED Requirements

### Requirement: Persistent inset workspace navigation

The workspace SHALL expose Dashboard, Inbox, Jobs, and Boards in a persistent desktop sidebar and accessible narrow-screen navigation. The root destination SHALL open Dashboard. Inbox SHALL carry the active unread count, independently of local list filters. The badge SHALL be absent until a count is known; a previously confirmed count SHALL remain available during retry. Its gray background SHALL remain distinct from navigation hover and selected surfaces, and selected navigation SHALL use a gray fill without adding a border. The brand SHALL be text-only. Top-level destinations SHALL show their section without a fictional workspace ancestor. Detail destinations SHALL use one shell breadcrumb trail with a linked parent collection and current identity, without a second in-page trail. Every destination SHALL expose a visible page title and identifiable active navigation. Navigation SHALL preserve the existing shared refresh and read-state coordination.

#### Scenario: Enter and navigate the workspace

- **WHEN** the user opens the root route and moves between destinations
- **THEN** Dashboard opens by default and the active destination is identified
- **AND** navigation, content, and controls remain usable at 320 CSS pixels and with keyboard input
- **AND** route changes reset workspace scrolling without focus causing a document scroll
- **AND** collapsed navigation uses square icon targets aligned with the shell header, and the text brand remains distinct from navigation controls

### Requirement: Actionable local overview

Dashboard SHALL show real local unread and board information with links to continue reviewing or manage sources. It SHALL distinguish loading, failure, and an empty workspace without inventing counts or claims about employer availability.

#### Scenario: Overview data is unavailable

- **WHEN** a local overview query fails
- **THEN** the affected information shows a retryable error while independent confirmed information remains usable

### Requirement: Connected board details

Each tracked board SHALL have a local detail destination showing its identity, source, management and refresh controls in a page header, and its indexed postings under Jobs without wrapping the header in a card. Archived boards SHALL retain access to their posting history. Unknown boards SHALL show a recoverable not-found state without provider lookup.

#### Scenario: Follow a company from a posting

- **WHEN** a user activates a posting's company link
- **THEN** the matching board and its locally indexed postings are available
- **AND** board and posting availability remain distinct from read state

### Requirement: Stable contextual reading

The workspace SHALL fit the viewport and give collection content one scroll region beneath the shell header. A contextual reader SHALL overlay the page in a Sheet with its own independently scrolling content, without narrowing or reflowing the collection. Full posting content SHALL be centered in a readable column with semantic headings, facts, and retained description typography. Inbox and Jobs SHALL offer a side panel over the collection on wide screens and a full-width reading panel on narrow screens. Previous, Next and Expand controls SHALL have visible labels, and Close SHALL occupy the right end of the reader toolbar. Opening, moving between, and closing postings SHALL preserve the originating filters, page, and list position. The selected posting SHALL be URL-addressable. Previous and next SHALL operate within the confirmed displayed page. Automatic read marking SHALL occur only after the actual retained details display; manual unread overrides SHALL survive refetches. While reading, confirmed list membership SHALL remain stable until the reader closes or the user changes the list scope. This temporary review context SHALL NOT change unread counts or persisted availability.

#### Scenario: Read an Inbox posting and return to the queue

- **WHEN** the user opens an unread posting, reads it, and moves to the next posting
- **THEN** read state updates without removing the reading context or shifting the remaining review rows
- **AND** closing the reader reconciles the list with the current unread population and restores focus to the originating row or a useful remaining control

#### Scenario: Narrow-screen reading

- **WHEN** the reader is opened on a narrow viewport
- **THEN** the posting has a visible way back to the same list and the hidden list is excluded from keyboard navigation
