import type { StoryEntry } from "../types";
import { BookOpen, Brain } from "../layout/workspace/icons";

interface StoryPanelProps {
  stories: (string | StoryEntry)[];
  collapsed: boolean;
  onToggleCollapse: () => void;
  streamingStory?: string;
  hideToggle?: boolean;
}

export default function StoryPanel({ stories, collapsed, onToggleCollapse, streamingStory, hideToggle }: StoryPanelProps) {
  const hasStreaming = streamingStory && streamingStory.length > 0;
  return (
    <div className={`story-section ${collapsed ? "collapsed" : ""}`}>
      {hideToggle ? (
        <div className="section-header" style={{ cursor: "default" }}>
          <span><BookOpen size={14} className="icon-inline" style={{ marginRight: 4 }} />正文</span>
        </div>
      ) : (
        <div className="section-header" onClick={onToggleCollapse}>
          <span><BookOpen size={14} className="icon-inline" style={{ marginRight: 4 }} />正文</span>
          <span className="collapse-icon">{collapsed ? "▶" : "▼"}</span>
        </div>
      )}
      {!collapsed && (
        <div className="story-content">
          {stories.length === 0 && !hasStreaming && (
            <p className="story-empty">故事尚未开始...</p>
          )}
          {stories.map((s, i) => {
            const thinking = getThinking(s);
            const storyText = getStoryText(s);
            return (
              <div key={i} className="story-entry">
                {thinking && (
                  <details className="story-thinking">
                    <summary onClick={(e) => {
                      const details = e.currentTarget.closest('details');
                      if (details && !details.open && !confirm('侦探sama，偷看笨笨AI的内心世界可能会破坏你的游戏体验，如果不是出了bug不建议打开，您确定还要打开吗？')) {
                        e.preventDefault();
                      }
                    }}><Brain size={14} className="icon-inline" style={{ marginRight: 4 }} />思考过程</summary>
                    <div className="thinking-content">{thinking}</div>
                  </details>
                )}
                <p className="story-paragraph">{storyText}</p>
              </div>
            );
          })}
          {hasStreaming && (
            <p className="story-paragraph streaming">{streamingStory}<span className="cursor-blink">|</span></p>
          )}
        </div>
      )}
    </div>
  );
}