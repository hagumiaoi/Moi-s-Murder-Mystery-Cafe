interface NarrationLogProps {
  logs: string[];
}

export default function NarrationLog({ logs }: NarrationLogProps) {
  return (
    <div className="narration-log">
      <h2>📜 环境线索与旁白</h2>
      <div className="log-entries">
        {[...logs].reverse().map((log, i) => (
          <div key={i} className="log-entry">
            {log}
          </div>
        ))}
        {logs.length === 0 && (
          <p className="log-empty">暂无记录...</p>
        )}
      </div>
    </div>
  );
}
