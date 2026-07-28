import { CHARACTER_LIST } from "../lib/characters";

export default function CharacterSwitcher({ active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 6, padding: 4, borderRadius: 999,
      background: "rgba(124,111,224,0.08)",
      border: "1px solid rgba(124,111,224,0.12)",
    }}>
      {CHARACTER_LIST.map(c => {
        const on = active === c.id;
        return (
          <button key={c.id} onClick={() => onChange && onChange(c.id)} title={c.desc} style={{
            flex: 1, minWidth: 70, padding: "6px 10px", borderRadius: 999,
            background: on ? "linear-gradient(135deg,#fff,#f6eeff)" : "transparent",
            border: on ? "1.5px solid rgba(124,111,224,0.5)" : "1.5px solid transparent",
            color: on ? "#4b42b4" : "#666",
            fontWeight: on ? 700 : 500, fontSize: 13, cursor: "pointer",
            transition: "all .15s ease",
            boxShadow: on ? "0 4px 14px rgba(124,111,224,0.18)" : "none",
          }}>
            <span style={{ marginRight: 4 }}>{c.emoji}</span>{c.displayName}
          </button>
        );
      })}
    </div>
  );
}
