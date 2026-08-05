// components/ChatBackground.js
// 聊天背景壁纸渲染 + 选择器。纯 CSS 动画。
import { useState } from "react";
import { BACKGROUNDS, getChatBackground, setChatBackground } from "../lib/chatBackgrounds";

// 背景层（放在聊天区最底层）
export function ChatBackdrop({ bgId }) {
  const bg = BACKGROUNDS[bgId] || BACKGROUNDS.morning;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 0, background: bg.bg, overflow: "hidden", pointerEvents: "none" }}>
      {bg.petals && Array.from({ length: 10 }).map((_, i) => (
        <span key={i} style={{
          position: "absolute", top: "-20px", left: `${(i * 10 + 5)}%`, fontSize: 14 + (i % 3) * 4,
          opacity: 0.5, animation: `bgPetal ${6 + (i % 4)}s linear ${i * 0.7}s infinite`,
        }}>{bg.petalEmoji}</span>
      ))}
      {bg.stars && Array.from({ length: 20 }).map((_, i) => (
        <span key={i} style={{
          position: "absolute", top: `${(i * 37) % 90}%`, left: `${(i * 53) % 95}%`, fontSize: 8 + (i % 3) * 3,
          color: "#fff", opacity: 0.6, animation: `bgStar ${2 + (i % 3)}s ease-in-out ${i * 0.3}s infinite`,
        }}>✦</span>
      ))}
      {bg.codeRain && Array.from({ length: 8 }).map((_, i) => (
        <span key={i} style={{
          position: "absolute", top: "-30px", left: `${i * 12 + 4}%`, fontSize: 11, fontFamily: "monospace",
          color: "#3aa9ff", opacity: 0.25, animation: `bgCodeRain ${5 + (i % 3)}s linear ${i * 0.5}s infinite`,
        }}>{["01", "{}", "()", "=>", "01", "[]"][i % 6]}</span>
      ))}
      <style>{`
        @keyframes bgPetal { 0%{transform:translateY(0) rotate(0)} 100%{transform:translateY(110vh) rotate(360deg)} }
        @keyframes bgStar { 0%,100%{opacity:0.2} 50%{opacity:0.8} }
        @keyframes bgCodeRain { 0%{transform:translateY(0);opacity:0.3} 100%{transform:translateY(110vh);opacity:0} }
      `}</style>
    </div>
  );
}

// 背景选择器（放设置里）
export function ChatBackgroundPicker({ onPick }) {
  const [cur, setCur] = useState(getChatBackground());
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {Object.values(BACKGROUNDS).map(b => (
        <button key={b.id} onClick={() => { setChatBackground(b.id); setCur(b.id); onPick?.(b.id); }}
          style={{
            padding: "14px 12px", borderRadius: 14, cursor: "pointer", textAlign: "left",
            border: cur === b.id ? "2px solid var(--purple)" : "1px solid var(--line)",
            background: b.bg, color: b.dark ? "#fff" : "var(--ink)",
          }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{b.name}</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{b.desc}</div>
        </button>
      ))}
    </div>
  );
}
