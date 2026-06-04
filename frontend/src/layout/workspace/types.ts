export type WorkspaceColumnType = string;

export interface WorkspaceColumn {
  id: string;
  type: WorkspaceColumnType;
  width: "1/2" | "1/3" | "1/4" | "1/6";
  title: string;
  icon: string;
  filter?: {
    kind?: string[];
    tags?: string[];
  };
  sections?: string[];
  config?: Record<string, unknown>;
}

export const DEFAULT_COLUMNS: WorkspaceColumn[] = [
  { id: "investigation", type: "entity-list", width: "1/6", title: "调查", icon: "search" },
  { id: "interaction", type: "interaction", width: "1/3", title: "交互", icon: "message-circle" },
  { id: "story-log", type: "narrative", width: "1/4", title: "故事", icon: "book-open" },
  { id: "case-file", type: "case-file", width: "1/4", title: "档案", icon: "clipboard-list" },
  { id: "settings", type: "settings", width: "1/4", title: "设置", icon: "settings" },
];
