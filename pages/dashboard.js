import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { getTodayGreeting } from "../lib/dailyGreetings";
import { detectEasterEgg, alreadyTriggered, markTriggered } from "../lib/festivalEasterEggs";
import { useSession, signOut } from "next-auth/react";
import { AchievementPopup, SkeletonCard } from "../components/PageTransition";
import MoodChart from "../components/MoodChart";
import StarOrb from "../components/StarOrb";
import BreathingExercise from "../components/BreathingExercise";

const MOODS = [
  { id: "great", emoji: "😄", label: "很好",  low: false },
  { id: "ok",    emoji: "🙂", label: "还行",  low: false },
  { id: "meh",   emoji: "😐", label: "一般",  low: false },
  { id: "down",  emoji: "😔", label: "低落",  low: true  },
  { id: "bad",   emoji: "😣", label: "很差",  low: true  },
];

function daysSince(dateStr) {
  if (!dateStr) return 999;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

export default function Dashboard() {
  const router = useRouter();
  const { status } = useSession();
  const [profile, setProfile] = useState(null);
  const [dayCount, setDayCount] = useState(1);
  const [mood, setMood] = useState(null);
  const [showDiary, setShowDiary] = useState(false);
  const [easterEgg, setEasterEgg] = useState(null);

  useEffect(() => {
    // 节日彩蛋检测（一次性）
    try {
      const egg = detectEasterEgg(null);
      if (egg && !alreadyTriggered(egg.once_key)) {
        setEasterEgg(egg);
        markTriggered(egg.once_key);
      }
    } catch {}
  }, []);
  const [diaryMood, setDiaryMood] = useState(null);
  const [diaryNote, setDiaryNote] = useState("");
  const [showBreathing, setShowBreathing] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [moodTrend, setMoodTrend] = useState(null);
  const [showMoodPopup, setShowMoodPopup] = useState(false);
  const [selectedMoodLabel, setSelectedMoodLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);
  const [streak, setStreak] = useState(0);
  const [moodLogs, setMoodLogs] = useState([]);
  const [lastQuestionnaireDate, setLastQuestionnaireDate] = useState(null);
  const [aiCourseActive, setAiCourseActive] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    setLoading(true);
    const [pRes, cRes, qRes, aiRes] = await Promise.all([
      fetch("/api/profile"),
      fetch("/api/checkin"),
      fetch("/api/questionnaire"),
      fetch("/api/ai-course-session"),
    ]);

    const pData = await pRes.json();
    // 新用户引导检查（原来在 home 页做，现在合并进来，省一层跳转）
    if (!pData.profile?.nickname) { router.replace("/onboarding"); return; }
    if (!pData.profile?.avatar_name) { router.replace("/avatar"); return; }

    const qData = await qRes.json();
    // 没做过问卷 → 先去做问卷
    if (!qData.questionnaire) { setLoading(false); router.push("/questionnaire"); return; }

    const cData = await cRes.json();

    setProfile(pData.profile);
    setStreak(cData.streak || 0);
    setMoodLogs(cData.logs || []);
    // "第N天"：从最早一次打卡算起
    if (cData.logs?.length > 0) {
      const first = new Date(cData.logs[cData.logs.length - 1].log_date);
      setDayCount(Math.max(1, Math.floor((Date.now() - first.getTime()) / 86400000) + 1));
    }
    setLastQuestionnaireDate(qData.questionnaire?.created_at || null);
    const aiData = await aiRes.json();
    setAiCourseActive(aiData.messages?.length > 1);
    setLoading(false);
    // 轻量检查是否管理员（失败静默）
    fetch("/api/admin").then(r => { if (r.ok) setIsAdminUser(true); }).catch(() => {});
    // 情绪趋势
    fetch("/api/care-signal").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.signals?.declining) setMoodTrend({ type: "declining", ...d.signals.declining });
      else if (d?.signals?.improving) setMoodTrend({ type: "improving", ...d.signals.improving });
    }).catch(() => {});
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
    // 触发打卡音效
    try { const { feedback } = await import("../lib/feedback"); feedback.checkin(); } catch {}
    // 更新本地logs
    const today = new Date().toISOString().slice(0, 10);
    setMoodLogs(prev => {
      const filtered = prev.filter(l => {
        const d = typeof l.log_date === "string" ? l.log_date : new Date(l.log_date).toISOString().slice(0, 10);
        return d !== today;
      });
      return [{ log_date: today, mood: m.id }, ...filtered];
    });
    // 打卡后展示日记输入
    setDiaryMood(m);
    setShowDiary(true);
    if (m.low) {
      setSelectedMoodLabel(m.label);
      setTimeout(() => setShowMoodPopup(true), 400);
    }
  }

  async function saveDiaryNote() {
    if (!diaryMood) return;
    await fetch("/api/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood: diaryMood.id, note: diaryNote }),
    });
    setShowDiary(false);
    setDiaryNote("");
  }

  if (status !== "authenticated") return null;

  if (loading) return (
    <div className="wrap">
      <SkeletonCard lines={2} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </div>
  );

  const daysSinceQ = daysSince(lastQuestionnaireDate);
  const showReevalNotice = daysSinceQ >= 14;

  return (
    <div className="wrap">
      {/* 重测提醒 */}
      {showReevalNotice && (
        <div style={{
          background: "var(--purple-light)", border: "1.5px solid var(--purple)",
          borderRadius: 14, padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
        }}>
          <div>
            <p style={{ fontSize: 13.5, fontWeight: 500, margin: "0 0 2px", color: "var(--purple-deep)" }}>
              📊 距上次评估已 {daysSinceQ} 天
            </p>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>状态可能有变化，重新做一次？</p>
          </div>
          <button className="btn primary" style={{ padding: "7px 14px", fontSize: 13, width: "auto", flexShrink: 0 }}
            onClick={() => router.push("/questionnaire")}>重新评估</button>
        </div>
      )}

      {/* 顶部用户信息 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <p style={{ color: "var(--ink-soft)", fontSize: 13, marginBottom: 2 }}>你好，{profile?.nickname}</p>
          <h2 style={{ fontSize: 20, margin: "0 0 2px" }}>
            {profile?.avatar_emoji} {profile?.avatar_name} #{profile?.avatar_code}
          </h2>
          <p style={{ color: "var(--ink-soft)", fontSize: 13 }}>
            第 {dayCount} 天
            {streak >= 3 && <span style={{ marginLeft: 8, color: "var(--purple-deep)", fontWeight: 500 }}>🔥 {streak}天连续</span>}
          </p>
        </div>
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowSettings(!showSettings)} style={{
            width: 38, height: 38, borderRadius: "50%", background: "var(--purple-light)",
            border: "none", cursor: "pointer", fontSize: 18,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {profile?.avatar_emoji || "⚙️"}
          </button>
          {showSettings && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setShowSettings(false)} />
              <div style={{
                position: "absolute", right: 0, top: 44, background: "#fff", borderRadius: 14,
                border: "1px solid var(--line)", minWidth: 170,
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 10, overflow: "hidden",
              }}>
                {[
                  { label: "🌱 我的成长", action: () => router.push("/growth") },
                  { label: "👤 我的资料", action: () => router.push("/onboarding") },
                  { label: "🎟️ 邀请朋友", action: () => router.push("/invite") },
                  { label: "⚙️ 账号设置", action: () => router.push("/account") },
                  ...(isAdminUser ? [{ label: "🛠️ 管理后台", action: () => router.push("/admin") }] : []),
                  { label: "🚪 退出登录", action: () => signOut({ callbackUrl: "/login" }), danger: true },
                ].map((item, i) => (
                  <button key={i} onClick={() => { setShowSettings(false); item.action(); }} style={{
                    display: "block", width: "100%", padding: "12px 16px", background: "transparent",
                    border: "none", textAlign: "left", fontSize: 14, cursor: "pointer",
                    color: item.danger ? "#D85A30" : "var(--ink)",
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

      {/* 今日一句：许安和/余生主动开口 */}
      <div className="card" style={{ marginBottom: 14, padding: "14px 16px", display: "flex", gap: 10, alignItems: "flex-start", background: "linear-gradient(135deg, #fff8fb, #f5f0ff)" }}>
        <span style={{ fontSize: 24, flexShrink: 0 }}>🤍</span>
        <div>
          <p className="xu-title-font" style={{ fontSize: 14, color: "var(--ink-muted)", margin: "0 0 2px", fontWeight: 600 }}>许安和</p>
          <p style={{ fontSize: 13.5, color: "var(--ink)", margin: 0, lineHeight: 1.6 }}>{getTodayGreeting("anhe")}</p>
        </div>
      </div>

      {/* 两个核心：许安和 + 余生 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <div className="card" onClick={() => router.push("/chat")}
          style={{ cursor: "pointer", padding: "18px 16px", textAlign: "center", background: "linear-gradient(135deg, rgba(224,150,176,0.12), rgba(196,107,130,0.06))" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>🤍</div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 3px" }}>找许安和聊聊</p>
          <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>心里的事，说给她听</p>
        </div>
        <div className="card" onClick={() => router.push("/ai-course/studio")}
          style={{ cursor: "pointer", padding: "18px 16px", textAlign: "center", background: "linear-gradient(135deg, rgba(63,167,150,0.12), rgba(63,167,150,0.05))" }}>
          <div style={{ fontSize: 30, marginBottom: 8 }}>💻</div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 3px" }}>找余生创作</p>
          <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>{aiCourseActive ? "继续上次的项目" : "做出你的第一个作品"}</p>
        </div>
      </div>

      {/* 心情折线图 */}
      {moodLogs.length > 0 && <MoodChart logs={moodLogs} />}

      {/* 情绪趋势预警 */}
      {moodTrend && (
        <div className="card" style={{
          marginTop: 14, padding: "16px 18px",
          border: `1.5px solid ${moodTrend.type === "declining" ? "rgba(201,74,74,0.3)" : "rgba(63,167,150,0.3)"}`,
          background: moodTrend.type === "declining" ? "rgba(201,74,74,0.05)" : "rgba(63,167,150,0.05)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 22 }}>{moodTrend.type === "declining" ? "📉" : "📈"}</span>
            <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0, color: moodTrend.type === "declining" ? "var(--coral-deep)" : "var(--teal-deep)" }}>
              {moodTrend.type === "declining" ? "最近状态在往下走" : "最近状态在变好"}
            </p>
          </div>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 12px", lineHeight: 1.6 }}>
            {moodTrend.type === "declining"
              ? "对比前几天，你这几天的心情明显低了一些。不用强撑，如果有什么压着你，可以和星伴说说。"
              : "对比前几天，你这几天的心情好了不少。是发生什么好事了吗？"}
          </p>
          <button className="btn" style={{ padding: "9px", fontSize: 13.5 }}
            onClick={() => router.push("/chat")}>
            {moodTrend.type === "declining" ? "和星伴聊聊 →" : "和星伴分享 →"}
          </button>
        </div>
      )}

      {/* 情绪日记输入弹窗 */}
      {showDiary && diaryMood && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 150, padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowDiary(false); setDiaryNote(""); } }}>
          <div className="card" style={{ maxWidth: 360, width: "100%", padding: "24px 22px", animation: "popIn 0.3s ease" }}>
            <p style={{ textAlign: "center", fontSize: 15.5, fontWeight: 600, margin: "0 0 4px" }}>
              今天为什么是这个心情？
            </p>
            <p style={{ textAlign: "center", fontSize: 13, color: "var(--ink-soft)", margin: "0 0 16px" }}>
              写一句话记录一下（选填）
            </p>
            <textarea
              value={diaryNote}
              onChange={(e) => setDiaryNote(e.target.value)}
              placeholder="今天发生了什么，或者此刻的感受..."
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 12,
                border: "1.5px solid var(--line)", background: "rgba(255,255,255,0.7)",
                fontSize: 14.5, fontFamily: "inherit", resize: "none", outline: "none",
                lineHeight: 1.6, color: "var(--ink)", marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" style={{ flex: 1 }} onClick={saveDiaryNote}>
                {diaryNote.trim() ? "保存" : "跳过"}
              </button>
            </div>
          </div>
        </div>
      )}

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
            <button className="btn primary" style={{ marginBottom: 10 }} onClick={() => { setShowMoodPopup(false); router.push(`/chat?mood=${selectedMoodLabel}`); }}>
              说说看 →
            </button>
            <button className="btn" style={{ marginBottom: 10 }} onClick={() => { setShowMoodPopup(false); setShowBreathing(true); }}>
              🌬️ 先做个呼吸练习
            </button>
            <button className="btn" onClick={() => setShowMoodPopup(false)}>现在不想说</button>
          </div>
        </div>
      )}

      {newAchievements.length > 0 && (
        <AchievementPopup achievementIds={newAchievements} onClose={() => setNewAchievements([])} />
      )}

      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}

      {/* 节日彩蛋 */}
      {easterEgg && (
        <div onClick={() => setEasterEgg(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,18,31,0.6)", backdropFilter: "blur(6px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-solid,#fff)", borderRadius: 24, padding: "32px 26px", maxWidth: 340, textAlign: "center", boxShadow: "0 24px 70px rgba(0,0,0,0.35)" }}>
            <div style={{ fontSize: 56, marginBottom: 14, animation: "logoBreath 1.2s ease-in-out infinite" }}>{easterEgg.emoji}</div>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 20px" }}>{easterEgg.msg}</p>
            <button onClick={() => setEasterEgg(null)} className="btn primary" style={{ width: "100%" }}>好呀 🤍</button>
          </div>
        </div>
      )}

      <StarOrb moodToday={mood} />
    </div>
  );
}
