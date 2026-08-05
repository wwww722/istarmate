// components/PersonaSkeleton.js
// 三套人格骨架屏：许安和樱花 / 余生代码光标 / 中性 logo。纯 CSS 动画。
import { useEffect, useState } from "react";

const XU_LINES = ["许安和正在泡一杯热奶茶…", "许安和在窗边等你…", "许安和整理了你上次说的事…"];
const YU_LINES = ["余生正在启动沙盒引擎…", "余生拉取最新模板…", "余生检查你上次的 bug 修了没…"];
const CODE_SNIPPETS = ["const hello = () => {", "  return <div>你好</div>;", "}", "npm run dev ✓", "> ready on :3000"];

export default function PersonaSkeleton({ persona = "neutral" }) {
  const [lineIdx, setLineIdx] = useState(0);
  const [codeIdx, setCodeIdx] = useState(0);
  const lines = persona === "xu_anhe" ? XU_LINES : persona === "yusheng" ? YU_LINES : ["启航中…"];

  useEffect(() => {
    const t = setInterval(() => setLineIdx(i => (i + 1) % lines.length), 2000);
    return () => clearInterval(t);
  }, [lines.length]);

  useEffect(() => {
    if (persona !== "yusheng") return;
    const t = setInterval(() => setCodeIdx(i => (i + 1) % CODE_SNIPPETS.length), 100);
    return () => clearInterval(t);
  }, [persona]);

  return (
    <div style={{ minHeight: "50vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 40 }}>
      {persona === "xu_anhe" && (
        <div style={{ position: "relative", width: 160, height: 40 }}>
          <span style={{ position: "absolute", left: 0, top: 8, fontSize: 22, animation: "petalDrift 1.6s ease-in infinite" }}>🌸</span>
        </div>
      )}
      {persona === "yusheng" && (
        <div style={{ fontFamily: "monospace", fontSize: 13, color: "#2563EB", minHeight: 24 }}>
          <span>{CODE_SNIPPETS[codeIdx]}</span>
          <span style={{ animation: "cursorBlinkSkeleton 1s step-end infinite", marginLeft: 2 }}>▊</span>
        </div>
      )}
      {persona === "neutral" && (
        <div style={{ fontSize: 40, animation: "logoBreath 1.2s ease-in-out infinite" }}>💟</div>
      )}
      <p style={{ fontSize: 13.5, color: "var(--ink-soft, #999)", margin: 0, transition: "opacity 0.3s" }}>{lines[lineIdx]}</p>
    </div>
  );
}
