import { useRouter } from "next/router";

export default function Splash() {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* 背景光球 */}
      <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translateX(-50%)", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,111,224,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "-5%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(63,167,150,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ textAlign: "center", animation: "slideUp 0.5s ease", position: "relative", zIndex: 1 }}>
        <div style={{
          width: 90, height: 90, borderRadius: 28, margin: "0 auto 24px",
          background: "linear-gradient(135deg, #9B8FF0 0%, #7C6FE0 50%, #6B9EE8 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 40, boxShadow: "0 16px 48px rgba(124,111,224,0.45)",
        }}>💟</div>

        <p style={{ color: "var(--ink-soft)", fontSize: 13, letterSpacing: ".06em", fontWeight: 500, marginBottom: 8 }}>2026 · 星创营</p>
        <h1 style={{ fontSize: 36, fontWeight: 800, margin: "0 0 14px", background: "linear-gradient(135deg, var(--purple) 0%, var(--purple-deep) 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          IStarMate
        </h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 16, lineHeight: 1.8, margin: "0 0 48px", maxWidth: 280, marginLeft: "auto", marginRight: "auto" }}>
          每天几分钟，<br />陪你认识自己今天的心情。
        </p>
        <button className="btn primary" style={{ maxWidth: 280, margin: "0 auto", fontSize: 16 }} onClick={() => router.push("/login")}>
          开始 →
        </button>
      </div>
    </div>
  );
}
