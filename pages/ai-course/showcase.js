import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const LANG_ICON = { html: "🌐", css: "🎨", js: "⚡", javascript: "⚡" };

export default function Showcase() {
  const router = useRouter();
  const { status } = useSession();
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await fetch("/api/showcase");
    const data = await r.json();
    setSnippets(data.snippets || []);
    setLoading(false);
  }

  async function loadPreview(id) {
    const r = await fetch(`/api/code-snippets?id=${id}`);
    const data = await r.json();
    setPreview(data.snippet);
  }

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>作品展示墙</h2>
      </div>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
        来自IStarMate用户的真实作品，用AI做出来的 ✨
      </p>

      {loading ? (
        <p style={{ color: "var(--ink-soft)", textAlign: "center", padding: 40 }}>加载中...</p>
      ) : snippets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8 }}>
            展示墙还没有作品。<br />你做的第一个网站，会是第一件展品吗？
          </p>
          <button className="btn primary" style={{ marginTop: 16 }}
            onClick={() => router.push("/ai-course/chat")}>
            去做我的第一个网站 →
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {snippets.map(s => (
            <div key={s.id} className="card" style={{ padding: "14px", cursor: "pointer" }}
              onClick={() => loadPreview(s.id)}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{LANG_ICON[s.language] || "💻"}</span>
                <span style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>{s.title}</span>
              </div>
              {s.description && (
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 8px", lineHeight: 1.5 }}>
                  {s.description}
                </p>
              )}
              <div style={{ background: "#1e1e2e", borderRadius: 8, padding: "8px 10px", fontSize: 10.5, color: "#8888aa", fontFamily: "monospace", overflow: "hidden", maxHeight: 60, lineHeight: 1.5 }}>
                {s.preview?.slice(0, 120)}...
              </div>
              <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "8px 0 0" }}>
                {new Date(s.created_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 预览弹窗 */}
      {preview && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div style={{ background: "#fff", borderRadius: 20, overflow: "hidden", width: "100%", maxWidth: 600, maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>{preview.title}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { const b = new Blob([preview.code], { type: "text/html" }); window.open(URL.createObjectURL(b)); }}
                  style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", padding: "6px 12px", borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 500 }}>
                  🌐 全屏预览
                </button>
                <button onClick={() => setPreview(null)}
                  style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-soft)" }}>×</button>
              </div>
            </div>
            <iframe srcDoc={preview.code} style={{ flex: 1, border: "none" }} sandbox="allow-scripts allow-same-origin" title="预览" />
          </div>
        </div>
      )}
    </div>
  );
}
