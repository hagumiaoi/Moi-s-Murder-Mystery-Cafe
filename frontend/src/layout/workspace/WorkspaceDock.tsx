import type { WorkspaceColumn } from "./types";

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
      {columns.map((col, i) => (
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
            background: i === activeIndex ? "rgba(255, 255, 255, 0.08)" : "transparent",
            color: i === activeIndex ? "#d4a574" : "rgba(255, 255, 255, 0.4)",
            cursor: "pointer",
            fontSize: 11,
            fontFamily: "inherit",
            padding: "4px 8px",
            transition: "background 0.15s, color 0.15s",
          }}
        >
          <span style={{ fontSize: 18 }}>{col.icon}</span>
          <span>{col.title}</span>
        </button>
      ))}
    </div>
  );
}
