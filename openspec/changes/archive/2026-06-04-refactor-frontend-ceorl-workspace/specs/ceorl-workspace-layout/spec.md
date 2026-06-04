## ADDED Requirements

### Requirement: Vendored ceorl layout source
The frontend SHALL include the required `ceorl` layout source code inside the project instead of depending on `/home/syy/code/ceorl` at runtime.

#### Scenario: Project builds on another machine
- **WHEN** a developer clones this repository and installs project dependencies
- **THEN** the frontend SHALL build without requiring a local `/home/syy/code/ceorl` path

### Requirement: Investigation workspace shell
The frontend SHALL render the main game screen as a top bar plus a horizontal ceorl workspace.

#### Scenario: Game screen loads
- **WHEN** script info and game state have loaded
- **THEN** the screen SHALL display a top bar and a ceorl-based workspace containing investigation, interrogation, story log, and dossier columns

### Requirement: Default workspace columns
The workspace SHALL provide default columns for investigation navigation, interrogation, story log, and dossier review.

#### Scenario: Workspace initializes
- **WHEN** the workspace first renders
- **THEN** it SHALL include the default columns in the order investigation, interrogation, story log, dossier

### Requirement: Dossier column uses stacked panels
The dossier column SHALL use column-internal stacking for clue, timeline, and people review panels.

#### Scenario: Player reviews dossier
- **WHEN** the dossier column is visible
- **THEN** it SHALL show clue, timeline, and people sections within the same column without requiring route navigation
