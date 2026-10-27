## ADDED Requirements

### Requirement: Consistent component styling and motion

The application SHALL load shared component styling so its existing controls, alerts and help bubbles render with their intended surfaces and state changes. Help bubbles SHALL use their standard entrance and exit motion. Users requesting reduced motion SHALL be able to open and dismiss the same help without spatial animation. Restoring these styles SHALL preserve keyboard, pointer and touch access, form values, and board-view navigation.

#### Scenario: Standard popup feedback

- **WHEN** the user opens or dismisses a help bubble with no reduced-motion preference
- **THEN** it uses the standard fade and scale entrance or exit styling
- **AND** the bubble has a readable surface and text

#### Scenario: Reduced-motion preference

- **WHEN** the user requests reduced motion and opens or dismisses a help bubble
- **THEN** the explanation remains available without spatial animation
- **AND** activation and dismissal retain their existing keyboard, pointer and touch behavior

#### Scenario: Board navigation after component reinstallation

- **WHEN** the user changes between active and archived boards
- **THEN** the tabs retain their intended orientation and selected state
- **AND** navigation remains usable with the keyboard
