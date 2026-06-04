// ── API Types (shared between frontend and backend) ──

export interface ChatMessage {
  role: "player" | "npc";
  content: string;
  _snap?: SnapShot;
}

export interface StoryEntry {
  story: string;
  thinking?: string;
}

export interface ClueEntry {
  location_id: string;
  location_name: string;
  scene: string;
  clue: string;
}

export interface SnapShot {
  /** Maps to GameState.step */
  rounds: number;
  /** Maps to GameState.phase */
  days: number;
  story_len: number;
  clue_len: number;
  /** Maps to GameState.current_entity */
  npc: string;
}

// ── V2 Case Manifest Types ──

export type EntityKind = "person" | "place" | "item" | "document" | "event" | "concept";

export interface EntityDef {
  id: string;
  kind: EntityKind;
  name: string;
  aliases?: string[];
  tags?: string[];
  portrait?: string;
  description?: string;
  secret?: string;
  script?: string;
  knowledge?: string[];
  starts_hidden?: boolean;
  metadata?: Record<string, unknown>;
}

export type EntityInfo = Pick<EntityDef, "id" | "kind" | "name" | "tags" | "description" | "starts_hidden">;

export type TruthValue = "true" | "false" | "unknown";
export type Visibility = "public" | "hidden" | "revealed";

export interface FactDef {
  id: string;
  statement: string;
  truth: TruthValue;
  visibility: Visibility;
  time?: string;
  source_entity?: string;
  revealed_by?: string[];
  contradicts?: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceDef {
  id: string;
  title: string;
  description: string;
  source_entity?: string;
  reveals?: string[];
  contradicts?: string[];
  tags?: string[];
  starts_discovered?: boolean;
  metadata?: Record<string, unknown>;
}

export type PublicEvidenceDef = Omit<EvidenceDef, "reveals" | "contradicts" | "metadata">;

export type InteractionType = "talk" | "search" | "inspect" | "confront" | "submit-resolution";

export interface InteractionDef {
  id: string;
  type: InteractionType;
  title: string;
  target?: {
    kind?: EntityKind[];
    tags?: string[];
    ids?: string[];
  };
  requires?: {
    evidence?: string[];
    facts?: string[];
    entities?: string[];
  };
  cost?: {
    progress?: number;
  };
  reveals?: {
    evidence?: string[];
    facts?: string[];
    entities?: string[];
  };
  prompt?: string;
  config?: Record<string, unknown>;
}

export type QuestionType = "single-entity" | "multi-entity" | "choice" | "text-rubric" | "evidence-set";

export interface QuestionDef {
  id: string;
  type: QuestionType;
  title: string;
  description?: string;
  required?: boolean;
  options?: { id: string; label: string; description?: string }[];
  answer?: string | string[];
  rubric?: string[];
  related_facts?: string[];
  related_evidence?: string[];
}

export type PublicQuestionDef = Omit<QuestionDef, "answer" | "rubric">;

export interface ResolutionDef {
  type: "questionnaire";
  required_questions: string[];
  pass_score?: number;
  endings: {
    perfect: string;
    partial?: string;
    failed: string;
    timeout?: string;
  };
}

export interface ProgressionDef {
  type: "daily-rounds" | "free";
  config?: {
    max?: number;
    per_phase?: number;
    labels?: string[];
    transition_template?: string;
  };
}

export type PanelType = "entity-list" | "interaction" | "narrative" | "case-file" | "resolution" | "settings";

export interface PanelDef {
  id: string;
  type: PanelType;
  title: string;
  icon: string;
  width: "1/2" | "1/3" | "1/4" | "1/6";
  filter?: {
    kind?: EntityKind[];
    tags?: string[];
  };
  sections?: string[];
  config?: Record<string, unknown>;
}

export interface CaseManifestV2 {
  $schema: string;
  format: "detective-case-v2";
  packaging: "standalone-json";
  title: string;
  description: string;
  progression: ProgressionDef;
  entities: EntityDef[];
  facts: FactDef[];
  evidence: EvidenceDef[];
  interactions: InteractionDef[];
  questions: QuestionDef[];
  resolution: ResolutionDef;
  panels: PanelDef[];
  first_entity?: string;
  prompts: Record<string, string>;
}

export interface PublicCaseManifest {
  $schema: string;
  format: "detective-case-v2";
  packaging: "standalone-json";
  title: string;
  description: string;
  progression: ProgressionDef;
  entities: EntityInfo[];
  facts: Pick<FactDef, "id" | "statement" | "visibility" | "time">[];
  evidence: PublicEvidenceDef[];
  interactions: InteractionDef[];
  questions: PublicQuestionDef[];
  resolution: ResolutionDef;
  panels: PanelDef[];
  first_entity?: string;
}

// ── Game State Types ──

export interface GameState {
  phase: number;
  step: number;
  current_entity: string;
  game_over: boolean;
  ending?: string;
  stories: (string | StoryEntry)[];
  chat_history: Record<string, ChatMessage[]>;
  clues: ClueEntry[];
  revealed_facts: string[];
  discovered_evidence: string[];
}

// ── API Types ──

export interface InteractionInput {
  interaction_id: string;
  target_entity?: string;
  evidence_ids?: string[];
  text?: string;
  answers?: ResolutionAnswer[];
}

export interface ResolutionAnswer {
  question_id: string;
  answer: string | string[];
}

export interface InteractionResponse {
  reply?: string;
  story: string;
  thinking?: string;
  prompt?: string;
  state: GameState;
  game_over?: boolean;
  win?: boolean;
  message?: string;
  ending?: string;
  error?: string;
}

export interface UndoResendRequest {
  entity_id: string;
  message_index: number;
  new_message: string;
}

// ── SSE Stream Types ──

export type SSEEvent =
  | { type: "token"; content: string }
  | { type: "done"; prompt?: string; state: GameState }
  | { type: "game_over"; state: GameState };
