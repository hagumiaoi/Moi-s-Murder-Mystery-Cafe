import { useState } from "react";
import type { PanelProps } from "./registry";

export default function ResolutionPanel({ script, state, gameActions }: PanelProps) {
  const questions = script.questions ?? [];
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);

  const hasAnswer = (answer: string | string[] | undefined) => {
    return Array.isArray(answer) ? answer.length > 0 : Boolean(answer);
  };

  const toggleArrayAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [questionId]: next };
    });
  };

  if (questions.length === 0) {
    return (
      <div style={{ padding: 16, opacity: 0.6 }}>
        <p>当前剧本没有结案问题。</p>
      </div>
    );
  }

  const filledCount = questions.filter((q) => hasAnswer(answers[q.id])).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <h3>结案提交 ({filledCount}/{questions.length})</h3>
        {questions.map((q) => (
          <div key={q.id} style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: "bold" }}>
              {q.title}{q.required ? " *" : ""}
            </label>
            {q.type === "single-entity" ? (
              <select
                value={typeof answers[q.id] === "string" ? answers[q.id] : ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">-- 选择 --</option>
                {(script.entities ?? []).map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            ) : q.type === "multi-entity" ? (
              <div style={{ display: "grid", gap: 6 }}>
                {(script.entities ?? []).map((e) => {
                  const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                  return (
                    <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={current.includes(e.id)}
                        onChange={() => toggleArrayAnswer(q.id, e.id)}
                      />
                      {e.name}
                    </label>
                  );
                })}
              </div>
            ) : q.type === "choice" && q.options ? (
              <select
                value={typeof answers[q.id] === "string" ? answers[q.id] : ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                style={{ width: "100%", padding: 8 }}
              >
                <option value="">-- 选择 --</option>
                {q.options.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            ) : q.type === "evidence-set" ? (
              <div style={{ display: "grid", gap: 6 }}>
                {(script.evidence ?? []).length === 0 && <p style={{ opacity: 0.6, margin: 0 }}>尚无可选证据。</p>}
                {(script.evidence ?? []).map((e) => {
                  const current = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                  return (
                    <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        type="checkbox"
                        checked={current.includes(e.id)}
                        onChange={() => toggleArrayAnswer(q.id, e.id)}
                      />
                      {e.title}
                    </label>
                  );
                })}
              </div>
            ) : (
              <input
                className="chat-input"
                value={typeof answers[q.id] === "string" ? answers[q.id] : ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="输入你的答案..."
                style={{ width: "100%" }}
              />
            )}
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 12px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
        <button
          className="accuse-btn"
          onClick={async () => {
            const resolutionAnswers = questions
              .filter((q) => hasAnswer(answers[q.id]))
              .map((q) => {
                const answer = answers[q.id];
                return { question_id: q.id, answer: Array.isArray(answer) ? answer : (answer ?? "") };
              });

            if (resolutionAnswers.length === 0) return;

            setSubmitted(true);
            try {
              await gameActions.submitResolution(resolutionAnswers);
            } catch {} finally {
              setSubmitted(false);
            }
          }}
          disabled={state.game_over || submitted || filledCount === 0}
          style={{ width: "100%" }}
        >
          {submitted ? "提交中..." : `提交结案 (${filledCount} 题)`}
        </button>
      </div>
    </div>
  );
}
