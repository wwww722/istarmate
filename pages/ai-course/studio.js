import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { streamFetch } from "../../lib/useStreamChat";
import { parseFileBlocks, stripFileBlocks } from "../../lib/parseCodeBlocks";
import { RichText } from "../../lib/richText";
import ChatInput from "../../components/ChatInput";
import { toggleTheme } from "../../lib/theme";

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
  <title>我的第一个网页</title>
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

function MentorMessage({ content, streaming, onCopy, onRegenerate, isLast }) {
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
  const [mode, setMode] = useState(null); // null=未选择, "static", "react"
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [files, setFiles] = useState(STARTER_STATIC);
  const [sandboxError, setSandboxError] = useState(null);
  const [mobileTab, setMobileTab] = useState("chat");
  const [dark, setDark] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);
  const stageParam = router.query.stage ? Number(router.query.stage) : null;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (typeof window !== "undefined") { try { setDark((localStorage.getItem("istarmate_theme") || "light") === "dark"); } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  function chooseMode(m) {
    setMode(m);
    setFiles(m === "react" ? STARTER_REACT : STARTER_STATIC);
    setOpened(true);
    runStream([{ role: "user", content: stageParam ? `开始第${stageParam}课（${m === "react" ? "React模式" : "网页模式"}）` : `开始（我选择了${m === "react" ? "React 应用" : "纯网页"}模式）` }], []);
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  function filesForApi() {
    const out = {};
    for (const [k, v] of Object.entries(files)) {
      out[k.replace(/^\//, "")] = typeof v === "string" ? v : (v?.code || "");
    }
    return out;
  }

  async function runStream(apiMessages, displayMessages) {
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
          setFiles(prev => {
            const merged = { ...prev };
            for (const [path, content] of Object.entries(newFiles)) {
              const key = path.startsWith("/") ? path : "/" + path;
              merged[key] = content;
            }
            return merged;
          });
          setSandboxError(null);
          if (typeof window !== "undefined" && window.innerWidth < 900) setMobileTab("code");
        }
        if (next.filter(m => m.role === "assistant").length === 1) {
          fetch("/api/achievement-trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "first_ai_course" }) }).catch(() => {});
        }
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      { sandboxFiles: filesForApi(), sandboxError, stage: stageParam, mode },
      abortRef
    );
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
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

  function switchTheme() {
    const t = toggleTheme();
    setDark(t === "dark");
  }

  if (status !== "authenticated") return null;

  // 模式选择界面
  if (!mode) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
        <button onClick={() => router.push("/ai-course")} style={{ position: "fixed", top: 16, left: 16, background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 13.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 500 }}>← 返回</button>
        <div style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
          <h1 style={{ fontSize: 23, fontWeight: 700, marginBottom: 8 }}>选择你的创作模式</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 28, lineHeight: 1.7 }}>不确定？选纯网页就好，代码星会一步步带你。</p>

          <div onClick={() => chooseMode("static")} className="card" style={{ padding: "22px 20px", marginBottom: 14, cursor: "pointer", textAlign: "left", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ fontSize: 34 }}>🌐</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>纯网页 <span style={{ fontSize: 12, background: "var(--teal)", color: "#fff", padding: "2px 8px", borderRadius: 10, marginLeft: 6 }}>推荐新手</span></p>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>HTML + CSS + JavaScript，做网页、小游戏、展示页。简单直接，马上能看到效果。</p>
            </div>
          </div>

          <div onClick={() => chooseMode("react")} className="card" style={{ padding: "22px 20px", cursor: "pointer", textAlign: "left", display: "flex", gap: 14, alignItems: "center" }}>
            <div style={{ fontSize: 34 }}>⚛️</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 4px" }}>React 应用 <span style={{ fontSize: 12, background: "var(--purple)", color: "#fff", padding: "2px 8px", borderRadius: 10, marginLeft: 6 }}>进阶</span></p>
              <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>用专业前端框架做真正的应用，能装 npm 包。适合已经会一点基础的你。</p>
            </div>
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

      {sandboxError && (
        <div style={{ padding: "8px 14px", background: "#FEF2F2", borderTop: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#DC2626", flex: 1 }}>沙盒有报错</span>
          <button onClick={() => setInput("我的代码运行出错了，能帮我看看问题在哪吗？")} style={{ background: "#DC2626", color: "#fff", border: "none", fontSize: 11.5, padding: "5px 10px", borderRadius: 7, cursor: "pointer" }}>让代码星帮我看</button>
        </div>
      )}

      <ChatInput value={input} onChange={setInput} onSend={send} onStop={stopStream} loading={loading}
        placeholder="问代码星，或告诉他你想做什么..." />
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "var(--card)", backdropFilter: "blur(20px)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={() => router.push("/ai-course")} style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 13.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 500, flexShrink: 0 }}>← 退出</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>代码星工作室 · {mode === "react" ? "React" : "网页"}</p>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: 0 }}>和代码星一起，边写边跑</p>
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
        <div className={`studio-code ${mobileTab === "code" ? "active" : ""}`} style={{ flex: 1, minWidth: 0 }}>
          <SandpackStudio files={files} onFilesChange={setFiles} onError={setSandboxError} mode={mode} />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .studio-chat, .studio-code { width: 100% !important; flex: none !important; display: none !important; }
          .studio-chat.active, .studio-code.active { display: block !important; height: 100%; }
          .studio-mobile-tabs { display: flex !important; }
        }
      `}</style>

      <button onClick={() => router.push("/ai-course")} title="退出工作室"
        style={{ position: "fixed", top: 12, right: 12, zIndex: 9999, width: 38, height: 38, borderRadius: "50%", background: "rgba(124,111,224,0.9)", color: "#fff", border: "2px solid #fff", cursor: "pointer", fontSize: 16, boxShadow: "0 4px 16px rgba(0,0,0,0.25)", display: "none", alignItems: "center", justifyContent: "center" }}
        className="studio-escape">✕</button>
      <style>{`@media (max-width: 900px) { .studio-escape { display: flex !important; } }`}</style>
    </div>
  );
}
