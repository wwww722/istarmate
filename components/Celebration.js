// components/Celebration.js
// 庆祝时刻：做出第一个作品、第一次运行成功时，放大那个兴奋的瞬间
import { useEffect, useState } from "react";

const COLORS = ["#7C6FE0", "#3FA796", "#E0C068", "#E89B6C", "#B8AEFF", "#5AC8B0"];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 1.8 + Math.random() * 1.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      rotate: Math.random() * 360,
    }))
  );

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9998, overflow: "hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: "absolute",
          left: `${p.left}%`,
          top: "-20px",
          width: p.size,
          height: p.size * 0.6,
          background: p.color,
          borderRadius: 2,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          transform: `rotate(${p.rotate}deg)`,
        }} />
      ))}
      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export default function Celebration({ title, message, emoji = "🎉", onClose, onShare }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
    // 触发音效和震动
    import("../lib/feedback").then(({ feedback }) => feedback.achievement?.()).catch(() => {});
    if (navigator.vibrate) navigator.vibrate([40, 30, 60]);
  }, []);

  return (
    <>
      <Confetti />
      <div onClick={onClose}
        style={{ position: "fixed", inset: 0, background: "rgba(20,18,31,0.55)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div onClick={e => e.stopPropagation()}
          style={{
            background: "var(--card-solid)", borderRadius: 24, padding: "32px 28px", maxWidth: 360, width: "100%", textAlign: "center",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            transform: show ? "scale(1)" : "scale(0.8)", opacity: show ? 1 : 0,
            transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}>
          <div style={{ fontSize: 56, marginBottom: 12, animation: "bounceIn 0.6s ease" }}>{emoji}</div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 8px", background: "linear-gradient(135deg, #7C6FE0, #3FA796)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {title}
          </h2>
          <p style={{ fontSize: 14.5, color: "var(--ink-soft)", margin: "0 0 24px", lineHeight: 1.6 }}>{message}</p>

          <div style={{ display: "flex", gap: 10 }}>
            {onShare && (
              <button onClick={onShare}
                style={{ flex: 1, padding: "12px", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #9B8FF0, #7C6FE0)", color: "#fff", fontSize: 14.5, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 16px rgba(124,111,224,0.4)" }}>
                🎁 炫耀一下
              </button>
            )}
            <button onClick={onClose}
              style={{ flex: onShare ? "0 0 auto" : 1, padding: "12px 20px", borderRadius: 14, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", fontSize: 14.5, cursor: "pointer" }}>
              继续
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0); }
          60% { transform: scale(1.2); }
          100% { transform: scale(1); }
        }
      `}</style>
    </>
  );
}
