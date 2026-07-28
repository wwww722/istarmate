// components/ModelSwitcher.js
// 人格/模型切换器：自动 / 豆包陪伴 / Claude代码 / GPT深度
import { PERSONA_LIST_FOR_UI } from "../lib/modelMatrix";

export default function ModelSwitcher({ active, onChange, compact }) {
  return (
    <div style={{
      display: "flex", gap: compact ? 4 : 6, padding: compact ? 3 : 4,
      borderRadius: 999, background: "rgba(124,111,224,0.06)",
      border: "1px solid rgba(124,111,224,0.1)",
      fontSize: compact ? 11.5 : 12.5,
      flexWrap: "wrap",
    }}>
      {PERSONA_LIST_FOR_UI.map(m => {
        const on = active === m.id;
        return (
          <button key={m.id} onClick={() => onChange && onChange(m.id)} title={m.tagline} style={{
            padding: compact ? "4px 9px" : "5px 12px", borderRadius: 999,
            background: on ? "linear-gradient(135deg,#faf7ff,#f2eaff)" : "transparent",
            border: on ? "1.5px solid rgba(124,111,224,0.5)" : "1.5px solid transparent",
            color: on ? "#4b42b4" : "#555",
            fontWeight: on ? 700 : 500,
            cursor: "pointer", whiteSpace: "nowrap",
            boxShadow: on ? "0 3px 10px rgba(124,111,224,0.15)" : "none",
            transition: "all .15s ease",
          }}>
            <span style={{ marginRight: compact ? 2 : 4 }}>{m.emoji}</span>
            {m.displayName}
          </button>
        );
      })}
    </div>
  );
}
