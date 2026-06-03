import type { ClueEntry } from "../../types";

interface CluesTabProps {
  clues: ClueEntry[];
}

export default function CluesTab({ clues }: CluesTabProps) {
  return (
    <div className="clues-tab">
      {clues.length === 0 && <p className="tab-empty">尚未发现任何线索，快去搜索吧</p>}
      {[...clues].reverse().map((c, i) => (
        <div key={i} className="clue-card">
          <div className="clue-header">
            <span className="clue-location">📍 {c.location_name}</span>
          </div>
          <p className="clue-scene">{c.scene}</p>
          <div className="clue-divider" />
          <p className="clue-text">🔍 {c.clue}</p>
        </div>
      ))}
    </div>
  );
}
