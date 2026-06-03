interface StoryPanelProps {
  stories: string[];
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function StoryPanel({ stories, collapsed, onToggleCollapse }: StoryPanelProps) {
  return (
    <div className={`story-section ${collapsed ? "collapsed" : ""}`}>
      <div className="section-header" onClick={onToggleCollapse}>
        <span>📖 正文</span>
        <span className="collapse-icon">{collapsed ? "▶" : "▼"}</span>
      </div>
      {!collapsed && (
        <div className="story-content">
          {stories.length === 0 && (
            <p className="story-empty">故事尚未开始...</p>
          )}
          {stories.map((s, i) => (
            <p key={i} className="story-paragraph">{s}</p>
          ))}
        </div>
      )}
    </div>
  );
}
