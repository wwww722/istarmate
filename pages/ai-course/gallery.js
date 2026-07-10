// pages/ai-course/gallery.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function Gallery() {
  const router = useRouter();
  const [snippets, setSnippets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewCode, setPreviewCode] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const r = await fetch("/api/gallery");
    const data = await r.json();
    setSnippets(data.snippets || []);
    setLoading(false);
  }

  async function openSnippet(id) {
    const r = await fetch(`/api/gallery?id=${id}`);
    const data = await r.json();
    if (data.snippet) setSelected(data.snippet);
  }

  function runPreview(code) {
    setPreviewCode(code);
  }

  if (loading) return (
    <div className="wrap" style={{ textAlign: "center", paddingTop: 60 }}>
      <p style={{ color: "var(--ink-soft)" }}>加载中...</p>
    </div>
  );

  return (
    <div style={{ display: "flex", height: "100vh", maxWidth: "100vw" }}>
      {/* 左侧作品列表 */}
      <div style={{ width: previewCode ? "35%" : "100%", maxWidth: previewCode ? "35%" : 600, margin: previewCode ? "0" : "0 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", background: "rgba(245,243,255,0.95)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", gap: 10 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>🌐 作品展示墙</p>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>大家用AI做的网站</p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {snippets.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
              <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8 }}>
                展示墙还是空的。<br />
                做完网站后在「我的项目」里发布，<br />
                你的作品就会出现在这里！
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {snippets.map(s => (
                <div key={s.id}
                  className="card"
                  style={{ padding: "14px", cursor: "pointer", transition: "all 0.2s" }}
                  onClick={() => openSnippet(s.id)}
                >
                  <div style={{ fontSize: 22, marginBottom: 6 }}>🌐</div>
                  <p style={{ fontWeight: 600, fontSize: 13.5, margin: "0 0 4px", lineHeight: 1.3 }}>{s.title}</p>
                  <p style={{ fontSize: 11.5, color: "var(--purple-deep)", margin: "0 0 6px", fontWeight: 500 }}>
                    {s.author_display}
                  </p>
                  <div style={{ background: "#0f0f1e", borderRadius: 8, padding: "6px 8px", fontSize: 9.5, color: "#6B7280", fontFamily: "monospace", overflow: "hidden", maxHeight: 40, lineHeight: 1.4 }}>
                    {s.preview?.slice(0, 120)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右侧：选中作品详情/预览 */}
      {selected && (
        <div style={{ flex: 1, borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", background: "rgba(245,243,255,0.95)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>{selected.title}</p>
              <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>by {selected.author_display}</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => runPreview(selected.code)} style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 12.5, padding: "6px 14px", borderRadius: 16, cursor: "pointer", fontWeight: 500 }}>
                🌐 预览
              </button>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 20, color: "var(--ink-soft)", cursor: "pointer" }}>×</button>
            </div>
          </div>
          {previewCode === selected.code ? (
            <iframe
              srcDoc={previewCode}
              style={{ flex: 1, border: "none", background: "#fff" }}
              sandbox="allow-scripts allow-same-origin"
              title="预览"
            />
          ) : (
            <div style={{ flex: 1, overflow: "auto", background: "#0f0f1e", padding: 16 }}>
              <pre style={{ color: "#cdd6f4", fontSize: 12.5, margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                <code>{selected.code}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
