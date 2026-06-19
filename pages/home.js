import { useSession } from "next-auth/react";
import { useRouter } from "next/router";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="wrap">
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>
        你好{session?.user?.name ? `，${session.user.name}` : ""}
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>
        今天想做点什么？
      </p>

      <div className="choice-card" onClick={() => router.push("/onboarding")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17 }}>青少年心理咨询 AI</h3>
          <span className="tag" style={{ background: "#E1F5EE", color: "var(--teal-deep)" }}>
            可以开始
          </span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>
          先做一次简单的心情自评，之后每天会有一段小剧场陪你聊聊。
        </p>
      </div>

      <div className="choice-card disabled">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17 }}>AI 素养课程</h3>
          <span className="tag">开发中</span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>
          即将上线，敬请期待。
        </p>
      </div>
    </div>
  );
}
