import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const STEPS = [
  { emoji: "💡", title: "想一个你想解决的问题", desc: "可以是任何事：展示你的爱好、做个小游戏、帮同学投票……有想法就够了，不需要懂代码。" },
  { emoji: "🤖", title: "和 AI 聊聊你的想法", desc: "把你想做的事告诉 AI，它会帮你把想法变成真实的代码，一步一步来，随时可以问。" },
  { emoji: "🌐", title: "把网站发布出去", desc: "做好了之后，AI 会教你怎么让所有人都能通过链接访问你的网站，免费的。" },
];

export default function AiCourse() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/home"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>AI 素养课程</h2>
      </div>

      <div className="card" style={{ textAlign: "center", padding: "28px 22px", marginBottom: 16 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
        <h3 style={{ fontSize: 20, marginBottom: 8 }}>做出你的第一个网站</h3>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8, margin: 0 }}>
          不需要任何编程基础。你只需要有一个想法，<br />AI 帮你把它变成真实运行的网站。
        </p>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>怎么做到的？</p>

      {STEPS.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "flex-start" }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, background: "var(--purple-light)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, flexShrink: 0
          }}>
            {s.emoji}
          </div>
          <div>
            <p style={{ fontWeight: 500, fontSize: 15, margin: "0 0 3px" }}>{s.title}</p>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 28 }}>
        <button className="btn primary" onClick={() => router.push("/ai-course/studio")}
          style={{ fontSize: 16, padding: "16px" }}>
          🚀 开始创作
        </button>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center", margin: "10px 0 20px" }}>
          进入工作室，代码星会带你从零做出第一个作品
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.push("/ai-course/projects")}>
            💻 我的项目
          </button>
          <button className="btn" style={{ flex: 1 }} onClick={() => router.push("/ai-course/showcase")}>
            🏛️ 展示墙
          </button>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 20 }}>
        IStarMate · AI 素养课程 · 目前免费开放
      </p>
    </div>
  );
}
