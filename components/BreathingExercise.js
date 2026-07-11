// components/BreathingExercise.js
// 4-7-8 呼吸法引导动画：吸气4秒 → 屏息7秒 → 呼气8秒
import { useState, useEffect, useRef } from "react";

const PHASES = [
  { name: "吸气", duration: 4, scale: 1.5, color: "#7C6FE0", hint: "用鼻子慢慢吸气" },
  { name: "屏息", duration: 7, scale: 1.5, color: "#6B9EE8", hint: "轻轻屏住呼吸" },
  { name: "呼气", duration: 8, scale: 1.0, color: "#3FA796", hint: "用嘴巴缓缓呼气" },
];

export default function BreathingExercise({ onClose }) {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [countdown, setCountdown] = useState(PHASES[0].duration);
  const [cycles, setCycles] = useState(0);
  const [started, setStarted] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!started) return;
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setPhaseIndex(pi => {
            const next = (pi + 1) % PHASES.length;
            if (next === 0) setCycles(c => c + 1);
            return next;
          });
          return null; // 会在下面的effect里重置
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [started]);

  // 切换阶段时重置倒计时
  useEffect(() => {
    if (started) setCountdown(PHASES[phaseIndex].duration);
  }, [phaseIndex, started]);

  const phase = PHASES[phaseIndex];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "linear-gradient(160deg, #2a2545 0%, #1a1730 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 24,
    }}>
      <button onClick={onClose} style={{
        position: "absolute", top: 20, right: 20,
        background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
        width: 40, height: 40, borderRadius: "50%", cursor: "pointer", fontSize: 20,
      }}>×</button>

      {!started ? (
        <div style={{ textAlign: "center", maxWidth: 320 }}>
          <div style={{ fontSize: 52, marginBottom: 20 }}>🌬️</div>
          <h2 style={{ color: "#fff", fontSize: 24, marginBottom: 12 }}>478 呼吸练习</h2>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, lineHeight: 1.8, marginBottom: 32 }}>
            当你感到紧张或难受时，<br />
            跟着节奏呼吸，能帮你慢慢平静下来。<br /><br />
            吸气 4 秒 · 屏息 7 秒 · 呼气 8 秒
          </p>
          <button onClick={() => setStarted(true)} style={{
            background: "linear-gradient(135deg, #9B8FF0, #7C6FE0)", color: "#fff", border: "none",
            padding: "14px 40px", borderRadius: 16, fontSize: 16, cursor: "pointer", fontWeight: 500,
            boxShadow: "0 8px 24px rgba(124,111,224,0.4)",
          }}>
            开始
          </button>
        </div>
      ) : (
        <div style={{ textAlign: "center" }}>
          {/* 呼吸圆 */}
          <div style={{
            width: 200, height: 200, borderRadius: "50%",
            margin: "0 auto 40px",
            background: `radial-gradient(circle, ${phase.color}88 0%, ${phase.color}33 70%)`,
            border: `2px solid ${phase.color}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transform: `scale(${phase.scale})`,
            transition: `transform ${phase.duration}s ease-in-out`,
            boxShadow: `0 0 60px ${phase.color}66`,
          }}>
            <div style={{ transform: `scale(${1 / phase.scale})`, transition: `transform ${phase.duration}s ease-in-out` }}>
              <p style={{ color: "#fff", fontSize: 28, fontWeight: 700, margin: 0 }}>{countdown ?? phase.duration}</p>
            </div>
          </div>

          <h3 style={{ color: "#fff", fontSize: 26, margin: "0 0 8px" }}>{phase.name}</h3>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 15, margin: "0 0 24px" }}>{phase.hint}</p>

          {cycles > 0 && (
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13 }}>已完成 {cycles} 轮</p>
          )}

          {cycles >= 3 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, marginBottom: 14 }}>
                做得很好，感觉好一点了吗？
              </p>
              <button onClick={onClose} style={{
                background: "rgba(255,255,255,0.15)", color: "#fff", border: "none",
                padding: "11px 28px", borderRadius: 14, fontSize: 14.5, cursor: "pointer",
              }}>
                结束练习
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
