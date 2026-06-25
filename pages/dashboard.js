import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const MOODS = [
  { id: "great", emoji: "😄", label: "很好" },
  { id: "ok", emoji: "🙂", label: "还行" },
  { id: "meh", emoji: "😐", label: "一般" },
  { id: "down", emoji: "😔", label: "低落" },
  { id: "bad", emoji: "😣", label: "很差" },
];

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession();
  const [profile, setProfile] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [dayCount, setDayCount] = useState(1);
  const [progress, setProgress] = useState(null);
  const [mood, setMood] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    setLoading(true);
    const [pRes, sRes] = await Promise.all([fetch("/api/profile"), fetch("/api/scenario")]);
    const pData = await pRes.json();
    if (!sRes.ok) {
      setLoading(false);
      router.push("/questionnaire");
      return;
    }
    const sData = await sRes.json();
    setProfile(pData.profile);
    setScenario(sData.scenario);
    setDayCount(sData.dayCount);
    setProgress(sData.progress);
    setLoading(false);
  }

  if (status !== "authenticated" || loading || !profile) return null;

  const taskDone = progress?.completed;

  return (
    <div className="wrap">
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 2 }}>你好，{profile.nickname}</p>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>
        {profile.avatar_emoji} {profile.avatar_name} #{profile.avatar_code}
      </h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 24 }}>第 {dayCount} 天</p>

      <p style={{ fontSize: 14, marginBottom: 10 }}>今天心情怎么样？</p>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 26 }}>
        {MOODS.map((m) => (
          <div
            key={m.id}
            onClick={() => setMood(m.id)}
            style={{
              fontSize: 26,
              cursor: "pointer",
              padding: "8px 10px",
              borderRadius: 14,
              background: mood === m.id ? "var(--purple-light)" : "transparent",
              textAlign: "center",
            }}
            title={m.label}
          >
            {m.emoji}
          </div>
        ))}
      </div>

      <div className="gradient-card" onClick={() => router.push("/scenario")}>
        <p style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 6 }}>
          {taskDone ? "今日小剧场 · 已完成" : "今日小剧场"}
        </p>
        <h3 style={{ fontSize: 18, marginBottom: 6 }}>{scenario?.title}</h3>
        <p style={{ fontSize: 13.5, opacity: 0.9 }}>
          {taskDone ? "今天的故事已经讲完啦，明天再来 ✨" : "点开看看今天发生了什么 →"}
        </p>
      </div>

      <p style={{ textAlign: "center", marginTop: 28 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/home"); }} style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          ← 回到首页
        </a>
      </p>
    </div>
  );
}
