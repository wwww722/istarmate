import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { EmptyState, PageSkeleton } from "../components/EmptyState";

const MOOD_EMOJI = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };
const MOOD_LABEL = { great: "很好", ok: "还行", meh: "一般", down: "低落", bad: "很差" };
const MOODS = [
  { id: "great", emoji: "😄", label: "很好", score: 90 },
  { id: "ok", emoji: "🙂", label: "还行", score: 70 },
  { id: "meh", emoji: "😐", label: "一般", score: 50 },
  { id: "down", emoji: "😔", label: "低落", score: 30 },
  { id: "bad", emoji: "😣", label: "很差", score: 10 },
];

function scoreToMood(score) {
  const s = Number(score);
  if (s >= 80) return "great";
  if (s >= 60) return "ok";
  if (s >= 40) return "meh";
  if (s >= 20) return "down";
  return "bad";
}

export default function MoodDiary() {
  const router = useRouter();
  const { status } = useSession();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [note, setNote] = useState("");
  const [selectedMood, setSelectedMood] = useState("ok");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // 从会话小结卡跳转过来：自动预填
  useEffect(() => {
    if (!router.isReady) return;
    const { from, who, mood, hint } = router.query;
    if (from === "session") {
      setWriting(true);
      // 心情分 → 默认选中的心情
      if (mood) setSelectedMood(scoreToMood(mood));
      // 填空开头：把 hint 的三段填进模板
      const parts = String(hint || "").split("、");
      const whoName = who || "许安和";
      const a = parts[0] || "";
      const b = parts[1] || "";
      const c = parts[2] || "";
      setNote(`今天我和${whoName}聊了${a}，我感觉${b}，我决定明天${c}。\n\n`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady]);

  async function load() {
    try {
      const r = await fetch("/api/mood-diary");
      const data = await r.json();
      setEntries(data.entries || []);
    } catch {}
    setLoading(false);
  }

  async function save() {
    if (!note.trim() || saving) return;
    setSaving(true);
    try {
      await fetch("/api/mood-diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim(), mood: selectedMood }),
      });
      setNote("");
      setWriting(false);
      await load();
    } catch {}
    setSaving(false);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  if (status !== "authenticated" || loading) return <div className="wrap"><PageSkeleton /></div>;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>情绪日记</h2>
      </div>

      {/* 写作表单 */}
      {writing ? (
        <div className="card" style={{ padding: "18px 20px", marginBottom: 20, border: "1.5px solid rgba(124,111,224,0.25)" }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 12px" }}>今天心情怎么样？</p>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {MOODS.map(m => (
              <button key={m.id} onClick={() => setSelectedMood(m.id)}
                style={{
                  flex: 1, padding: "8px 4px", borderRadius: 12, cursor: "pointer",
                  border: selectedMood === m.id ? "2px solid var(--purple)" : "1px solid var(--line)",
                  background: selectedMood === m.id ? "rgba(124,111,224,0.08)" : "transparent",
                }}>
                <div style={{ fontSize: 22 }}>{m.emoji}</div>
                <div style={{ fontSize: 10.5, color: "var(--ink-soft)", marginTop: 2 }}>{m.label}</div>
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="今天发生了什么？想到什么写什么，就算一句话也好。"
            rows={6}
            style={{
              width: "100%", boxSizing: "border-box", resize: "vertical",
              border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px",
              fontSize: 14.5, lineHeight: 1.7, fontFamily: "inherit", background: "var(--card-solid)", color: "var(--ink)",
            }}
          />
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button onClick={save} disabled={saving || !note.trim()}
              className="btn primary" style={{ flex: 1, opacity: (!note.trim() || saving) ? 0.5 : 1 }}>
              {saving ? "保存中…" : "保存今天的日记"}
            </button>
            <button onClick={() => { setWriting(false); setNote(""); }}
              style={{ padding: "0 18px", borderRadius: 12, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", cursor: "pointer", fontSize: 14 }}>
              取消
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setWriting(true)} className="btn primary" style={{ width: "100%", marginBottom: 20 }}>
          ✍️ 写今天的日记
        </button>
      )}

      {/* 历史记录 */}
      {entries.length === 0 ? (
        !writing && <EmptyState emoji="📔" title="还没有日记"
          desc={"写下今天的心情和一句为什么，\n这里会慢慢积累成你的情绪日记。"}
          actionLabel="写第一篇" onAction={() => setWriting(true)} />
      ) : (
        <>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>共 {entries.length} 篇记录</p>
          {entries.map((e, i) => (
            <div key={i} className="card" style={{ marginBottom: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{MOOD_EMOJI[e.mood]}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{MOOD_LABEL[e.mood]}</p>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{formatDate(e.log_date)}</p>
                </div>
              </div>
              <p style={{ fontSize: 14.5, color: "var(--ink)", margin: 0, lineHeight: 1.7, paddingLeft: 34, whiteSpace: "pre-wrap" }}>
                {e.note}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
