import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { PageSkeleton, EmptyState } from "../components/EmptyState";

const MOOD_INFO = {
  great: { emoji: "😄", label: "很好", color: "#3FA796" },
  ok: { emoji: "🙂", label: "还行", color: "#7CC5A8" },
  meh: { emoji: "😐", label: "一般", color: "#E0C068" },
  down: { emoji: "😔", label: "低落", color: "#E89B6C" },
  bad: { emoji: "😢", label: "很差", color: "#C94A4A" },
};

const CAT_EMOJI = { person: "👤", event: "📅", concern: "💭", preference: "💛", goal: "🎯" };

function fmtDate(d) {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function Growth() {
  const router = useRouter();
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    try {
      const r = await fetch("/api/growth");
      const d = await r.json();
      setData(d);
    } catch {}
    setLoading(false);
  }

  if (status !== "authenticated" || loading) return <div className="wrap"><PageSkeleton /></div>;

  const growth = data?.growth || {};
  const moments = data?.moments || {};
  const checkins = growth.checkins || [];
  const memories = moments.memories || [];
  const summaries = moments.summaries || [];

  const hasData = checkins.length > 0 || memories.length > 0 || summaries.length > 0;

  const dirText = { up: "在慢慢变好 🌱", down: "有点起伏，我一直在", stable: "挺稳的 💛" };
  const dirColor = { up: "#3FA796", down: "#E89B6C", stable: "#7C6FE0" };

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>我的这一个月</h2>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
        这里记录着你走过的路——你的心情、你和星伴聊过的重要的事。
      </p>

      {!hasData ? (
        <EmptyState emoji="🌱" title="故事刚刚开始"
          desc={"多打卡、多和星伴聊聊，\n这里会慢慢长出属于你的成长轨迹。"}
          actionLabel="去打卡" onAction={() => router.push("/dashboard")} />
      ) : (
        <>
          {/* 情绪概览 */}
          {checkins.length > 0 && (
            <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>心情轨迹</p>
                <span style={{ fontSize: 13, fontWeight: 500, color: dirColor[growth.direction] }}>
                  {dirText[growth.direction] || ""}
                </span>
              </div>

              {/* 心情格子 */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 16 }}>
                {checkins.map((c, i) => (
                  <div key={i} title={`${fmtDate(c.date)} ${MOOD_INFO[c.mood]?.label || ""}`}
                    style={{ width: 26, height: 26, borderRadius: 7, background: MOOD_INFO[c.mood]?.color || "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>
                    {MOOD_INFO[c.mood]?.emoji}
                  </div>
                ))}
              </div>

              {/* 统计 */}
              <div style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--ink-soft)", flexWrap: "wrap" }}>
                <span>这个月打卡 <b style={{ color: "var(--ink)" }}>{growth.days}</b> 天</span>
                {growth.avgScore && <span>平均心情 <b style={{ color: "var(--ink)" }}>{growth.avgScore}</b>/5</span>}
                {growth.counts?.great > 0 && <span>😄 开心 <b style={{ color: "var(--ink)" }}>{growth.counts.great}</b> 天</span>}
              </div>
            </div>
          )}

          {/* 重要时刻（记忆） */}
          {memories.length > 0 && (
            <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>重要的人和事</p>
              <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>星伴陪你记着的</p>
              {memories.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 18 }}>{CAT_EMOJI[m.category] || "✨"}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 2px" }}>{m.key}</p>
                    <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{m.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 聊过的时刻（摘要）*/}
          {summaries.length > 0 && (
            <div className="card" style={{ padding: "18px 20px", marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 14px" }}>我们聊过的时刻</p>
              {summaries.map((s, i) => (
                <div key={i} style={{ paddingLeft: 14, borderLeft: "2px solid var(--purple-light)", marginBottom: 14, position: "relative" }}>
                  <div style={{ position: "absolute", left: -5, top: 4, width: 8, height: 8, borderRadius: "50%", background: "var(--purple)" }} />
                  <p style={{ fontSize: 11.5, color: "var(--ink-muted)", margin: "0 0 3px" }}>{fmtDate(s.session_date)}</p>
                  <p style={{ fontSize: 13.5, color: "var(--ink)", margin: 0, lineHeight: 1.6 }}>{s.summary}</p>
                </div>
              ))}
            </div>
          )}

          <button className="btn primary" style={{ marginTop: 4 }} onClick={() => router.push("/chat")}>
            继续和星伴聊聊 →
          </button>
        </>
      )}
    </div>
  );
}
