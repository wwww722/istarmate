import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  async function enterCounseling() {
    const pRes = await fetch("/api/profile");
    const pData = await pRes.json();
    if (!pData.profile?.nickname) {
      router.push("/onboarding");
      return;
    }
    if (!pData.profile?.avatar_name) {
      router.push("/avatar");
      return;
    }
    const sRes = await fetch("/api/scenario");
    if (sRes.status === 400) {
      router.push("/questionnaire");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="wrap">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <h1 style={{ fontSize: 20 }}>你好，{session.user?.email}</h1>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); signOut({ callbackUrl: "/login" }); }}
          style={{ fontSize: 13, color: "var(--ink-soft)" }}
        >
          退出登录
        </a>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>今天想做点什么？</p>

      <div className="choice-card" onClick={enterCounseling}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17 }}>青少年心理咨询 AI</h3>
          <span className="tag" style={{ background: "#E1F5EE", color: "var(--teal-deep)" }}>可以开始</span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>
          先做一次情绪自评，之后每天有AI陪你聊聊。
        </p>
      </div>

      <div className="choice-card" onClick={() => router.push("/ai-course")}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: 17 }}>AI 素养课程</h3>
          <span className="tag" style={{ background: "#E1F5EE", color: "var(--teal-deep)" }}>可以开始</span>
        </div>
        <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>
          每天6分钟，用AI做出你的第一个网站。
        </p>
      </div>
    </div>
  );
}
