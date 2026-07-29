// components/ReasoningStream.js
// AI 思考过程流式展示
// - 部分模型会用 <think>...</think> 包裹思考过程
// - 此组件在聊天消息上方渲染一个可折叠的「💭 正在想...」思考卡片
import { useEffect, useState } from "react";

export default function ReasoningStream({ content, character }) {
  const [open, setOpen] = useState(true);
  // 从 content 中剥离出 <think> 标签包裹的思考
  const parts = splitReasoning(content || "");
  if (!parts.reasoning) return null;
  return (
    <div style={{
      marginTop: 4, marginBottom: 8, borderRadius: 14,
      background: "linear-gradient(135deg, rgba(124,111,224,0.08), rgba(255,111,179,0.07))",
      border: "1px dashed rgba(124,111,224,0.35)",
      overflow: "hidden",
    }}>
      <button onClick={() => setOpen(!open)} style={{
        width: "100%", padding: "8px 12px", display: "flex", alignItems: "center",
        gap: 8, background: "transparent", border: "none", cursor: "pointer",
        color: "#4b42b4", fontSize: 12.5, fontWeight: 600,
      }}>
        <span>{character?.emoji || "💭"}</span>
        <span>{character?.displayName || "AI"} 正在想（可折叠）</span>
        <span style={{ marginLeft: "auto", fontSize: 11 }}>{open ? "收起 ▲" : "展开 ▼"}</span>
      </button>
      {open && (
        <div style={{
          padding: "10px 14px", color: "#4b4566", fontSize: 12.5, lineHeight: 1.7,
          background: "rgba(255,255,255,0.45)", borderTop: "1px dashed rgba(124,111,224,0.25)",
          whiteSpace: "pre-wrap", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}>
          {parts.reasoning.endsWith("…") ? parts.reasoning : parts.reasoning}
          {!parts.reasoning.endsWith("…") && !parts.reasoningDone && <ReasoningDots />}
        </div>
      )}
    </div>
  );
}

function ReasoningDots() {
  return (
    <span style={{ display: "inline-block", marginLeft: 4 }}>
      <span style={{ animation: "rdot 1.2s infinite 0s",   display:"inline-block" }}>.</span>
      <span style={{ animation: "rdot 1.2s infinite .15s", display:"inline-block" }}>.</span>
      <span style={{ animation: "rdot 1.2s infinite .3s",  display:"inline-block" }}>.</span>
      <style>{`@keyframes rdot { 0%,60%,100% { opacity: .25 } 30% { opacity: 1 } }`}</style>
    </span>
  );
}

// 工具：剥离 <think>...</think>
// 返回 { reasoning, reasoningDone, answer }
export function splitReasoning(raw) {
  const s = String(raw || "");
  const m1 = s.indexOf("<think>");
  const m2 = s.indexOf("</think>");
  if (m1 < 0) return { reasoning: "", reasoningDone: false, answer: s };
  const start = m1 + 7;
  let r, a, done = false;
  if (m2 > start) { r = s.slice(start, m2); a = s.slice(m2 + 8); done = true; }
  else { r = s.slice(start); a = ""; }
  return { reasoning: r.trim(), reasoningDone: done, answer: a.trim() };
}
