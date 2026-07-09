import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";
import { AchievementPopup, SkeletonCard } from "../components/PageTransition";

const MOODS = [
  { id: "great", emoji: "😄", label: "很好",  low: false },
  { id: "ok",    emoji: "🙂", label: "还行",  low: false },
  { id: "meh",   emoji: "😐", label: "一般",  low: false },
  { id: "down",  emoji: "😔", label: "低落",  low: true  },
  { id: "bad",   emoji: "😣", label: "很差",  low: true  },
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
  const [showSettings, setShowSettings] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    setLoading(true);
    const [pRes, sRes, cRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/scenario"),
      fetch("/api/checkin"),
    ]);
    const pData = await pRes.json();
    const cData = await cRes.json();
    if (!sRes.ok) { setLoading(false); router.push("/questionnaire"); return; }
    const sData = await sRes.json();
    setProfile(pData.profile);
    setScenario(sData.scenario);
    setDayCount(sData.dayCount);
    setProgress(sData.progress);
    setStreak(cData.streak || 0);
    setLoading(false);
  }

  async function selectMood(m) {
    setMood(m.id);
    const r = await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: m.id }),
    });
    const data = await r.json();
    if (data.newlyUnlocked?.length) setNewAchievements(data.newlyUnlocked);
    if (data.streak) setStreak(data.streak);
    if (m.low) {
      setSelectedMoodLabel(m.label);
      setTimeout(() => setShowMoodPopup(true), 400);
    }
  }

  function goToChatWithMood() {
    setShowMoodPopup(false);
    router.push(`/chat?mood=${selectedMoodLabel}`);
  }

  if (status !== "authenticated") return null;

  if (loading) return (
    <div className="wrap">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </div>
  );

  return (
    <div className="wrap">
      {/* 顶部 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 2 }}>你好，{profile?.nickname}</p>
          <h2 style={{ fontSize: 20, margin: "0 0 2px" }}>
            {profile?.avatar_emoji} {profile?.avatar_name} #{profile?.avatar_code}
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            第 {dayCount} 天
            {streak >= 3 && <span style={{ marginLeft: 8, color: "var(--purple-deep)", fontWeight: 500 }}>🔥 {streak}天连续打卡</span>}
          </p>
        </div>
        {/* 设置按钮 */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowSettings(!showSettings)} style={{
            width: 38, height: 38, borderRadius: "50%",
            background: "var(--purple-light)", border: "none", cursor: "pointer",
            fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {profile?.avatar_emoji || "⚙️"}
          </button>
          {showSettings && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setShowSettings(false)} />
              <div style={{
                position: "absolute", right: 0, top: 44, background: "#fff",
                borderRadius: 14, border: "1px solid var(--line)", minWidth: 170,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10, overflow: "hidden",
              }}>
                {[
                  { label: "👤 我的资料", action: () => router.push("/onboarding") },
                  { label: "📊 重新做问卷", action: () => router.push("/questionnaire") },
                  { label: "🏆 我的成就", action: () => router.push("/achievements") },
                  { label: "🚪 退出登录", action: () => signOut({ callbackUrl: "/login" }), danger: true },
                ].map((item, i) => (
                  <button key={i} onClick={() => { setShowSettings(false); item.action(); }} style={{
                    display: "block", width: "100%", padding: "12px 16px",
                    background: "transparent", border: "none", textAlign: "left",
                    fontSize: 14, cursor: "pointer", color: item.danger ? "#D85A30" : "var(--ink)",
                    borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  }}>
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 心情打卡 */}
      <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
        <p style={{ fontSize: 14, marginBottom: 12, fontWeight: 500 }}>今天心情怎么样？</p>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {MOODS.map((m) => (
            <div key={m.id} onClick={() => selectMood(m)} style={{ textAlign: "center", cursor: "pointer" }}>
              <div style={{
                fontSize: 28, padding: "8px 10px", borderRadius: 14,
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
          {progress?.completed ? "今日小剧场 · 已完成 ✓" : "今日小剧场 · 6分钟"}
        </p>
        <h3 style={{ fontSize: 18, marginBottom: 6 }}>{scenario?.title}</h3>
        <p style={{ fontSize: 13.5, opacity: 0.9 }}>
          {progress?.completed ? "今天的故事已经讲完啦，明天再来 ✨" : "点开看看今天发生了什么 →"}
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100, padding: "0 0 20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowMoodPopup(false); }}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 16px 16px", padding: "28px 24px", maxWidth: 440, width: "100%", boxShadow: "0 -8px 40px rgba(0,0,0,0.15)" }}>
            <div style={{ fontSize: 36, textAlign: "center", marginBottom: 12 }}>💟</div>
            <h3 style={{ textAlign: "center", fontSize: 17, marginBottom: 10 }}>我看你今天心情{selectedMoodLabel}</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 14.5, textAlign: "center", lineHeight: 1.7, marginBottom: 22 }}>
              能和我说说是什么让你有这种感觉吗？<br />不用说得很完整，说一点点也可以。
            </p>
            <button className="btn primary" style={{ marginBottom: 10 }} onClick={goToChatWithMood}>说说看 →</button>
            <button className="btn" onClick={() => setShowMoodPopup(false)}>现在不想说</button>
          </div>
        </div>
      )}

      {/* 成就弹窗 */}
      {newAchievements.length > 0 && (
        <AchievementPopup achievementIds={newAchievements} onClose={() => setNewAchievements([])} />
      )}
    </div>
  );
}
