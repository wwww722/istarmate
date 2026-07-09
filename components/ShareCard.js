// components/ShareCard.js
import { useEffect, useRef, useState } from "react";

const DOMAIN_ICONS = { mood: "🌤️", stress: "⚡", energy: "🔋", social: "🤝" };
const DOMAIN_NAMES = { mood: "情绪状态", stress: "压力指数", energy: "活力能量", social: "人际连接" };
const LEVEL_LABELS = ["平稳", "留意", "需关心"];
const LEVEL_COLORS = ["#1D9E75", "#EF9F27", "#D85A30"];

export default function ShareCard({ profile, domains, stateTitle, stateEmoji, onClose }) {
  const canvasRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 640, H = 900;
    canvas.width = W;
    canvas.height = H;

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#8B7FD9");
    grad.addColorStop(1, "#6B5EC7");
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 30);
    ctx.fill();

    // 白色卡片区
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.roundRect(30, 30, W - 60, H - 60, 20);
    ctx.fill();

    // Logo/品牌
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("IStarMate", W / 2, 90);

    // 动物代号
    ctx.font = "32px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(profile?.avatar_emoji || "💟", W / 2, 160);

    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(`${profile?.avatar_name || ""} #${profile?.avatar_code || ""}`, W / 2, 200);

    // 状态标签
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "18px sans-serif";
    ctx.fillText("我现在的状态是", W / 2, 255);

    // 大emoji
    ctx.font = "60px sans-serif";
    ctx.fillText(stateEmoji || "🌟", W / 2, 340);

    // 状态标题
    ctx.font = "bold 34px sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(stateTitle || "", W / 2, 395);

    // 分割线
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 430); ctx.lineTo(W - 80, 430);
    ctx.stroke();

    // 四维度
    const startY = 460;
    (domains || []).forEach((d, i) => {
      const y = startY + i * 95;
      const icon = DOMAIN_ICONS[d.key] || "•";
      const name = DOMAIN_NAMES[d.key] || d.name;
      const level = d.level || 0;
      const pct = d.pct || 0;

      // 图标+名称
      ctx.font = "22px sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(icon, 70, y + 18);

      ctx.font = "bold 18px sans-serif";
      ctx.fillStyle = "#fff";
      ctx.fillText(name, 100, y + 18);

      // 标签
      ctx.font = "14px sans-serif";
      ctx.textAlign = "right";
      ctx.fillStyle = LEVEL_COLORS[level];
      ctx.fillText(LEVEL_LABELS[level], W - 70, y + 18);

      // 进度条背景
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.roundRect(70, y + 30, W - 140, 10, 5);
      ctx.fill();

      // 进度条
      ctx.fillStyle = LEVEL_COLORS[level];
      if (pct > 0) {
        ctx.roundRect(70, y + 30, (W - 140) * (pct / 100), 10, 5);
        ctx.fill();
      }
    });

    // 底部文字
    ctx.textAlign = "center";
    ctx.font = "16px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText("用 IStarMate 了解自己的情绪状态", W / 2, H - 60);
    ctx.fillText("istarmate.vercel.app", W / 2, H - 35);

    setImgUrl(canvas.toDataURL("image/png"));
  }, [profile, domains, stateTitle, stateEmoji]);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 20,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ maxWidth: 340, width: "100%", textAlign: "center" }}>
        {imgUrl && (
          <img src={imgUrl} alt="状态卡片" style={{ width: "100%", borderRadius: 16, marginBottom: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }} />
        )}
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 16 }}>长按图片保存，分享给朋友</p>
        <div style={{ display: "flex", gap: 10 }}>
          {imgUrl && (
            <a href={imgUrl} download="istarmate-status.png"
              style={{ flex: 1, padding: "12px", borderRadius: 12, background: "var(--purple, #8B7FD9)", color: "#fff", textDecoration: "none", textAlign: "center", fontSize: 14 }}>
              💾 保存图片
            </a>
          )}
          <button onClick={onClose}
            style={{ flex: 1, padding: "12px", borderRadius: 12, background: "rgba(255,255,255,0.15)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14 }}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
