import { useState, useRef, useEffect } from "react";
import type { PanelProps } from "./registry";
import { Search, ChartBar } from "../layout/workspace/icons";

export default function EntityListPanel({ script, state, gameActions }: PanelProps) {
  const personEntities = (script.entities ?? []).filter((e) => e.kind === "person" && !e.starts_hidden);
  const placeEntities = (script.entities ?? []).filter((e) => e.kind === "place" && e.tags?.includes("can-search"));

  const locations = placeEntities.map((e) => ({
    id: e.id,
    name: e.name,
    description: e.description ?? "",
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {script.progression && script.progression.type === "daily-rounds" && (
          <p>第 {state.phase + 1} 天 · 今日 {state.step} 轮</p>
        )}
        <hr />
        <h3><ChartBar size={14} style={{ marginRight: 4, display: "inline" }} />审问对象</h3>
        <div className="npc-radio-group">
          {personEntities.map((e) => (
            <label key={e.id} className="npc-radio">
              <input
                type="radio"
                name="entity"
                value={e.id}
                checked={state.current_entity === e.id}
                onChange={async () => {
                  await gameActions.selectEntity(e.name);
                }}
                disabled={state.game_over}
              />
              {e.name}
            </label>
          ))}
        </div>
        <hr />
        <SearchDropdown
          locations={locations}
          gameOver={state.game_over}
          onSearch={async (id) => {
            await gameActions.search(id);
          }}
        />
      </div>
    </div>
  );
}

function SearchDropdown({ locations, gameOver, onSearch }: { locations: { id: string; name: string; description: string }[]; gameOver: boolean; onSearch: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="search-toggle-btn" type="button" onClick={() => setOpen(!open)} disabled={gameOver} style={{ width: "100%" }}><Search size={14} /> 搜集线索（消耗1轮）</button>
      {open && (
        <div className="search-dropdown">
          {locations.length === 0 ? (
            <div style={{ padding: 8, opacity: 0.6 }}>无可搜查地点</div>
          ) : (
            locations.map((loc) => (
              <button key={loc.id} className="search-location-btn" type="button" onClick={() => { onSearch(loc.id); setOpen(false); }}>
                <strong>{loc.name}</strong><span className="loc-desc">{loc.description}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
