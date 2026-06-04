import type { WorkspaceColumn } from "./types";
import { getIcon } from "./icons";

interface WorkspaceDockProps {
  columns: WorkspaceColumn[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

export function WorkspaceDock({ columns, activeIndex, onSelect }: WorkspaceDockProps) {
  return (
    <div
      style={{
        height: 48,
        display: "flex",
        flexShrink: 0,
        background: "rgba(20, 15, 10, 0.95)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      {columns.map((col, i) => {
        const Icon = getIcon(col.icon);
        const active = i === activeIndex;
        return (
          <button
            key={col.id}
            type="button"
            onClick={() => onSelect(i)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              border: "none",
              background: active ? "rgba(255, 255, 255, 0.08)" : "transparent",
              color: active ? "#d4a574" : "rgba(255, 255, 255, 0.4)",
              cursor: "pointer",
              fontSize: 11,
              fontFamily: "inherit",
              padding: "4px 8px",
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <Icon size={16} strokeWidth={1.5} />
            <span>{col.title}</span>
          </button>
        );
      })}
    </div>
  );
}
