import type { ComponentType } from "react";
import type { GameState, PanelDef, PublicQuestionDef, ResolutionAnswer } from "../types";

export interface PanelProps {
  script: ScriptInfoData;
  state: GameState;
  gameActions: GameActions;
  panel: WorkspacePanel;
  streamingReply?: string;
  streamingStory?: string;
  loading?: boolean;
  lastPrompt?: string;
}

export interface ScriptInfoData {
  title: string;
  description: string;
  progression?: { type: string; config?: Record<string, unknown> };
  entities?: { id: string; kind: string; name: string; tags?: string[]; description?: string; starts_hidden?: boolean }[];
  facts?: { id: string; statement: string; visibility: string; time?: string }[];
  evidence?: { id: string; title: string; description: string; source_entity?: string; tags?: string[] }[];
  interactions?: { id: string; type: string; title: string; target?: Record<string, unknown> }[];
  questions?: PublicQuestionDef[];
  resolution?: { type: string; required_questions: string[]; pass_score?: number; endings: Record<string, string> };
  panels?: PanelDef[];
  first_entity?: string;
}

export interface WorkspacePanel {
  id: string;
  type: string;
  title: string;
  icon: string;
  width: string;
  filter?: { kind?: string[]; tags?: string[] };
  sections?: string[];
  config?: Record<string, unknown>;
}

export interface GameActions {
  sendMessage: (text: string) => Promise<GameState | null>;
  search: (locationId: string) => Promise<GameState | null>;
  selectEntity: (entityId: string) => Promise<GameState | null>;
  submitResolution: (answers: ResolutionAnswer[]) => Promise<GameState | null>;
  undoResend: (entityId: string, msgIndex: number, newMsg: string) => Promise<GameState | null>;
  reset: () => Promise<GameState | null>;
}

const registry = new Map<string, ComponentType<PanelProps>>();

export function registerPanel(type: string, component: ComponentType<PanelProps>): void {
  registry.set(type, component);
}

export function getPanel(type: string): ComponentType<PanelProps> | undefined {
  return registry.get(type);
}

export { registry };
