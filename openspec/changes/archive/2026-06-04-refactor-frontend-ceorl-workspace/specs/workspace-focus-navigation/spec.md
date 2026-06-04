## ADDED Requirements

### Requirement: Bottom workspace navigation
The frontend SHALL provide a bottom navigation bar for workspace columns.

#### Scenario: Workspace renders
- **WHEN** the ceorl workspace is visible
- **THEN** the bottom navigation bar SHALL show one navigation item per workspace column

### Requirement: Navigation item thumbnail
Each bottom navigation item SHALL include a compact visual thumbnail representing the column.

#### Scenario: User scans available windows
- **WHEN** the bottom navigation bar is visible
- **THEN** each item SHALL show a miniature representation of its column type and width

### Requirement: Active column highlight
The bottom navigation bar SHALL visually highlight the currently focused workspace column.

#### Scenario: Active column changes
- **WHEN** the active workspace index changes
- **THEN** the corresponding bottom navigation item SHALL become highlighted and the previous item SHALL no longer be highlighted

### Requirement: Click to focus
The bottom navigation bar SHALL allow users to focus a workspace column by clicking its navigation item.

#### Scenario: User clicks a navigation item
- **WHEN** the user clicks a bottom navigation item
- **THEN** the workspace SHALL update `activeIndex` and scroll the corresponding ceorl column into focus

### Requirement: Keyboard focus safety
Workspace focus shortcuts SHALL NOT interrupt text input.

#### Scenario: User types in an input field
- **WHEN** focus is inside an input, textarea, select, or contenteditable element
- **THEN** workspace keyboard navigation SHALL NOT move the active column
