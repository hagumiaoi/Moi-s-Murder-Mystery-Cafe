## ADDED Requirements

### Requirement: Workspace state is separate from game state
The frontend SHALL model workspace layout state separately from server game state.

#### Scenario: Game state updates
- **WHEN** the backend returns an updated `GameState`
- **THEN** the workspace column list and active column index SHALL NOT be overwritten unless the user performs a layout action

### Requirement: Components do not call API directly
Feature column components SHALL trigger controller callbacks instead of calling API functions directly.

#### Scenario: Player sends a message from the interrogation column
- **WHEN** the user submits a message
- **THEN** the column component SHALL call a controller callback and SHALL NOT directly call `fetch` or the API client

### Requirement: App shell does not contain stream parsing
The app shell SHALL NOT own server-sent event parsing logic.

#### Scenario: Chat stream is received
- **WHEN** the backend sends streaming chat tokens
- **THEN** a dedicated hook or controller SHALL parse the stream and expose renderable state to the workspace

### Requirement: Selectors provide view models
The frontend SHALL use selectors or view model helpers for derived display data.

#### Scenario: Investigation column renders locations
- **WHEN** the investigation column displays search locations
- **THEN** discovered clue counts and exhausted-location state SHALL be derived by selectors rather than recalculated inside the component markup
