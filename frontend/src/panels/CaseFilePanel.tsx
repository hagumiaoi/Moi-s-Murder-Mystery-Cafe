import type { PanelProps } from "./registry";
import { Binoculars, Users } from "../layout/workspace/icons";

export default function CaseFilePanel({ script, state, panel }: PanelProps) {
  const sections = panel.sections ?? ["status", "evidence", "facts", "entities"];
  const personEntities = (script.entities ?? []).filter((e) => e.kind === "person");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {sections.includes("status") && (
          <>
            <h3>进度</h3>
            <p>第 {state.phase + 1} 天 · {state.step} 轮 · {state.game_over ? "已结束" : "进行中"}</p>
            {state.ending && <p>结局: {state.ending}</p>}
            <hr />
          </>
        )}

        {sections.includes("evidence") && (
          <>
            <h3><Binoculars size={14} style={{ marginRight: 4, display: "inline" }} />线索 ({state.clues.length})</h3>
            {state.clues.length === 0 && <p>尚无发现的线索。</p>}
            {state.clues.map((c, i) => (
              <div key={i} style={{ marginBottom: 8, padding: 8, background: "rgba(255,255,255,0.03)", borderRadius: 4 }}>
                <strong>{c.location_name}</strong>: {c.clue}
              </div>
            ))}
            <hr />
          </>
        )}

        {sections.includes("facts") && script.facts && (
          <>
            <h3>已知事实 ({script.facts.length})</h3>
            {script.facts.map((f) => (
              <div key={f.id} style={{ marginBottom: 4, fontSize: 13 }}>
                {f.time && <span style={{ opacity: 0.6, marginRight: 4 }}>[{f.time}]</span>}
                {f.statement}
                {f.visibility === "revealed" && <span style={{ marginLeft: 4, color: "#8b7355", fontSize: 11 }}>(已揭示)</span>}
              </div>
            ))}
            <hr />
          </>
        )}

        {sections.includes("entities") && (
          <>
            <h3><Users size={14} style={{ marginRight: 4, display: "inline" }} />人物 ({personEntities.length})</h3>
            {personEntities.map((e) => (
              <div key={e.id} style={{ marginBottom: 4, fontSize: 13, opacity: state.current_entity === e.id ? 1 : 0.7 }}>
                {state.current_entity === e.id ? "● " : "○ "}{e.name}
              </div>
            ))}
            <hr />
          </>
        )}

        {sections.includes("questions") && script.questions && (
          <>
            <h3>结案问题</h3>
            {script.questions.map((q) => (
              <div key={q.id} style={{ marginBottom: 4, fontSize: 13 }}>
                <strong>{q.title}</strong>{q.required ? " *" : ""}
                {q.description && <span style={{ opacity: 0.6 }}> — {q.description}</span>}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
