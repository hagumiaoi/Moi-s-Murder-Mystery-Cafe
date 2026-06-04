import type { PanelProps } from "./registry";

export default function UnknownPanel({ panel }: PanelProps) {
  return (
    <div style={{ padding: 16, opacity: 0.6 }}>
      <p>未知面板类型: {panel.type}</p>
      <p style={{ fontSize: 13 }}>该面板类型未在前端注册，请检查 manifest.json 中的 panels 配置。</p>
    </div>
  );
}
