import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { streamFetchSmooth as streamFetch } from "../../lib/useStreamChat";
import { parseFileBlocks, stripFileBlocks } from "../../lib/parseCodeBlocks";
import { RichText } from "../../lib/richText";
import ChatInput from "../../components/ChatInput";
import ConversationSidebar from "../../components/ConversationSidebar";
import { TEMPLATES } from "../../lib/projectTemplates";
import { toggleTheme } from "../../lib/theme";
import Celebration from "../../components/Celebration";

const PythonSandbox = dynamic(() => import("../../components/PythonSandbox"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8888aa", background: "#1e1e2e" }}>
      正在准备 Python 环境...
    </div>
  ),
});

const SandpackStudio = dynamic(() => import("../../components/SandpackStudio"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#8888aa", background: "#1e1e2e" }}>
      正在准备代码沙盒...
    </div>
  ),
});

const STARTER_STATIC = {
  "/index.html": `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>我的网页</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <h1>你好，世界！</h1>
  <p>这是我用 IStarMate 做的第一个网页。</p>
</body>
</html>`,
  "/styles.css": `body {
  font-family: sans-serif;
  text-align: center;
  padding: 40px;
  background: #f5f3ff;
  color: #1a1633;
}`,
};

const STARTER_PYTHON = {
  "/main.py": `# 我的第一个 Python 程序
print("你好，Python！")

# 试试改这里的数字
for i in range(3):
    print(f"第 {i + 1} 次")
`,
};

const STARTER_REACT = {
  "/App.js": `export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", textAlign: "center", padding: 40 }}>
      <h1>你好，React！</h1>
      <p>这是我的第一个 React 应用。</p>
    </div>
  );
}`,
};

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--purple)", animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
      ))}
    </div>
  );
}

function MentorMessage({ content, streaming, onRegenerate, isLast }) {
  const [copied, setCopied] = useState(false);
  const stripped = stripFileBlocks(content);
  function copy() {
    navigator.clipboard?.writeText(content);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 20, alignItems: "flex-start" }}>
      <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, background: "linear-gradient(135deg, #B8AEFF, #7C6FE0)", boxShadow: "0 2px 8px rgba(124,111,224,0.3)" }}>✦</div>
      <div style={{ maxWidth: "88%", minWidth: 0 }}>
        <div style={{ background: "var(--card-solid)", border: "1px solid rgba(124,111,224,0.1)", borderRadius: "6px 16px 16px 16px", padding: "11px 15px", fontSize: 14, lineHeight: 1.7, color: "var(--ink)" }}>
          <RichText text={stripped} />
          {streaming && <span style={{ opacity: 0.5 }}>▌</span>}
        </div>
        {!streaming && content && (
          <div style={{ display: "flex", gap: 4, marginTop: 5, paddingLeft: 4 }}>
            <button onClick={copy} title="复制" style={miniBtn}>{copied ? "✓" : "⧉"}</button>
            {isLast && onRegenerate && <button onClick={onRegenerate} title="重新生成" style={miniBtn}>↻</button>}
          </div>
        )}
      </div>
    </div>
  );
}

const miniBtn = { background: "transparent", border: "none", color: "var(--ink-muted)", cursor: "pointer", fontSize: 13, padding: "3px 7px", borderRadius: 6, lineHeight: 1 };

export default function Studio() {
  const router = useRouter();
  const { status } = useSession();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [mode, setMode] = useState(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const [initialFiles, setInitialFiles] = useState(STARTER_STATIC);
  const [filesToInject, setFilesToInject] = useState(null);
  const [injectVersion, setInjectVersion] = useState(0);
  const [sandboxError, setSandboxError] = useState(null);
  const [autoFixOffered, setAutoFixOffered] = useState(false);
  const [mobileTab, setMobileTab] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [celebration, setCelebration] = useState(null); // {title, message, emoji} | null
  const [hasCelebrated, setHasCelebrated] = useState(false); // 本次会话是否已庆祝首个作品
  const currentFilesRef = useRef(STARTER_STATIC);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !booted) { setBooted(true); boot(); }
    if (typeof window !== "undefined") { try { setDark((localStorage.getItem("istarmate_theme") || "light") === "dark"); } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streamingText ? "auto" : "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => {
      try {
        if (input.trim()) localStorage.setItem(`istarmate_draft_code_${activeId}`, input);
        else localStorage.removeItem(`istarmate_draft_code_${activeId}`);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [input, activeId]);

  // 沙盒报错时，主动提议修复（每次新错误只提议一次）
  useEffect(() => {
    if (sandboxError && !loading && messages.length > 0) setAutoFixOffered(true);
    if (!sandboxError) setAutoFixOffered(false);
  }, [sandboxError, loading, messages.length]);

  async function boot() {
    const list = await loadConversations();
    if (list.length > 0) {
      await openConversation(list[0].id);
    } else {
      setShowTemplates(true); // 全新用户：先选模板
    }
  }

  async function loadConversations() {
    try {
      const r = await fetch("/api/conversations?kind=code");
      const d = await r.json();
      const list = d.conversations || [];
      setConversations(list);
      return list;
    } catch { return []; }
  }

  async function openConversation(id) {
    setActiveId(id);
    setMessages([]);
    try {
      const draft = localStorage.getItem(`istarmate_draft_code_${id}`);
      setInput(draft || "");
    } catch { setInput(""); }
    try {
      const r = await fetch(`/api/conversations?id=${id}`);
      const d = await r.json();
      const conv = d.conversation;
      if (!conv) return;
      setMessages(conv.messages || []);
      const m = conv.meta?.mode || "static";
      const f = conv.meta?.files || starterFor(m);
      setMode(m);
      setInitialFiles(f);
      currentFilesRef.current = f;
      setShowTemplates(false);
    } catch {}
  }

  function starterFor(m) {
    if (m === "react") return STARTER_REACT;
    if (m === "python") return STARTER_PYTHON;
    return STARTER_STATIC;
  }

  async function startFromTemplate(tpl) {
    const m = tpl.mode || "static";
    const starter = starterFor(m);
    const r = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "code", title: tpl.id === "blank" ? "新项目" : tpl.title, meta: { mode: m, files: starter } }),
    });
    const d = await r.json();
    const id = d.conversation?.id;
    if (!id) return;
    setActiveId(id);
    setMode(m);
    setInitialFiles(starter);
    currentFilesRef.current = starter;
    setMessages([]);
    setShowTemplates(false);
    await loadConversations();
    const opening = tpl.prompt
      ? tpl.prompt
      : `开始（我选择了${m === "react" ? "React 应用" : "纯网页"}模式）`;
    await runStream([{ role: "user", content: opening }], [{ role: "user", content: opening }], id, m);
  }

  function saveConv(msgs, convId, curMode) {
    const id = convId || activeId;
    if (!id) return;
    fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, messages: msgs, meta: { mode: curMode || mode, files: currentFilesRef.current } }),
    }).then(() => loadConversations()).catch(() => {});
  }

  async function renameConv(id, title) {
    await fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    loadConversations();
  }

  async function deleteConv(id) {
    if (!confirm("删除这个项目对话？")) return;
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    const list = await loadConversations();
    if (id === activeId) {
      if (list.length > 0) openConversation(list[0].id);
      else { setShowTemplates(true); setActiveId(null); setMessages([]); }
    }
  }

  async function pinConv(id, pinned) {
    await fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned }),
    });
    loadConversations();
  }

  async function archiveConv(id) {
    await fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, archived: true }),
    });
    const list = await loadConversations();
    if (id === activeId && list.length > 0) openConversation(list[0].id);
  }

  async function searchConv(q) {
    try {
      const r = await fetch(`/api/conversations?kind=code&q=${encodeURIComponent(q)}`);
      const d = await r.json();
      return d.results || [];
    } catch { return []; }
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  function filesForApi() {
    const out = {};
    for (const [k, v] of Object.entries(currentFilesRef.current || {})) {
      out[k.replace(/^\//, "")] = typeof v === "string" ? v : (v?.code || "");
    }
    return out;
  }

  function handleFilesChange(f) {
    currentFilesRef.current = f;
  }

  async function runStream(apiMessages, displayMessages, convId, curMode) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch("/api/code-mentor", apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMessages, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        const newFiles = parseFileBlocks(fullText);
        if (Object.keys(newFiles).length > 0) {
          setFilesToInject(newFiles);
          setInjectVersion(v => v + 1);
          const merged = { ...currentFilesRef.current };
          for (const [p, c] of Object.entries(newFiles)) {
            merged[p.startsWith("/") ? p : "/" + p] = c;
          }
          currentFilesRef.current = merged;
          setSandboxError(null);
          if (typeof window !== "undefined" && window.innerWidth < 900) setMobileTab("code");
          // 第一次做出作品，放大这个兴奋的瞬间
          if (!hasCelebrated) {
            setHasCelebrated(true);
            setTimeout(() => {
              setCelebration({
                emoji: "🎉",
                title: "你的第一个作品诞生了！",
                message: "看右边——这是你亲手做出来的，它真的能跑起来。这只是开始，你还能做出更酷的东西。",
              });
            }, 800);
          }
        }
        saveConv(next, convId, curMode);
        fetch("/api/quality-eval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, roleKind: "code" }) }).catch(() => {});
        if (next.filter(m => m.role === "assistant").length === 1) {
          fetch("/api/achievement-trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "first_ai_course" }) }).catch(() => {});
        }
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      { sandboxFiles: filesForApi(), sandboxError, mode: curMode || mode },
      abortRef
    );
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    try { if (activeId) localStorage.removeItem(`istarmate_draft_code_${activeId}`); } catch {}
    await runStream(next, next);
  }

  async function regenerate() {
    if (loading) return;
    let idx = messages.length - 1;
    while (idx >= 0 && messages[idx].role !== "assistant") idx--;
    if (idx < 0) return;
    const trimmed = messages.slice(0, idx);
    setMessages(trimmed);
    await runStream(trimmed, trimmed);
  }

  // 一键让代码星修复报错
  async function autoFix() {
    if (loading || !sandboxError) return;
    setAutoFixOffered(false);
    const msg = `我的代码报错了：${String(sandboxError).slice(0, 300)}\n\n帮我看看是哪里的问题，直接给我修好的完整代码。`;
    const next = [...messages, { role: "user", content: msg }];
    setMessages(next);
    await runStream(next, next);
  }

  // 讲解选中的代码：读取用户在编辑器里选中的文本
  async function explainSelection() {
    if (loading) return;
    const sel = typeof window !== "undefined" ? String(window.getSelection?.() || "").trim() : "";
    if (!sel) {
      alert("先在右边代码里选中你想问的那几行，再点这里～");
      return;
    }
    const userMsg = { role: "user", content: `解释一下这段代码：\n${sel}` };
    const next = [...messages, userMsg];
    setMessages(next);
    if (typeof window !== "undefined" && window.innerWidth < 900) setMobileTab("chat");
    // 带上explainLine给API
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch("/api/code-mentor", next,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const done = [...next, { role: "assistant", content: fullText }];
        setMessages(done);
        setStreamingText("");
        setLoading(false);
        saveConv(done, activeId, mode);
      },
      (err) => {
        setMessages([...next, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      { sandboxFiles: filesForApi(), mode, explainLine: sel },
      abortRef
    );
  }

  function switchTheme() {
    const t = toggleTheme();
    setDark(t === "dark");
  }

  if (status !== "authenticated") return null;

  // 模板选择界面
  if (showTemplates) {
    return (
      <div style={{ minHeight: "100vh", padding: "24px 20px 40px", background: "var(--bg)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          <button onClick={() => router.push("/ai-course")}
            style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 13.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 500, marginBottom: 24 }}>← 返回</button>

          {conversations.length > 0 && (
            <button onClick={() => openConversation(conversations[0].id)}
              style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 13, cursor: "pointer", marginLeft: 10 }}>
              回到上个项目
            </button>
          )}

          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ fontSize: 42, marginBottom: 10 }}>🚀</div>
            <h1 style={{ fontSize: 23, fontWeight: 700, marginBottom: 6 }}>想做点什么？</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.7 }}>选一个开始，代码星会一步步带你做出来。</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 }}>
            {TEMPLATES.map(t => (
              <div key={t.id} onClick={() => startFromTemplate(t)} className="card"
                style={{ padding: "16px 14px", cursor: "pointer", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>{t.emoji}</div>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>{t.title}</p>
                <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.4 }}>{t.desc}</p>
                {t.mode === "react" && (
                  <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, background: "var(--purple)", color: "#fff", padding: "2px 7px", borderRadius: 8 }}>React</span>
                )}
                {t.mode === "python" && (
                  <span style={{ display: "inline-block", marginTop: 6, fontSize: 10, background: "var(--teal)", color: "#fff", padding: "2px 7px", borderRadius: 8 }}>Python</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allMessages = [...messages, ...(streamingText ? [{ role: "assistant", content: streamingText, streaming: true }] : [])];
  let lastAiIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "assistant") { lastAiIdx = i; break; } }

  const chatPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {allMessages.map((m, i) => (
          m.role === "user" ? (
            <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
              <div style={{ maxWidth: "85%", background: "linear-gradient(135deg, var(--purple), var(--purple-deep))", color: "#fff", borderRadius: "16px 6px 16px 16px", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", boxShadow: "0 4px 14px rgba(124,111,224,0.28)" }}>
                {m.content}
              </div>
            </div>
          ) : (
            <MentorMessage key={i} content={m.content} streaming={m.streaming}
              onRegenerate={regenerate} isLast={i === lastAiIdx && !loading} />
          )
        ))}
        {loading && !streamingText && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: "linear-gradient(135deg, #B8AEFF, #7C6FE0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
            <div style={{ background: "var(--card-solid)", border: "1px solid rgba(124,111,224,0.1)", borderRadius: "6px 16px 16px 16px", padding: "11px 15px" }}><ThinkingDots /></div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 12 }} />
      </div>

      {/* 报错时主动提议修复 */}
      {autoFixOffered && sandboxError && (
        <div style={{ padding: "10px 14px", background: "#FEF2F2", borderTop: "1px solid #FECACA" }}>
          <p style={{ fontSize: 12.5, color: "#DC2626", margin: "0 0 8px", lineHeight: 1.5 }}>
            ⚠️ 我发现你的代码有个错误
          </p>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={autoFix} style={{ background: "#DC2626", color: "#fff", border: "none", fontSize: 12.5, padding: "6px 14px", borderRadius: 8, cursor: "pointer", fontWeight: 500 }}>
              🔧 帮我修好
            </button>
            <button onClick={() => setAutoFixOffered(false)} style={{ background: "transparent", border: "none", color: "#9CA3AF", fontSize: 12.5, cursor: "pointer" }}>
              我自己看看
            </button>
          </div>
        </div>
      )}

      <ChatInput value={input} onChange={setInput} onSend={send} onStop={stopStream} loading={loading}
        placeholder="问代码星，或告诉他你想做什么..." enableVoice />
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--bg)" }}>
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={openConversation}
        onNew={() => setShowTemplates(true)}
        onRename={renameConv}
        onDelete={deleteConv}
        onPin={pinConv}
        onArchive={archiveConv}
        onSearch={searchConv}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "var(--card)", backdropFilter: "blur(20px)", flexShrink: 0, position: "relative", zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(true)} className="conv-toggle"
            style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 19, cursor: "pointer", padding: 0, display: "none" }}>☰</button>
          <button onClick={() => router.push("/ai-course")}
            style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 13.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 500, flexShrink: 0 }}>← 退出</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>代码星 · {mode === "react" ? "React" : mode === "python" ? "Python" : "网页"}</p>
            <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: 0 }}>边写边跑</p>
          </div>
          <button onClick={switchTheme} title="切换主题" style={{ background: "transparent", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 6px" }}>{dark ? "☀️" : "🌙"}</button>
          <div className="studio-mobile-tabs" style={{ display: "none", gap: 4, background: "var(--purple-light)", borderRadius: 20, padding: 3 }}>
            <button onClick={() => setMobileTab("chat")} style={{ border: "none", background: mobileTab === "chat" ? "var(--card-solid)" : "transparent", color: "var(--ink)", fontSize: 12.5, padding: "5px 12px", borderRadius: 16, cursor: "pointer" }}>对话</button>
            <button onClick={() => setMobileTab("code")} style={{ border: "none", background: mobileTab === "code" ? "var(--card-solid)" : "transparent", color: "var(--ink)", fontSize: 12.5, padding: "5px 12px", borderRadius: 16, cursor: "pointer" }}>代码</button>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
          <div className={`studio-chat ${mobileTab === "chat" ? "active" : ""}`} style={{ width: "40%", borderRight: "1px solid var(--line)", minWidth: 0 }}>
            {chatPanel}
          </div>
          <div className={`studio-code ${mobileTab === "code" ? "active" : ""}`} style={{ flex: 1, minWidth: 0, position: "relative" }}>
            {mode !== "python" && (
              <button onClick={explainSelection} disabled={loading} title="选中代码后点这里，代码星帮你讲解"
                style={{ position: "absolute", top: 8, right: 12, zIndex: 20, background: "rgba(124,111,224,0.92)", color: "#fff", border: "none", borderRadius: 18, padding: "6px 12px", fontSize: 12, cursor: loading ? "default" : "pointer", fontWeight: 500, boxShadow: "0 2px 10px rgba(0,0,0,0.2)", opacity: loading ? 0.5 : 1 }}>
                💡 讲解选中代码
              </button>
            )}
            {mode === "python" ? (
              <PythonSandbox
                code={(filesToInject?.["main.py"] || filesToInject?.["/main.py"] || currentFilesRef.current?.["/main.py"] || "")}
                onCodeChange={(v) => { currentFilesRef.current = { "/main.py": v }; }}
                onError={setSandboxError}
              />
            ) : (
              <SandpackStudio initialFiles={initialFiles} filesToInject={filesToInject} injectVersion={injectVersion}
                onFilesChange={handleFilesChange} onError={setSandboxError} mode={mode || "static"} />
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .studio-chat, .studio-code { width: 100% !important; flex: none !important; display: none !important; }
          .studio-chat.active, .studio-code.active { display: block !important; height: 100%; }
          .studio-mobile-tabs { display: flex !important; }
          .conv-toggle { display: block !important; }
        }
      `}</style>

      {celebration && (
        <Celebration
          emoji={celebration.emoji}
          title={celebration.title}
          message={celebration.message}
          onClose={() => setCelebration(null)}
          onShare={() => { setCelebration(null); router.push("/ai-course/projects"); }}
        />
      )}
    </div>
  );
}
