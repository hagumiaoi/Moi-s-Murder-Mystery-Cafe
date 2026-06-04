import type { IconName } from "./icons";

export type WorkspaceColumnType =
  | "investigation"
  | "interrogation"
  | "story-log"
  | "dossier"
  | "debug";

export interface WorkspaceColumn {
  id: string;
  type: WorkspaceColumnType;
  width: "1/2" | "1/3" | "1/4" | "1/6";
  title: string;
  icon: IconName;
}

export const DEFAULT_COLUMNS: WorkspaceColumn[] = [
  { id: "investigation", type: "investigation", width: "1/6", title: "调查", icon: "search" },
  { id: "interrogation", type: "interrogation", width: "1/3", title: "审问", icon: "message-circle" },
  { id: "story-log", type: "story-log", width: "1/4", title: "故事", icon: "book-open" },
  { id: "dossier", type: "dossier", width: "1/4", title: "档案", icon: "clipboard-list" },
  { id: "debug", type: "debug", width: "1/4", title: "调试", icon: "wrench" },
];
