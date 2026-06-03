import type { TimelineEvent } from "../../types";

interface TimelineTabProps {
  events: TimelineEvent[];
}

export default function TimelineTab({ events }: TimelineTabProps) {
  return (
    <div className="timeline-tab">
      {events.length === 0 && <p className="tab-empty">暂无时间线数据</p>}
      {events.map((evt, i) => (
        <div key={i} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">
            <span className="timeline-time">第{evt.day}天 · {evt.time}</span>
            <p className="timeline-event">{evt.event}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
