import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { streamFetch } from "../../lib/useStreamChat";
import { parseFileBlocks, stripFileBlocks } from "../../lib/parseCodeBlocks";

// Sandpack 体积大，用动态导入避免拖慢首屏、避免SSR报错
const SandpackStudio = dynamic(() => import("../../components/SandpackStudio"), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-soft)" }}>
      正在准备代码沙盒...
    </div>
  ),
});

const DEFAULT_FILES = {
  "/index.html": `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <title>我的第一个网页</title>
</head>
<body>
  <h1>你好，世界！</h1>
  <p>这是我用 IStarMate 做的第一个网页。</p>
</body>
</html>`,
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

// 渲染代码星消息：把 file 代码块转成提示，其余正常显示
function renderMentorMessage(text) {
  const stripped = stripFileBlocks(text);
  const parts = stripped.split(/(```[\s\S]*?```|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const code = lines.slice(1, -1).join("\n");
      return (
        <pre key={i} style={{ background: "#1a1a2e", color: "#cdd6f4", padding: "12px 14px", borderRadius: 10, overflowX: "auto", fontSize: 12.5, lineHeight: 1.6, margin: "8px 0" }}>
          <code>{code}</code>
        </pre>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return <code key={i} style={{ background: "rgba(139,127,217,0.15)", color: "var(--purple-deep)", padding: "1px 6px", borderRadius: 4, fontSize: "0.9em" }}>{part.slice(1, -1)}</code>;
    }
    return <span key={i} style={{ whiteSpace: "pre-wrap" }}>{part}</span>;
  });
}

export default function Studio() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [files, setFiles] = useState(DEFAULT_FILES);
  const [sandboxError, setSandboxError] = useState(null);
  const [mobileTab, setMobileTab] = useState("chat"); // chat | code (窄屏切换)
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const stageParam = router.query.stage ? Number(router.query.stage) : null;

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) { setOpened(true); openChat(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function openChat() {
    await runStream([{ role: "user", content: stageParam ? `开始第${stageParam}课` : "开始" }], []);
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  // 把沙盒文件转成 { 路径: 内容 } 传给后端（去掉开头的斜杠更易读）
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
        // 解析代码星生成的文件，注入沙盒
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
          // 有新代码时，窄屏自动切到代码视图让用户看到效果
          if (typeof window !== "undefined" && window.innerWidth < 900) setMobileTab("code");
        }
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      { sandboxFiles: filesForApi(), sandboxError, stage: stageParam },
      abortRef
    );
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input.trim() }];
    setMessages(next);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await runStream(next, next);
  }

  function askAboutError() {
    if (!sandboxError) return;
    setInput("我的代码运行出错了，能帮我看看问题在哪吗？");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }
  function autoResize(e) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  }

  if (status !== "authenticated") return null;

  const allMessages = [...messages, ...(streamingText ? [{ role: "assistant", content: streamingText, streaming: true }] : [])];

  // 聊天面板
  const chatPanel = (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minWidth: 0 }}>
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 0" }}>
        {allMessages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 18, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: m.role === "user" ? "linear-gradient(135deg, var(--purple), var(--purple-deep))" : "linear-gradient(135deg, #2a2a3e, #1a1a2e)" }}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div style={{ maxWidth: "82%", background: m.role === "user" ? "linear-gradient(135deg, var(--purple), var(--purple-deep))" : "rgba(255,255,255,0.95)", color: m.role === "user" ? "#fff" : "var(--ink)", border: m.role === "user" ? "none" : "1px solid rgba(124,111,224,0.12)", borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "11px 14px", fontSize: 14, lineHeight: 1.7 }}>
              {m.role === "assistant" ? renderMentorMessage(m.content) : m.content}
              {m.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
            </div>
          </div>
        ))}
        {loading && !streamingText && (
          <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #2a2a3e, #1a1a2e)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🤖</div>
            <div style={{ background: "rgba(255,255,255,0.95)", border: "1px solid rgba(124,111,224,0.12)", borderRadius: "4px 16px 16px 16px", padding: "11px 14px" }}><ThinkingDots /></div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 12 }} />
      </div>

      {/* 报错时的快捷提示 */}
      {sandboxError && (
        <div style={{ padding: "8px 14px", background: "#FEF2F2", borderTop: "1px solid #FECACA", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#DC2626", flex: 1 }}>沙盒有报错</span>
          <button onClick={askAboutError} style={{ background: "#DC2626", color: "#fff", border: "none", fontSize: 11.5, padding: "5px 10px", borderRadius: 7, cursor: "pointer" }}>让代码星帮我看</button>
        </div>
      )}

      {/* 输入区 */}
      <div style={{ padding: "10px 14px 16px", borderTop: "1px solid var(--line)", background: "rgba(245,243,255,0.9)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#fff", border: "1.5px solid rgba(124,111,224,0.18)", borderRadius: 14, padding: "6px 6px 6px 14px" }}>
          <textarea ref={textareaRef} rows={1} placeholder="问代码星，或告诉他你想做什么..."
            value={input} onChange={(e) => { setInput(e.target.value); autoResize(e); }} onKeyDown={handleKeyDown}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 14, fontFamily: "inherit", lineHeight: 1.5, color: "var(--ink)", minHeight: 22, maxHeight: 140 }} />
          {loading ? (
            <button onClick={stopStream} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: "rgba(201,74,74,0.12)", color: "var(--coral-deep)", cursor: "pointer", fontSize: 15, flexShrink: 0 }}>⏹</button>
          ) : (
            <button onClick={send} disabled={!input.trim()} style={{ width: 34, height: 34, borderRadius: "50%", border: "none", background: !input.trim() ? "rgba(124,111,224,0.1)" : "linear-gradient(135deg, #9B8FF0, #7C6FE0)", color: "#fff", cursor: !input.trim() ? "default" : "pointer", fontSize: 16, flexShrink: 0 }}>↑</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      {/* 顶栏 */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "rgba(245,243,255,0.95)", flexShrink: 0, position: "relative", zIndex: 10 }}>
        <button onClick={() => router.push("/ai-course")}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 13.5, padding: "8px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 500, flexShrink: 0 }}>
          ← 退出
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>代码星工作室</p>
          <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: 0 }}>和代码星一起，边写边跑</p>
        </div>
        {/* 窄屏切换 */}
        <div className="studio-mobile-tabs" style={{ display: "none", gap: 4, background: "var(--purple-light)", borderRadius: 20, padding: 3 }}>
          <button onClick={() => setMobileTab("chat")} style={{ border: "none", background: mobileTab === "chat" ? "#fff" : "transparent", color: "var(--ink)", fontSize: 12.5, padding: "5px 12px", borderRadius: 16, cursor: "pointer" }}>对话</button>
          <button onClick={() => setMobileTab("code")} style={{ border: "none", background: mobileTab === "code" ? "#fff" : "transparent", color: "var(--ink)", fontSize: 12.5, padding: "5px 12px", borderRadius: 16, cursor: "pointer" }}>代码</button>
        </div>
      </div>

      {/* 主体：左对话 右沙盒 */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <div className={`studio-chat ${mobileTab === "chat" ? "active" : ""}`} style={{ width: "42%", borderRight: "1px solid var(--line)", minWidth: 0 }}>
          {chatPanel}
        </div>
        <div className={`studio-code ${mobileTab === "code" ? "active" : ""}`} style={{ flex: 1, minWidth: 0 }}>
          <SandpackStudio files={files} onFilesChange={setFiles} onError={setSandboxError} />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .studio-chat, .studio-code { width: 100% !important; flex: none !important; display: none !important; }
          .studio-chat.active, .studio-code.active { display: block !important; height: 100%; }
          .studio-mobile-tabs { display: flex !important; }
        }
      `}</style>

      {/* 保底浮动退出按钮：任何情况下都能退出 */}
      <button
        onClick={() => router.push("/ai-course")}
        title="退出工作室"
        style={{
          position: "fixed", top: 12, right: 12, zIndex: 9999,
          width: 40, height: 40, borderRadius: "50%",
          background: "rgba(124,111,224,0.9)", color: "#fff",
          border: "2px solid #fff", cursor: "pointer", fontSize: 18,
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        ✕
      </button>
    </div>
  );
}
