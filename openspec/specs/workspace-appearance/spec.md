# Workspace Appearance Specification

## Purpose

Keep workspace appearance choices accessible, persistent and consistent with the installed shadcn preset.

## Requirements

### Requirement: Sidebar appearance settings
The application SHALL provide a Settings popover at the bottom of the sidebar with Light, Dark and System theme choices. Settings SHALL remain available when the sidebar is collapsed. Its controls SHALL have accessible names, support keyboard selection and dismissal, and restore focus to the trigger on dismissal.

#### Scenario: Choose a theme with the keyboard

- **WHEN** a user opens Settings from the collapsed sidebar and selects Dark with the keyboard
- **THEN** Dark becomes selected and the application uses its dark palette
- **AND** dismissing the popover with Escape restores focus to Settings

### Requirement: Persistent appearance preference
The application SHALL default to System, retain one selected theme, and save explicit choices in browser storage. A later visit SHALL restore the saved preference. System SHALL follow the current OS appearance and its changes; explicit Light or Dark choices SHALL remain independent of OS changes.

#### Scenario: Restore a saved choice

- **WHEN** a user selects Dark and later returns to the application in the same browser
- **THEN** Dark remains selected and the application uses its dark appearance

#### Scenario: Follow the operating system

- **WHEN** the OS appearance changes while System is selected
- **THEN** the application follows that appearance without changing the System preference
- **AND** an explicit Light or Dark choice remains fixed through OS changes

### Requirement: Preset appearance consistency
Settings and both application appearances SHALL use the existing shadcn preset's semantic color tokens. The theme preference SHALL apply across routes, and controls SHALL use the matching native browser color scheme.

#### Scenario: Apply the selected appearance

- **WHEN** a user selects Light or Dark in Settings
- **THEN** the application and portaled controls use that preset palette
- **AND** native controls use the matching light or dark color scheme
