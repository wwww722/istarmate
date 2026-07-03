import { useRouter } from "next/router";

export default function Splash() {
  const router = useRouter();
  return (
    <div className="wrap" style={{ textAlign: "center", paddingTop: 90 }}>
      <div style={{ fontSize: 56, marginBottom: 18 }}>💟</div>
      <p style={{ color: "var(--ink-soft)", fontSize: 13, letterSpacing: ".05em" }}>2026 IStarMate</p>
      <h1 style={{ fontSize: 30, margin: "6px 0 16px" }}>IStarMate</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.8 }}>
        每天几分钟，<br />陪你认识自己今天的心情。
      </p>
      <button className="btn primary" style={{ marginTop: 36 }} onClick={() => router.push("/login")}>
        开始 →
      </button>
    </div>
  );
}
