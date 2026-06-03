import { useState } from "react";

interface SidebarProps {
  npcs: string[];
  days: number;
  rounds: number;
  maxDays: number;
  roundsPerDay: number;
  currentNpc: string;
  gameOver: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectNpc: (name: string) => void;
  onAccuse: (target: string) => void;
}

export default function Sidebar({
  npcs,
  days,
  rounds,
  maxDays,
  roundsPerDay,
  currentNpc,
  gameOver,
  collapsed,
  onToggleCollapse,
  onSelectNpc,
  onAccuse,
}: SidebarProps) {
  const [accuseTarget, setAccuseTarget] = useState(npcs[0]);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="sidebar-toggle" onClick={onToggleCollapse} title={collapsed ? "展开侧栏" : "折叠侧栏"}>
        {collapsed ? "▶" : "◀"}
      </button>
      {!collapsed && (
        <div className="sidebar-content">
          <h2>📊 当前战局</h2>
          <p>
            <strong>第 {days} / {maxDays} 天</strong>
          </p>
          <p>
            今日已对话轮数: <code>{rounds} / {roundsPerDay}</code>
          </p>

          <hr />

          <h3>👥 选择审问对象</h3>
          <div className="npc-radio-group">
            {npcs.map((name) => (
              <label key={name} className="npc-radio">
                <input
                  type="radio"
                  name="npc"
                  value={name}
                  checked={currentNpc === name}
                  onChange={() => onSelectNpc(name)}
                  disabled={gameOver}
                />
                {name}
              </label>
            ))}
          </div>

          <hr />

          <h3>🚨 终局审判</h3>
          <select
            value={accuseTarget}
            onChange={(e) => setAccuseTarget(e.target.value)}
            disabled={gameOver}
          >
            {npcs.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <button
            className="accuse-btn"
            onClick={() => onAccuse(accuseTarget)}
            disabled={gameOver}
          >
            🔥 发起指认
          </button>
        </div>
      )}
    </aside>
  );
}
