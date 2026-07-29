// components/RoundtableEntrance.js
// 圆桌进场动画：许安和=小花飘落，余生=代码光标闪烁。1.5s 后自动消失。
import { useEffect, useState } from "react";

export default function RoundtableEntrance({ joining }) {
  const isAnhe = joining === "anhe";
  const [petals] = useState(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i,
      left: 10 + Math.random() * 80,
      delay: Math.random() * 0.8,
      dur: 1.2 + Math.random() * 0.8,
      rot: Math.random() * 360,
    }))
  );

  return (
    <div style={{
      position: "relative", padding: "16px 12px", textAlign: "center",
      background: isAnhe ? "linear-gradient(135deg,#fff8fb,#fff0f5)" : "linear-gradient(135deg,#f2f9ff,#eef7ff)",
      borderRadius: 16, overflow: "hidden", border: `1px solid ${isAnhe ? "rgba(224,150,176,0.3)" : "rgba(90,160,208,0.3)"}`,
    }}>
      {isAnhe ? (
        // 许安和：小花飘落
        <>
          {petals.map(p => (
            <span key={p.id} style={{
              position: "absolute", top: -10, left: `${p.left}%`, fontSize: 14,
              animation: `petalFall ${p.dur}s ease-in ${p.delay}s infinite`,
              transform: `rotate(${p.rot}deg)`,
            }}>🌸</span>
          ))}
          <div style={{ fontSize: 14, fontWeight: 600, color: "#c46b82", position: "relative", zIndex: 1 }}>
            🤍 许安和正在赶来…
          </div>
        </>
      ) : (
        // 余生：代码光标闪烁
        <div style={{ fontFamily: "monospace", fontSize: 14, color: "#2f7cae", fontWeight: 600 }}>
          <span>💙 余生正在赶来</span>
          <span style={{ animation: "cursorBlink 0.8s step-end infinite", marginLeft: 2 }}>▊</span>
        </div>
      )}
      <style>{`
        @keyframes petalFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(60px) rotate(180deg); opacity: 0; }
        }
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
      `}</style>
    </div>
  );
}
