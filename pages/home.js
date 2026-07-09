import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import OnboardingTour from "../components/OnboardingTour";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState("zh");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    const saved = localStorage.getItem("istarmate_lang") || "zh";
    setLang(saved);
  }, [status, router]);

  function toggleLang() {
    const next = lang === "zh" ? "en" : "zh";
    setLang(next);
    localStorage.setItem("istarmate_lang", next);
  }

  async function enterCounseling() {
    const pRes = await fetch("/api/profile");
    const pData = await pRes.json();
    if (!pData.profile?.nickname) { router.push("/onboarding"); return; }
    if (!pData.profile?.avatar_name) { router.push("/avatar"); return; }
    const sRes = await fetch("/api/scenario?preview=1");
    if (sRes.status === 400) { router.push("/questionnaire"); return; }
    router.push("/dashboard");
  }

  if (status !== "authenticated") return null;

  const isEn = lang === "en";

  return (
    <>
      <OnboardingTour />
      <div className="wrap">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
          <h1 style={{ fontSize: 20 }}>{isEn ? `Hi, ${session.user?.email}` : `你好，${session.user?.email}`}</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={toggleLang} style={{ fontSize: 12, color: "var(--ink-soft)", background: "var(--purple-light)", border: "none", padding: "4px 10px", borderRadius: 20, cursor: "pointer" }}>
              {isEn ? "中文" : "EN"}
            </button>
            <a href="#" onClick={(e) => { e.preventDefault(); signOut({ callbackUrl: "/login" }); }} style={{ fontSize: 13, color: "var(--ink-soft)" }}>
              {isEn ? "Log out" : "退出"}
            </a>
          </div>
        </div>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>
          {isEn ? "What would you like to do today?" : "今天想做点什么？"}
        </p>

        <div className="choice-card" onClick={enterCounseling}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 17 }}>{isEn ? "Teen Mental Wellness AI" : "青少年心理咨询 AI"}</h3>
            <span className="tag" style={{ background: "#E1F5EE", color: "var(--teal-deep)" }}>{isEn ? "Start" : "可以开始"}</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>
            {isEn ? "Quick mood check, then chat with your AI companion daily." : "先做一次情绪自评，之后每天有AI陪你聊聊。"}
          </p>
        </div>

        <div className="choice-card" onClick={() => router.push("/ai-course")}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 17 }}>{isEn ? "AI Literacy Course" : "AI 素养课程"}</h3>
            <span className="tag" style={{ background: "#E1F5EE", color: "var(--teal-deep)" }}>{isEn ? "Start" : "可以开始"}</span>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 8, marginBottom: 0 }}>
            {isEn ? "6 mins a day, build your first website with AI." : "每天6分钟，用AI做出你的第一个网站。"}
          </p>
        </div>
      </div>
    </>
  );
}
