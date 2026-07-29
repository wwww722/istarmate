import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { PageSkeleton, EmptyState } from "../components/EmptyState";
import { MEMORY_CATEGORIES, normalizeCategory, CATEGORY_ORDER } from "../lib/memoryCategories";

function fmtDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

export default function Memories() {
  const router = useRouter();
  const { status } = useSession();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    try {
      const r = await fetch("/api/memories");
      const d = await r.json();
      // 归一化到6类
      const list = (d.memories || []).map(m => ({ ...m, cat: normalizeCategory(m.category) }));
      setMemories(list);
    } catch {}
    setLoading(false);
  }

  async function forget(m) {
    const catInfo = MEMORY_CATEGORIES[m.cat];
    if (!confirm(`告诉TA，"${m.key}"这件事忘了也行？`)) return;
    await fetch(`/api/memories?category=${encodeURIComponent(m.category)}&key=${encodeURIComponent(m.key)}`, { method: "DELETE" });
    setMemories(prev => prev.filter(x => !(x.category === m.category && x.key === m.key)));
  }

  if (status !== "authenticated" || loading) return <div className="wrap"><PageSkeleton /></div>;

  // 按tab过滤 + 按时间倒序
  const filtered = (activeTab === "all" ? memories : memories.filter(m => m.cat === activeTab))
    .slice()
    .sort((a, b) => new Date(b.last_mentioned || 0) - new Date(a.last_mentioned || 0));

  // 每个分类的数量
  const counts = {};
  for (const m of memories) counts[m.cat] = (counts[m.cat] || 0) + 1;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/growth"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>TA们记得的事</h2>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16, lineHeight: 1.6 }}>
        这些是许安和和余生记住的、关于你的事。<b>每一件你都能看到</b>——不想被记住的，随时可以让TA忘掉。
      </p>

      {memories.length === 0 ? (
        <EmptyState emoji="🌱" title="还没有记忆"
          desc={"多和许安和、余生聊聊，\n它们会慢慢记住对你重要的事。"}
          actionLabel="去聊聊" onAction={() => router.push("/chat")} />
      ) : (
        <>
          {/* 分类 Tab */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 14, WebkitOverflowScrolling: "touch" }}>
            <TabChip label="全部" count={memories.length} active={activeTab === "all"} onClick={() => setActiveTab("all")} />
            {CATEGORY_ORDER.filter(c => counts[c]).map(c => (
              <TabChip key={c} label={`${MEMORY_CATEGORIES[c].emoji} ${MEMORY_CATEGORIES[c].label}`}
                count={counts[c]} active={activeTab === c} onClick={() => setActiveTab(c)} />
            ))}
          </div>

          {/* 卡片瀑布流 */}
          <div style={{ columns: "2 160px", columnGap: 10 }}>
            {filtered.map((m, i) => {
              const ci = MEMORY_CATEGORIES[m.cat] || MEMORY_CATEGORIES.heart;
              return (
                <div key={i} style={{
                  breakInside: "avoid", marginBottom: 10,
                  background: ci.bg, border: `1.5px solid ${ci.border}`,
                  borderRadius: 16, padding: "13px 14px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 7 }}>
                    <span style={{ fontSize: 14 }}>{ci.emoji}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: ci.accent }}>{ci.label}</span>
                    {m.importance >= 3 && <span style={{ fontSize: 10, color: ci.accent, marginLeft: "auto" }}>★</span>}
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 3px", color: "var(--ink)" }}>{m.key}</p>
                  <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 8px", lineHeight: 1.5 }}>{m.detail}</p>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 10.5, color: "var(--ink-muted)" }}>{fmtDate(m.last_mentioned)}</span>
                    <button onClick={() => forget(m)}
                      style={{ background: "transparent", border: "none", color: ci.accent, fontSize: 10.5, cursor: "pointer", padding: 0, opacity: 0.8 }}>
                      忘了也行 ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function TabChip({ label, count, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      flexShrink: 0, padding: "6px 12px", borderRadius: 16, cursor: "pointer",
      fontSize: 12.5, fontWeight: 500, whiteSpace: "nowrap",
      background: active ? "var(--purple)" : "var(--card-solid)",
      color: active ? "#fff" : "var(--ink-soft)",
      border: active ? "none" : "1px solid var(--line)",
    }}>
      {label} <span style={{ opacity: 0.7 }}>{count}</span>
    </button>
  );
}
