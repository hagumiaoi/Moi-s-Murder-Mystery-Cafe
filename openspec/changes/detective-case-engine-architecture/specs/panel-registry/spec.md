# Panel Registry

## ADDED Requirements

### Requirement: Manifest-Driven Panels

The frontend SHALL render workspace panels from the public manifest `panels` array through a panel registry.

#### Scenario: Render a known panel type

- **GIVEN** `/api/info` returns a panel with a registered `type`
- **WHEN** the workspace renders
- **THEN** the frontend uses the registered component for that type
- **AND** passes the public manifest, game state, game actions, panel definition, and streaming state to the component

#### Scenario: Render an unknown panel type

- **GIVEN** `/api/info` returns a panel with an unknown `type`
- **WHEN** the workspace renders
- **THEN** the frontend shows an unknown-panel fallback
- **AND** the application does not crash

### Requirement: App-Owned State Updates

Panels SHALL update game state only through App-owned actions.

#### Scenario: Panel triggers a state-changing action

- **GIVEN** a panel needs to select an entity, run an interaction, submit resolution, undo/resend, or reset the game
- **WHEN** it invokes the corresponding game action
- **THEN** the App layer calls the backend API
- **AND** App updates React state from the API response
- **AND** the panel does not mutate state props directly

### Requirement: Public Manifest Refresh

The frontend SHALL refresh public manifest data after actions that can change public visibility.

#### Scenario: Evidence or facts are discovered

- **GIVEN** an interaction response changes `discovered_evidence` or `revealed_facts`
- **WHEN** the App updates game state
- **THEN** it refreshes `/api/info`
- **AND** case-file panels can show newly public evidence and facts

#### Scenario: Game is reset

- **GIVEN** the player starts a new game
- **WHEN** the App receives the reset state
- **THEN** it refreshes `/api/info`
- **AND** previously revealed public manifest data is cleared from the frontend

### Requirement: Entity List Panel

The entity list panel SHALL render interactable entities from manifest data without owning resolution submission.

#### Scenario: Select an entity

- **GIVEN** the panel displays person entities
- **WHEN** the player selects one
- **THEN** the panel calls the select-entity action with that entity id
- **AND** it does not call a fixed accuse or culprit action

### Requirement: Case File Panel

The case file panel SHALL display only public case data and runtime discoveries.

#### Scenario: Show facts and evidence

- **GIVEN** the public manifest includes public or revealed facts and discovered evidence
- **WHEN** the case file panel renders
- **THEN** it displays those facts and evidence
- **AND** it does not infer hidden facts or evidence relationships from local data

### Requirement: Resolution Panel

The resolution panel SHALL render question forms from the public manifest and submit all filled answers.

#### Scenario: Submit scalar answers

- **GIVEN** a case has `single-entity`, `choice`, or `text-rubric` questions
- **WHEN** the player fills those answers and submits
- **THEN** the panel sends answer strings through `submitResolution`

#### Scenario: Submit collection answers

- **GIVEN** a case has `multi-entity` or `evidence-set` questions
- **WHEN** the player selects multiple values and submits
- **THEN** the panel sends answer arrays through `submitResolution`

### Requirement: Settings Panel Debug Controls

The settings panel SHALL keep debug content hidden until the user confirms and the backend permits debug access.

#### Scenario: User opens debug controls while backend debug is disabled

- **GIVEN** the user confirms that debug content may expose spoilers
- **AND** the backend returns a forbidden response for debug-only APIs
- **WHEN** the settings panel receives that response
- **THEN** it displays a debug-unavailable state
- **AND** it does not reconstruct sensitive data from `/api/info`

#### Scenario: User opens debug controls while backend debug is enabled

- **GIVEN** the user confirms that debug content may expose spoilers
- **AND** the backend permits debug-only APIs
- **WHEN** the user requests prompt, manifest, or state debug data
- **THEN** the settings panel displays the requested debug data
