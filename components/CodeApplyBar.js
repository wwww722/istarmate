export default function CodeApplyBar({ file, code, onApply, onApplyAndRun, onFix }) {
  return (
    <div style={{
      marginTop: 8, padding: "8px 10px", borderRadius: 12,
      background: "linear-gradient(135deg, #f0ffff, #e6fffa)",
      border: "1px solid rgba(109,204,255,0.35)",
      display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
      fontSize: 12.5,
    }}>
      <div style={{ color: "#0a6a6e", fontWeight: 700, marginRight: 4 }}>💻 川 · 代码片段{file ? ` · ${file}` : ""}</div>
      <div style={{ flex: 1 }} />
      {onFix && (
        <button onClick={onFix} style={{
          padding: "6px 12px", borderRadius: 999, border: "none",
          background: "linear-gradient(135deg,#ffb870,#ff8a65)", color: "#fff",
          cursor: "pointer", fontWeight: 600,
        }}>🛠 修复报错并运行</button>
      )}
      {onApply && (
        <button onClick={onApply} style={{
          padding: "6px 14px", borderRadius: 999, border: "1.5px solid rgba(109,204,255,0.4)",
          background: "#fff", color: "#0a6a6e", cursor: "pointer", fontWeight: 600,
        }}>✨ 应用到编辑器</button>
      )}
      {onApplyAndRun && (
        <button onClick={onApplyAndRun} style={{
          padding: "6px 14px", borderRadius: 999, border: "none",
          background: "linear-gradient(135deg,#34d399,#059669)", color: "#fff",
          cursor: "pointer", fontWeight: 700,
        }}>▶️ 应用并运行</button>
      )}
    </div>
  );
}
