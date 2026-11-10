## ADDED Requirements

### Requirement: Resolve saved company links

Until dedicated company pages are implemented, the system SHALL resolve an existing `/boards/[id]` company URL to that saved board in the appropriate local board view using a temporary redirect. The explicitly linked card SHALL receive focus after its local data loads. Resolving a company URL SHALL NOT require a provider lookup or mutate board state.

#### Scenario: Follow a saved company link

- **WHEN** a user follows an existing company URL from a job or board
- **THEN** an active company opens its card in Active and an archived company opens its card in Archived
- **AND** the saved card receives focus when available

#### Scenario: Missing company record

- **WHEN** the company identifier is invalid or is not stored locally
- **THEN** the system returns a not-found response without a provider lookup or replacement record
