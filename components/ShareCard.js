// components/ShareCard.js - 改用SVG生成分享卡片，避免Canvas字体问题
import { useRef, useEffect, useState } from "react";

const DOMAIN_ICONS = { mood: "🌤️", stress: "⚡", energy: "🔋", social: "🤝" };
const LEVEL_COLORS = ["#1D9E75", "#EF9F27", "#D85A30"];
const LEVEL_LABELS = ["平稳", "留意", "需关心"];

export default function ShareCard({ profile, domains, stateTitle, stateEmoji, onClose }) {
  const svgRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    // 用html2canvas降级：直接把卡片DOM转图片
    // 这里改为直接显示可截图的卡片，不用canvas
    setImgUrl("ready");
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      {/* 可截图的卡片 */}
      <div ref={svgRef} style={{
        width: 320, borderRadius: 24, overflow: "hidden",
        background: "linear-gradient(160deg, #8B7FD9 0%, #6B9EE8 100%)",
        boxShadow: "0 24px 60px rgba(0,0,0,0.4)",
        marginBottom: 16,
      }}>
        {/* 头部 */}
        <div style={{ padding: "28px 24px 20px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: "0 0 6px", letterSpacing: ".06em" }}>IStarMate · 情绪自评</p>
          <div style={{ fontSize: 52, margin: "10px 0 6px" }}>{profile?.avatar_emoji || "💟"}</div>
          <p style={{ color: "#fff", fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>{profile?.avatar_name} #{profile?.avatar_code}</p>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, margin: 0 }}>我现在的状态是</p>
          <div style={{ fontSize: 44, margin: "12px 0 4px" }}>{stateEmoji}</div>
          <p style={{ color: "#fff", fontSize: 20, fontWeight: 700, margin: 0 }}>{stateTitle}</p>
        </div>

        {/* 分割 */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.15)", margin: "0 24px" }} />

        {/* 四维度 */}
        <div style={{ padding: "16px 24px 24px" }}>
          {(domains || []).map((d, i) => {
            const pct = d.pct || 0;
            const level = d.level || 0;
            return (
              <div key={i} style={{ marginBottom: i < domains.length - 1 ? 12 : 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                  <span style={{ color: "rgba(255,255,255,0.9)", fontSize: 13 }}>
                    {DOMAIN_ICONS[d.key]} {d.name}
                  </span>
                  <span style={{ color: LEVEL_COLORS[level], fontSize: 12, fontWeight: 500 }}>{LEVEL_LABELS[level]}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.2)" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 3, background: LEVEL_COLORS[level] }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部 */}
        <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px 24px", textAlign: "center" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, margin: 0 }}>istarmate.vercel.app</p>
        </div>
      </div>

      <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 14 }}>📸 长按卡片截图保存，分享给朋友</p>

      <button onClick={onClose} style={{
        padding: "11px 32px", borderRadius: 14, border: "1.5px solid rgba(255,255,255,0.3)",
        background: "transparent", color: "#fff", cursor: "pointer", fontSize: 14,
      }}>关闭</button>
    </div>
  );
}
