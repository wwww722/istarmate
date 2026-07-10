import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { AchievementPopup } from "../../components/PageTransition";

export default function MyProjects() {
  const router = useRouter();
  const { status } = useSession();
  const [snippets, setSnippets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newAchievements, setNewAchievements] = useState([]);
  const [shareModal, setShareModal] = useState(null);
  const [shareDesc, setShareDesc] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const r = await fetch("/api/code-snippets");
    const data = await r.json();
    setSnippets(data.snippets || []);
    setLoading(false);
  }

  async function loadFull(id) {
    const r = await fetch(`/api/code-snippets?id=${id}`);
    const data = await r.json();
    setSelected(data.snippet);
  }

  async function deleteSnippet(id) {
    if (!confirm("确认删除这个项目？")) return;
    await fetch(`/api/code-snippets?id=${id}`, { method: "DELETE" });
    setSnippets(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  async function togglePublic(snippet) {
    if (!snippet.is_public) {
      setShareModal(snippet);
      setShareDesc(snippet.description || "");
    } else {
      const r = await fetch("/api/code-snippets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: snippet.id, isPublic: false, description: snippet.description }),
      });
      if (r.ok) {
        setSnippets(prev => prev.map(s => s.id === snippet.id ? { ...s, is_public: false } : s));
        if (selected?.id === snippet.id) setSelected(prev => ({ ...prev, is_public: false }));
      }
    }
  }

  async function confirmShare() {
    if (!shareModal) return;
    const r = await fetch("/api/code-snippets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: shareModal.id, isPublic: true, description: shareDesc }),
    });
    const data = await r.json();
    if (r.ok) {
      setSnippets(prev => prev.map(s => s.id === shareModal.id ? { ...s, is_public: true, description: shareDesc } : s));
      if (selected?.id === shareModal.id) setSelected(prev => ({ ...prev, is_public: true, description: shareDesc }));
      if (data.newlyUnlocked?.length) setNewAchievements(data.newlyUnlocked);
    }
    setShareModal(null);
  }

  function previewCode(code) {
    const blob = new Blob([code], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  if (status !== "authenticated" || loading) return null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>我的项目</h2>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course/showcase"); }}
          style={{ marginLeft: "auto", fontSize: 13, color: "var(--purple-deep)" }}>
          🏛️ 展示墙
        </a>
      </div>

      {snippets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8 }}>
            还没有保存的项目。<br />在AI编程课里做出代码后，<br />点代码块右上角的 💾 保存 就会出现在这里。
          </p>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => router.push("/ai-course/chat")}>
            去做我的第一个网站 →
          </button>
        </div>
      ) : selected ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, margin: "0 0 2px" }}>{selected.title}</h3>
              {selected.description && <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>{selected.description}</p>}
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 13 }}>← 返回列表</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
            <button className="btn primary" style={{ flex: 1, minWidth: 120 }} onClick={() => previewCode(selected.code)}>🌐 在浏览器预览</button>
            <button className="btn" style={{ flex: 1, minWidth: 120 }} onClick={() => navigator.clipboard?.writeText(selected.code)}>📋 复制代码</button>
          </div>
          <button className="btn" style={{ marginBottom: 12, color: selected.is_public ? "var(--coral-deep)" : "var(--purple-deep)", borderColor: selected.is_public ? "var(--coral-deep)" : "var(--purple)" }}
            onClick={() => togglePublic(selected)}>
            {selected.is_public ? "🔒 取消公开展示" : "🏛️ 分享到展示墙"}
          </button>
          <div style={{ background: "#1e1e2e", borderRadius: 14, padding: 16, overflow: "auto", maxHeight: "55vh" }}>
            <pre style={{ color: "#cdd6f4", fontSize: 12.5, margin: 0, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
              <code>{selected.code}</code>
            </pre>
          </div>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>共 {snippets.length} 个项目</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {snippets.map(s => (
              <div key={s.id} className="card" style={{ padding: "14px", cursor: "pointer", position: "relative" }}
                onClick={() => loadFull(s.id)}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{s.language === "html" ? "🌐" : "💻"}</div>
                <p style={{ fontWeight: 500, fontSize: 13.5, margin: "0 0 2px", lineHeight: 1.3 }}>{s.title}</p>
                <p style={{ color: "var(--ink-soft)", fontSize: 11.5, margin: "0 0 6px" }}>{new Date(s.created_at).toLocaleDateString("zh-CN")}</p>
                {s.is_public && (
                  <span style={{ fontSize: 11, background: "var(--purple-light)", color: "var(--purple-deep)", padding: "2px 8px", borderRadius: 20 }}>公开展示中</span>
                )}
                <button onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id); }}
                  style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer", fontSize: 16 }}>×</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 分享到展示墙的弹窗 */}
      {shareModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
          <div className="card" style={{ maxWidth: 360, width: "100%", padding: "24px 22px" }}>
            <h3 style={{ fontSize: 17, marginBottom: 8 }}>分享到展示墙</h3>
            <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 16 }}>
              你的作品会以匿名方式展示，所有用户都能看到并预览。
            </p>
            <label style={{ fontSize: 13, color: "var(--ink-soft)", display: "block", marginBottom: 6 }}>
              给这个项目写一句介绍（选填）
            </label>
            <input className="input" placeholder="例如：我用AI做的第一个网站！" value={shareDesc}
              onChange={e => setShareDesc(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" style={{ flex: 1 }} onClick={confirmShare}>确认分享</button>
              <button className="btn" style={{ flex: 1 }} onClick={() => setShareModal(null)}>取消</button>
            </div>
          </div>
        </div>
      )}

      {newAchievements.length > 0 && (
        <AchievementPopup achievementIds={newAchievements} onClose={() => setNewAchievements([])} />
      )}
    </div>
  );
}
