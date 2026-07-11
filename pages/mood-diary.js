import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { EmptyState } from "../components/EmptyState";

const MOOD_EMOJI = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };
const MOOD_LABEL = { great: "很好", ok: "还行", meh: "一般", down: "低落", bad: "很差" };

export default function MoodDiary() {
  const router = useRouter();
  const { status } = useSession();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    try {
      const r = await fetch("/api/mood-diary");
      const data = await r.json();
      setEntries(data.entries || []);
    } catch {}
    setLoading(false);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  if (status !== "authenticated" || loading) return null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>情绪日记</h2>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          emoji="📔"
          title="还没有日记"
          desc={"每天打卡心情时，写一句为什么，\n这里就会积累成你的情绪日记。"}
          actionLabel="去打卡"
          onAction={() => router.push("/dashboard")}
        />
      ) : (
        <>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>
            共 {entries.length} 篇记录
          </p>
          {entries.map((e, i) => (
            <div key={i} className="card" style={{ marginBottom: 12, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 24 }}>{MOOD_EMOJI[e.mood]}</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 500, margin: 0 }}>{MOOD_LABEL[e.mood]}</p>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{formatDate(e.log_date)}</p>
                </div>
              </div>
              <p style={{ fontSize: 14.5, color: "var(--ink)", margin: 0, lineHeight: 1.7, paddingLeft: 34 }}>
                {e.note}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
