import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function SharedWork() {
  const router = useRouter();
  const { shareId } = router.query;
  const [snippet, setSnippet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareId) return;
    load(shareId);
  }, [shareId]);

  async function load(id) {
    try {
      const r = await fetch(`/api/shared/${id}`);
      if (!r.ok) { setNotFound(true); setLoading(false); return; }
      const data = await r.json();
      if (data.snippet) setSnippet(data.snippet);
      else setNotFound(true);
    } catch {
      setNotFound(true);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-soft)" }}>加载中...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>作品不存在</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>这个链接可能已失效，或作品已被删除。</p>
        <a href="/" style={{ color: "var(--purple-deep)", textDecoration: "none", fontWeight: 500 }}>去 IStarMate 看看 →</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 顶部横幅 */}
      <div style={{ padding: "12px 20px", background: "linear-gradient(135deg, #8B7FD9, #6B9EE8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{snippet.title}</p>
          <p style={{ fontSize: 11.5, opacity: 0.85, margin: 0 }}>用 IStarMate 做的作品 ✨</p>
        </div>
        <a href="/" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", textDecoration: "none", fontSize: 12.5, padding: "7px 14px", borderRadius: 20, fontWeight: 500 }}>
          我也要做 →
        </a>
      </div>

      {/* 作品渲染 */}
      <iframe
        srcDoc={snippet.code}
        style={{ flex: 1, border: "none", width: "100%", background: "#fff" }}
        sandbox="allow-scripts allow-same-origin"
        title={snippet.title}
      />
    </div>
  );
}
