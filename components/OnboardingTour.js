// components/OnboardingTour.js
import { useState, useEffect } from "react";

const STEPS = [
  { emoji: "📊", title: "先做情绪自评", desc: "15题小问卷，帮星伴了解你最近的状态", color: "#8B7FD9" },
  { emoji: "☀️", title: "每天打卡心情", desc: "记录每天的状态，看自己的情绪趋势图", color: "#EF9F27" },
  { emoji: "💬", title: "和星伴聊聊", desc: "每天有小剧场，随时可以找星伴倾诉", color: "#1D9E75" },
];

export default function OnboardingTour({ onDone }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem("istarmate_tour_done");
    if (!seen) setVisible(true);
  }, []);

  function next() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  }

  function finish() {
    localStorage.setItem("istarmate_tour_done", "1");
    setVisible(false);
    onDone?.();
  }

  if (!visible) return null;

  const s = STEPS[step];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 300, padding: 24,
    }}>
      <div style={{
        background: "#fff", borderRadius: 22, padding: "32px 26px",
        maxWidth: 340, width: "100%", textAlign: "center",
        boxShadow: "0 24px 60px rgba(0,0,0,0.25)",
        animation: "popIn .3s ease",
      }}>
        {/* 步骤指示点 */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 24 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{
              width: i === step ? 20 : 8, height: 8, borderRadius: 4,
              background: i === step ? s.color : "#E7E1D4",
              transition: "all .3s",
            }} />
          ))}
        </div>

        <div style={{ fontSize: 52, marginBottom: 14 }}>{s.emoji}</div>
        <h3 style={{ fontSize: 20, margin: "0 0 10px" }}>{s.title}</h3>
        <p style={{ color: "#6E6C8A", fontSize: 14.5, lineHeight: 1.7, margin: "0 0 28px" }}>{s.desc}</p>

        <button
          onClick={next}
          style={{
            width: "100%", padding: "13px", borderRadius: 14, border: "none",
            background: s.color, color: "#fff", fontSize: 15, cursor: "pointer", marginBottom: 10,
          }}
        >
          {step < STEPS.length - 1 ? "下一步 →" : "开始使用 →"}
        </button>
        <button onClick={finish} style={{ background: "none", border: "none", color: "#8A84A3", fontSize: 13, cursor: "pointer" }}>
          跳过
        </button>
      </div>
      <style>{`@keyframes popIn { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }`}</style>
    </div>
  );
}
