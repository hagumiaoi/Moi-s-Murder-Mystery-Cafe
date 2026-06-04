export type WorkspaceColumnType =
  | "investigation"
  | "interrogation"
  | "story-log"
  | "dossier"
  | "debug";

export type WorkspaceColumnWidth = "1/2" | "1/3" | "1/4" | "1/6";

export interface WorkspaceColumn {
  id: string;
  type: WorkspaceColumnType;
  width: WorkspaceColumnWidth;
  title: string;
  icon: string;
}

export const DEFAULT_COLUMNS: WorkspaceColumn[] = [
  { id: "investigation", type: "investigation", width: "1/6", title: "调查", icon: "🔍" },
  { id: "interrogation", type: "interrogation", width: "1/3", title: "审问", icon: "💬" },
  { id: "story-log", type: "story-log", width: "1/4", title: "故事", icon: "📖" },
  { id: "dossier", type: "dossier", width: "1/4", title: "档案", icon: "📋" },
  { id: "debug", type: "debug", width: "1/4", title: "调试", icon: "🔧" },
];
