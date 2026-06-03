import { useState } from "react";
import TimelineTab from "./TimelineTab";
import CluesTab from "./CluesTab";
import type { TimelineEvent, ClueEntry } from "../../types";

interface FloatingPanelProps {
  timeline: TimelineEvent[];
  clues: ClueEntry[];
}

type Tab = "timeline" | "clues";

export default function FloatingPanel({ timeline, clues }: FloatingPanelProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("clues");

  return (
    <>
      <button className="fp-toggle" onClick={() => setOpen(!open)} title="线索与时间线">
        <span>📋</span>
      </button>

      {open && (
        <div className="fp-overlay" onClick={() => setOpen(false)} />
      )}

      <div className={`floating-panel ${open ? "open" : ""}`}>
        <div className="fp-header">
          <div className="fp-tabs">
            <button
              className={`fp-tab ${tab === "clues" ? "active" : ""}`}
              onClick={() => setTab("clues")}
            >
              🕵️ 线索 ({clues.length})
            </button>
            <button
              className={`fp-tab ${tab === "timeline" ? "active" : ""}`}
              onClick={() => setTab("timeline")}
            >
              📅 时间线
            </button>
          </div>
          <button className="fp-close" onClick={() => setOpen(false)}>✕</button>
        </div>
        <div className="fp-body">
          {tab === "timeline" && <TimelineTab events={timeline} />}
          {tab === "clues" && <CluesTab clues={clues} />}
        </div>
      </div>
    </>
  );
}
