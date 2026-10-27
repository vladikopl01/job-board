# Board Name Suggestions Specification

## Purpose

Help users add supported company boards by pasting a URL and reviewing an editable suggested name, including when employer metadata cannot be reached.

## Requirements

### Requirement: URL-first name suggestion

The add-board form SHALL present the board URL before the company name. A supported URL SHALL immediately provide a readable, valid name from the board slug as the name field's placeholder, without changing its value. An optional page lookup SHALL improve the placeholder with a company name from available metadata. Suggestions SHALL retain meaningful brand capitalization, decode HTML entities and remove common job-board title decoration. Users SHALL be able to enter a custom name. Saving SHALL use the trimmed custom name when nonempty, otherwise the current suggestion; the submitted name SHALL meet existing name validation.

#### Scenario: Metadata improves the slug

- **WHEN** the user pastes `https://jobs.ashbyhq.com/notion` and the page title is `Notion Jobs`
- **THEN** the company-name placeholder is initially suggested from the slug and becomes `Notion` after lookup
- **AND** the field's value remains empty until the user enters a custom name

#### Scenario: Save or override the suggestion

- **WHEN** the user saves a supported board with the name field empty or containing only whitespace
- **THEN** the current suggested name is saved
- **AND** a nonempty custom name takes precedence, while clearing it returns to using the current suggestion

#### Scenario: Offline or unavailable metadata

- **WHEN** internet access is unavailable, the lookup fails or times out, or the page has no usable company metadata
- **THEN** the slug suggestion remains available and editable
- **AND** local registration remains possible without waiting for metadata

### Requirement: Preserve user intent during lookup

Lookups SHALL be scoped to the current supported board URL and avoid issuing requests for each keystroke. A late response SHALL NOT change the input value, apply a previous board's placeholder, refill a successfully reset form or rename an existing board. Saving SHALL resolve the custom name or current placeholder independently of lookup completion.

#### Scenario: User edits a suggested name

- **WHEN** the user edits the company name while a lookup is pending or changes the board URL after editing the name
- **THEN** that manually entered name is preserved

#### Scenario: URL changes or form resets

- **WHEN** a lookup finishes after the user selects a different board or successfully saves the form
- **THEN** the previous lookup does not change the current form or any saved board

### Requirement: Supplemental help on demand

The boards screen SHALL keep concise visible field labels, actionable empty states and inline errors. Supplemental explanations SHALL be available through named info buttons rather than persistent helper paragraphs. The help SHALL be accessible through pointer hover, keyboard activation and touch, remain readable while hovered, and dismiss with Escape without submitting the form.

#### Scenario: Read additional help

- **WHEN** the user hovers, activates with the keyboard or taps an info button
- **THEN** the related explanation becomes available
- **AND** dismissing it preserves entered form values and returns keyboard focus appropriately

### Requirement: Restrict optional metadata access

The local metadata API SHALL accept only supported canonical HTTPS board roots from the same loopback origin as the app. Invalid URLs and unsafe callers SHALL be rejected before any external request. Lookups SHALL NOT follow redirects, forward local credentials, execute returned scripts, fetch job feeds or access stored board data. Time and response size SHALL be bounded. Metadata is a name suggestion, not a claim that a board has been verified or indexed.

#### Scenario: Unsupported destination or unsafe caller

- **WHEN** a metadata request uses an unsupported URL or comes from an unsupported origin
- **THEN** it is rejected without fetching a page or accessing local board storage

#### Scenario: Provider page cannot be used

- **WHEN** the page redirects, returns an error or non-HTML response, or exceeds the lookup's resource budget
- **THEN** the lookup terminates within its bounds and returns any usable metadata from the bounded HTML prefix or the slug fallback
