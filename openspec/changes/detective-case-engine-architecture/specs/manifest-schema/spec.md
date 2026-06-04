# Manifest Schema

## ADDED Requirements

### Requirement: Case Manifest V2

The system SHALL load detective cases from a single `detective-case-v2` manifest using `standalone-json` packaging.

#### Scenario: Load a valid V2 manifest

- **GIVEN** a manifest with `format: "detective-case-v2"` and `packaging: "standalone-json"`
- **AND** the manifest defines `progression`, `entities`, `facts`, `evidence`, `interactions`, `questions`, `resolution`, `panels`, and `prompts`
- **WHEN** the backend starts
- **THEN** it validates and loads that manifest as the active case

### Requirement: Entity Model

The manifest SHALL model case objects as `entities` instead of NPC-specific records.

#### Scenario: Represent people and non-person case objects

- **GIVEN** a manifest contains entities with kinds such as `person`, `place`, `item`, `document`, `event`, or `concept`
- **WHEN** the engine reads those entities
- **THEN** it uses `entity.id` as the runtime key
- **AND** it does not require `is_murderer`, `script_file`, or `current_npc`

### Requirement: Fact and Evidence Model

The manifest SHALL separate hidden truth from player-visible discoveries through `facts` and `evidence`.

#### Scenario: Evidence reveals facts

- **GIVEN** an evidence entry references fact ids in `reveals`
- **WHEN** the player discovers that evidence
- **THEN** the game state records the evidence id in `discovered_evidence`
- **AND** records the revealed fact ids in `revealed_facts`

### Requirement: Public Manifest Redaction

The `/api/info` endpoint SHALL return a public manifest that excludes sensitive case data.

#### Scenario: Return public case information

- **GIVEN** the backend has a complete manifest with answers, rubrics, hidden facts, prompts, entity secrets, and evidence relationships
- **WHEN** a client requests `/api/info`
- **THEN** the response omits `questions.answer`, `questions.rubric`, `prompts`, `entities.secret`, `entities.script`, and sensitive metadata
- **AND** it returns only public facts plus facts present in `gameState.revealed_facts`
- **AND** it returns only starting or discovered evidence present in `gameState.discovered_evidence`
- **AND** public evidence omits `reveals`, `contradicts`, and sensitive metadata

### Requirement: Resolution Is Question-Based

The engine SHALL score case resolution through `questions` and `resolution`, without requiring an engine-level culprit field.

#### Scenario: Validate required resolution questions

- **GIVEN** a manifest defines `resolution.required_questions`
- **WHEN** the backend validates the manifest
- **THEN** every referenced question id must exist in `questions`
- **AND** the manifest does not need a `culprit` question unless the case author chooses one

### Requirement: Supported Question Types

The resolution model SHALL support `single-entity`, `multi-entity`, `choice`, `text-rubric`, and `evidence-set` questions.

#### Scenario: Score submitted answers

- **GIVEN** the player submits answers for one or more questions
- **WHEN** the backend scores the resolution
- **THEN** entity, choice, and evidence-set questions are compared by id
- **AND** multi-answer questions are compared as sets
- **AND** text-rubric questions are scored against their rubric

### Requirement: Manifest-Driven Interactions

The manifest SHALL declare interactions that the backend validates before applying game effects.

#### Scenario: Run an interaction

- **GIVEN** a player submits an interaction with `interaction_id`
- **WHEN** the interaction target and requirements are valid
- **THEN** the backend applies the interaction cost from `cost.progress`
- **AND** dispatches by interaction type
- **AND** failed validation does not consume progression

### Requirement: Progression Driver

The engine SHALL drive time and action limits through `progression`.

#### Scenario: Daily rounds progression

- **GIVEN** a manifest uses `progression.type: "daily-rounds"`
- **WHEN** an interaction with positive progress cost succeeds
- **THEN** the backend advances `step` and `phase` according to progression config
- **AND** ends the game with the timeout ending when the configured maximum is exceeded

#### Scenario: Free progression

- **GIVEN** a manifest uses `progression.type: "free"`
- **WHEN** interactions succeed
- **THEN** they do not consume rounds or trigger timeout through progression

### Requirement: Debug-Only Complete Manifest

Complete manifest data SHALL only be available through debug-only APIs guarded by backend configuration.

#### Scenario: Debug disabled

- **GIVEN** `debug.enabled` is not true
- **WHEN** a client requests a debug-only endpoint
- **THEN** the backend returns an error status and does not expose complete manifest data

#### Scenario: Debug enabled

- **GIVEN** `debug.enabled` is true
- **WHEN** a client requests a debug-only endpoint
- **THEN** the backend may return complete manifest, state, or prompt data for development use
