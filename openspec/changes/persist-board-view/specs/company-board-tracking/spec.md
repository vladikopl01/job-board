## ADDED Requirements

### Requirement: Shareable board views

The system SHALL preserve the selected board view in the URL. `/boards?view=archived` SHALL select Archived in the initial response and after reload or history navigation. An absent or unsupported view SHALL select Active. Selecting a view SHALL NOT mutate stored boards.

#### Scenario: Revisit the archive

- **WHEN** a user opens, reloads or returns to `/boards?view=archived`
- **THEN** Archived is selected and the archived boards are shown after the local query completes
- **AND** the selected tab is identified accessibly

#### Scenario: Return to the default view

- **WHEN** the user selects Active
- **THEN** Active is selected and the default view value is removed from the URL
- **AND** existing creation, duplicate-location and refresh actions can still select their appropriate view
