## ADDED Requirements

### Requirement: Restore the desktop sidebar preference

The workspace SHALL restore the saved expanded or collapsed desktop sidebar state when reloaded, including the initial rendered page before hydration. Missing or invalid saved preferences SHALL default to expanded. The narrow-screen drawer SHALL retain its independent open/close behavior. Sidebar changes SHALL NOT alter collection filters or local posting data.

#### Scenario: Reload a collapsed workspace

- **WHEN** the user collapses the desktop sidebar and reloads a workspace route
- **THEN** the sidebar initially renders collapsed and remains usable
- **AND** expanding it updates the saved choice for a later reload

#### Scenario: No valid saved preference

- **WHEN** no valid desktop sidebar preference exists
- **THEN** the workspace initially renders with its desktop sidebar expanded
