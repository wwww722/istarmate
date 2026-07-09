import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function MyProjects() {
  const router = useRouter();
  const { status } = useSession();
  const [snippets, setSnippets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
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

  function previewCode(code) {
    const blob = new Blob([code], { type: "text/html" });
    window.open(URL.createObjectURL(blob), "_blank");
  }

  if (status !== "authenticated" || loading) return null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>我的项目</h2>
      </div>

      {snippets.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💻</div>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8 }}>
            还没有保存的项目。<br />在AI编程课里做出代码后，<br />点代码块右上角的 💾 保存 按钮就会出现在这里。
          </p>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => router.push("/ai-course/chat")}>
            去做我的第一个网站 →
          </button>
        </div>
      ) : selected ? (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>{selected.title}</h3>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 13 }}>← 返回列表</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={() => previewCode(selected.code)}>🌐 在浏览器预览</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => navigator.clipboard?.writeText(selected.code)}>📋 复制代码</button>
          </div>
          <div style={{ background: "#1e1e2e", borderRadius: 14, padding: 16, overflow: "auto", maxHeight: "60vh" }}>
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
              <div key={s.id} className="card" style={{ padding: "14px", cursor: "pointer", position: "relative" }} onClick={() => loadFull(s.id)}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{s.language === "html" ? "🌐" : "💻"}</div>
                <p style={{ fontWeight: 500, fontSize: 13.5, margin: "0 0 4px", lineHeight: 1.3 }}>{s.title}</p>
                <p style={{ color: "var(--ink-soft)", fontSize: 11.5, margin: "0 0 8px" }}>{new Date(s.created_at).toLocaleDateString("zh-CN")}</p>
                <div style={{ background: "var(--bg)", borderRadius: 8, padding: "6px 8px", fontSize: 10, color: "var(--ink-soft)", fontFamily: "monospace", overflow: "hidden", maxHeight: 50 }}>
                  {s.preview?.slice(0, 80)}...
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteSnippet(s.id); }}
                  style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", color: "var(--ink-muted)", cursor: "pointer", fontSize: 14 }}>×</button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
