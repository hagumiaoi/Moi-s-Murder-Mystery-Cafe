import StoryPanel from "../components/StoryPanel";
import type { PanelProps } from "./registry";

export default function NarrativePanel({ state, streamingStory }: PanelProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <StoryPanel
        stories={state.stories ?? []}
        collapsed={false}
        onToggleCollapse={() => {}}
        streamingStory={streamingStory}
        hideToggle
      />
    </div>
  );
}
