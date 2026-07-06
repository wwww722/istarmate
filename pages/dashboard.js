import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const MOODS = [
  { id: "great", emoji: "😄", label: "很好", low: false },
  { id: "ok",    emoji: "🙂", label: "还行", low: false },
  { id: "meh",   emoji: "😐", label: "一般", low: false },
  { id: "down",  emoji: "😔", label: "低落", low: true },
  { id: "bad",   emoji: "😣", label: "很差", low: true },
];

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession();
  const [profile, setProfile] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [dayCount, setDayCount] = useState(1);
  const [progress, setProgress] = useState(null);
  const [mood, setMood] = useState(null);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [selectedMoodLabel, setSelectedMoodLabel] = useState("");
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

  function selectMood(m) {
    setMood(m.id);
    if (m.low) {
      setSelectedMoodLabel(m.label);
      // 短暂延迟后弹出，让用户先看到表情选中的反馈
      setTimeout(() => setShowMoodPopup(true), 400);
    }
  }

  function goToChatWithMood() {
    setShowMoodPopup(false);
    // 把今日心情带到聊天页，聊天页会用这个作为开场话题
    router.push(`/chat?mood=${selectedMoodLabel}`);
  }

  if (status !== "authenticated" || loading || !profile) return null;

  const taskDone = progress?.completed;

  return (
    <div className="wrap">
      <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 2 }}>
        你好，{profile.nickname}
      </p>
      <h2 style={{ fontSize: 22, marginBottom: 4 }}>
        {profile.avatar_emoji} {profile.avatar_name} #{profile.avatar_code}
      </h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 24 }}>第 {dayCount} 天</p>

      {/* 心情打卡 */}
      <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
        <p style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>今天心情怎么样？</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {MOODS.map((m) => (
            <div key={m.id} onClick={() => selectMood(m)} style={{ textAlign: "center", cursor: "pointer" }}>
              <div style={{
                fontSize: 28,
                padding: "8px 10px",
                borderRadius: 14,
                background: mood === m.id ? "var(--purple-light)" : "transparent",
                border: mood === m.id ? "2px solid var(--purple)" : "2px solid transparent",
                transition: "all .2s",
              }}>
                {m.emoji}
              </div>
              <p style={{ fontSize: 11, color: mood === m.id ? "var(--purple-deep)" : "var(--ink-soft)", margin: "4px 0 0" }}>
                {m.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 今日小剧场 */}
      <div className="gradient-card" onClick={() => router.push("/scenario")} style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 12.5, opacity: 0.85, marginBottom: 6 }}>
          {taskDone ? "今日小剧场 · 已完成 ✓" : "今日小剧场 · 6分钟"}
        </p>
        <h3 style={{ fontSize: 18, marginBottom: 6 }}>{scenario?.title}</h3>
        <p style={{ fontSize: 13.5, opacity: 0.9 }}>
          {taskDone ? "今天的故事已经讲完啦，明天再来 ✨" : "点开看看今天发生了什么 →"}
        </p>
      </div>

      <p style={{ textAlign: "center", marginTop: 18 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/chat"); }}
          style={{ fontSize: 13.5, color: "var(--purple-deep)" }}>
          💬 想自由聊聊？找星伴说说话 →
        </a>
      </p>

      <p style={{ textAlign: "center", marginTop: 12 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/home"); }}
          style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          ← 回到首页
        </a>
      </p>

      {/* 心情低落弹窗 */}
      {showMoodPopup && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          zIndex: 100, padding: "0 0 20px",
        }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoodPopup(false); }}
        >
          <div style={{
            background: "#fff", borderRadius: "20px 20px 16px 16px",
            padding: "28px 24px", maxWidth: 440, width: "100%",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.15)",
          }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>💟</div>
            <h3 style={{ textAlign: "center", fontSize: 17, marginBottom: 10 }}>
              我看你今天打卡说心情{selectedMoodLabel}
            </h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, textAlign: "center", lineHeight: 1.7, marginBottom: 22 }}>
              能和我说说是什么让你有这种感觉吗？<br />
              不用说得很完整，说一点点也可以。
            </p>
            <button className="btn primary" style={{ marginBottom: 10 }} onClick={goToChatWithMood}>
              说说看 →
            </button>
            <button className="btn" onClick={() => setShowMoodPopup(false)}>
              现在不想说
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
