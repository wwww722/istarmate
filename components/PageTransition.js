// components/PageTransition.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getAchievement } from "../lib/achievements";

// 页面顶部进度条
export function TopProgressBar() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer;
    const start = () => {
      setLoading(true);
      setProgress(0);
      timer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 15, 85)), 200);
    };
    const done = () => {
      clearInterval(timer);
      setProgress(100);
      setTimeout(() => { setLoading(false); setProgress(0); }, 400);
    };
    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);
    return () => {
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
      clearInterval(timer);
    };
  }, [router]);

  if (!loading && progress === 0) return null;
  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, height: 3,
      background: "var(--purple-light)", zIndex: 9999,
    }}>
      <div style={{
        height: "100%", background: "var(--purple)",
        width: `${progress}%`,
        transition: progress === 100 ? "width .1s ease" : "width .2s ease",
        borderRadius: "0 2px 2px 0",
      }} />
    </div>
  );
}

// AI思考动画（三个跳动的点）
export function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "4px 2px" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--ink-soft)",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// 成就解锁弹窗
export function AchievementPopup({ achievementIds, onClose }) {
  const [current, setCurrent] = useState(0);
  if (!achievementIds?.length) return null;
  const a = getAchievement(achievementIds[current]);
  if (!a) return null;

  function next() {
    if (current < achievementIds.length - 1) setCurrent(current + 1);
    else onClose();
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 200, padding: 24,
    }}
      onClick={next}
    >
      <div style={{
        background: "#fff", borderRadius: 20, padding: "32px 28px",
        textAlign: "center", maxWidth: 320, width: "100%",
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        animation: "popIn .3s ease",
      }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 56, marginBottom: 10 }}>{a.emoji}</div>
        <p style={{ fontSize: 12, color: "var(--purple-deep)", fontWeight: 500, marginBottom: 4, letterSpacing: ".05em" }}>
          🎉 成就解锁
        </p>
        <h3 style={{ fontSize: 20, margin: "0 0 8px" }}>{a.title}</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 24px", lineHeight: 1.6 }}>{a.desc}</p>
        <button className="btn primary" onClick={next}>
          {current < achievementIds.length - 1 ? "下一个 →" : "太棒了！"}
        </button>
        {achievementIds.length > 1 && (
          <p style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 10 }}>
            {current + 1} / {achievementIds.length}
          </p>
        )}
      </div>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// 骨架屏（加载时占位）
export function SkeletonCard({ lines = 3 }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: 16, borderRadius: 8, marginBottom: i < lines - 1 ? 10 : 0,
          background: "linear-gradient(90deg, #f0eef8 25%, #e8e4f4 50%, #f0eef8 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
          width: i === lines - 1 ? "60%" : "100%",
        }} />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
