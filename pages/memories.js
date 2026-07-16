import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { EmptyState, PageSkeleton } from "../components/EmptyState";

const CAT_INFO = {
  person: { emoji: "👤", label: "重要的人" },
  event: { emoji: "📅", label: "重要的事" },
  concern: { emoji: "💭", label: "在意的事" },
  preference: { emoji: "💛", label: "喜好" },
  goal: { emoji: "🎯", label: "目标愿望" },
};

export default function Memories() {
  const router = useRouter();
  const { status } = useSession();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    try {
      const r = await fetch("/api/memories");
      const d = await r.json();
      setMemories(d.memories || []);
    } catch {}
    setLoading(false);
  }

  async function forget(m) {
    if (!confirm(`让星伴忘记"${m.key}"？`)) return;
    await fetch(`/api/memories?category=${encodeURIComponent(m.category)}&key=${encodeURIComponent(m.key)}`, { method: "DELETE" });
    setMemories(prev => prev.filter(x => !(x.category === m.category && x.key === m.key)));
  }

  if (status !== "authenticated" || loading) return <div className="wrap"><PageSkeleton /></div>;

  // 按类别分组
  const grouped = {};
  for (const m of memories) {
    if (!grouped[m.category]) grouped[m.category] = [];
    grouped[m.category].push(m);
  }

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>星伴记得的事</h2>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20, lineHeight: 1.6 }}>
        这些是星伴从你们的聊天里记住的事，让它能像老朋友一样懂你。你可以随时让它忘记某件事。
      </p>

      {memories.length === 0 ? (
        <EmptyState
          emoji="🌱"
          title="还没有记忆"
          desc={"多和星伴聊聊，\n它会慢慢记住对你重要的人和事。"}
          actionLabel="去和星伴聊聊"
          onAction={() => router.push("/chat")}
        />
      ) : (
        Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} style={{ marginBottom: 22 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 8px" }}>
              {CAT_INFO[cat]?.emoji} {CAT_INFO[cat]?.label || cat}
            </p>
            {items.map((m, i) => (
              <div key={i} className="card" style={{ padding: "13px 16px", marginBottom: 8, display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14.5, fontWeight: 500, margin: "0 0 2px" }}>
                    {m.key}
                    {m.importance >= 3 && <span style={{ fontSize: 11, color: "var(--coral-deep)", marginLeft: 6 }}>★ 重要</span>}
                  </p>
                  <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{m.detail}</p>
                </div>
                <button onClick={() => forget(m)} title="忘记"
                  style={{ background: "transparent", border: "none", color: "var(--ink-muted)", cursor: "pointer", fontSize: 16, padding: 2, flexShrink: 0 }}>×</button>
              </div>
            ))}
          </div>
        ))
      )}
    </div>
  );
}
