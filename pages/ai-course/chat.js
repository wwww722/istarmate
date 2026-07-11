import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../../lib/useStreamChat";

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "4px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--purple)", animation: `bounce 1.2s ease-in-out ${i*0.2}s infinite` }} />
      ))}
    </div>
  );
}

function CodeBlock({ code, lang, onSave, onPreview }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ margin: "10px 0", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(139,127,217,0.2)" }}>
      <div style={{ background: "#1a1a2e", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#9B8FF0", fontWeight: 500 }}>{lang || "code"}</span>
        <div style={{ display: "flex", gap: 6 }}>
          {(lang === "html" || !lang) && (
            <button onClick={() => onPreview(code)} style={{ background: "rgba(107,158,232,0.2)", border: "none", color: "#6B9EE8", cursor: "pointer", fontSize: 11.5, padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
              🌐 预览
            </button>
          )}
          <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#8888aa", cursor: "pointer", fontSize: 11.5, padding: "3px 10px", borderRadius: 6 }}>
            {copied ? "✓ 已复制" : "复制"}
          </button>
          <button onClick={() => onSave(code, lang)} style={{ background: "rgba(139,127,217,0.2)", border: "none", color: "#9B8FF0", cursor: "pointer", fontSize: 11.5, padding: "3px 10px", borderRadius: 6, fontWeight: 500 }}>
            💾 保存
          </button>
        </div>
      </div>
      <pre style={{ background: "#0f0f1e", color: "#cdd6f4", margin: 0, padding: "16px", overflowX: "auto", fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 400 }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderMessage(text, onSave, onPreview) {
  const parts = text.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const lang = lines[0].replace("```", "").trim() || "html";
      const code = lines.slice(1, -1).join("\n");
      return <CodeBlock key={i} code={code} lang={lang} onSave={onSave} onPreview={onPreview} />;
    }
    // 处理行内格式
    const formatted = part.split(/(\*\*.*?\*\*|`.*?`)/g).map((t, j) => {
      if (t.startsWith("**") && t.endsWith("**")) return <strong key={j}>{t.slice(2,-2)}</strong>;
      if (t.startsWith("`") && t.endsWith("`") && t.length > 2) return <code key={j} style={{ background: "rgba(139,127,217,0.12)", color: "var(--purple-deep)", padding: "1px 5px", borderRadius: 4, fontSize: "0.9em" }}>{t.slice(1,-1)}</code>;
      return <span key={j} style={{ whiteSpace: "pre-wrap" }}>{t}</span>;
    });
    return <span key={i}>{formatted}</span>;
  });
}

export default function AiCourseChat() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const [previewCode, setPreviewCode] = useState(null);
  const [previewError, setPreviewError] = useState(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);
  const stageParam = router.query.stage ? Number(router.query.stage) : null;

  // 监听预览iframe里的报错，自动提示可以让代码星帮忙
  useEffect(() => {
    function onMessage(e) {
      if (e.data && e.data.type === "istarmate-preview-error") {
        setPreviewError(e.data.message || "代码运行出错了");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) { setOpened(true); loadHistory(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function loadHistory() {
    const r = await fetch("/api/ai-course-session");
    const data = await r.json();
    if (data.messages?.length > 1) {
      setMessages(data.messages);
    } else {
      openChat();
    }
  }

  async function saveHistory(msgs) {
    await fetch("/api/ai-course-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs }),
    });
    // 触发AI课程成就
    if (msgs.length === 2) {
      fetch("/api/achievement-trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "first_ai_course" }) }).catch(() => {});
    }
  }

  async function openChat() {
    const stageContent = stageParam
      ? `开始第${stageParam}课`
      : "开始";
    await runStream([{ role: "user", content: stageContent }], []);
  }

  function handlePreviewError() {
    if (!previewError) return;
    const debugMsg = `我的代码运行出错了，报错信息是：${previewError}。能帮我看看哪里有问题吗？`;
    setInput(debugMsg);
    setPreviewError(null);
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  async function runStream(apiMessages, displayMessages) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch("/api/ai-course-chat", apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMessages, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        saveHistory(next);
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      stageParam ? { stage: stageParam } : {},
      abortRef
    );
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await runStream(next, next);
  }

  async function saveSnippet(code, lang) {
    // 先看有没有已保存的项目，让用户选择"更新到已有项目"还是"新建"
    let existing = [];
    try {
      const lr = await fetch("/api/code-snippets");
      const ld = await lr.json();
      existing = ld.snippets || [];
    } catch {}

    if (existing.length > 0) {
      const updateExisting = window.confirm(
        `你已有 ${existing.length} 个项目。\n\n点"确定"：更新到最近的项目「${existing[0].title}」并保存为新版本\n点"取消"：新建一个项目`
      );
      if (updateExisting) {
        const r = await fetch("/api/code-snippets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snippetId: existing[0].id, code, versionNote: "在编程课里迭代" }),
        });
        if (r.ok) alert(`✅ 已更新「${existing[0].title}」并保存为新版本！`);
        return;
      }
    }

    const title = window.prompt("给这个项目起个名字：", "我的网站 " + new Date().toLocaleDateString("zh-CN"));
    if (!title) return;
    const r = await fetch("/api/code-snippets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, code, language: lang || "html" }),
    });
    if (r.ok) {
      alert("✅ 已保存到「我的项目」！");
      // 如果在学习路径的某个阶段，标记完成
      if (stageParam) {
        fetch("/api/course-progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: stageParam }),
        }).catch(() => {});
      }
    }
  }

  function handlePreview(code) {
    setPreviewError(null);
    // 注入错误捕获脚本，把iframe里的报错通过postMessage传回来
    const errorCatcher = `<script>
window.onerror = function(msg, url, line) {
  parent.postMessage({ type: "istarmate-preview-error", message: msg + (line ? " (第" + line + "行附近)" : "") }, "*");
  return true;
};<\/script>`;
    // 把脚本插到 </head> 前，没有head就插到最前面
    let injected;
    if (code.includes("</head>")) {
      injected = code.replace("</head>", errorCatcher + "</head>");
    } else {
      injected = errorCatcher + code;
    }
    setPreviewCode(injected);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function autoResize(e) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  const allMessages = [...messages, ...(streamingText ? [{ role: "assistant", content: streamingText, streaming: true }] : [])];

  if (status !== "authenticated") return null;

  return (
    <div style={{ display: "flex", height: "100vh", maxWidth: previewCode ? "100vw" : 720, margin: "0 auto" }}>
      {/* 聊天区 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* 顶部 */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "rgba(245,243,255,0.95)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 10 }}>
          <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>代码星 · AI编程导师</p>
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>{loading ? "正在思考..." : "随时可以粘贴代码或报错"}</p>
          </div>
          <button onClick={() => router.push("/ai-course/projects")}
            style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 12, padding: "6px 12px", borderRadius: 16, cursor: "pointer", fontWeight: 500 }}>
            我的项目
          </button>
          <button onClick={() => { setMessages([]); setOpened(false); fetch("/api/ai-course-session", { method: "DELETE" }); setTimeout(() => { setOpened(true); openChat(); }, 100); }}
            style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-soft)", fontSize: 12, padding: "6px 12px", borderRadius: 16, cursor: "pointer" }}>
            新对话
          </button>
        </div>

        {/* 消息区 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0", background: "var(--bg)" }}>
          {allMessages.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: 20, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: m.role === "user" ? "linear-gradient(135deg, var(--purple), var(--purple-deep))" : "linear-gradient(135deg, #2a2a3e, #1a1a2e)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                {m.role === "user" ? "👤" : "🤖"}
              </div>
              <div style={{ maxWidth: "85%", background: m.role === "user" ? "linear-gradient(135deg, var(--purple), var(--purple-deep))" : "rgba(255,255,255,0.9)", color: m.role === "user" ? "#fff" : "var(--ink)", border: m.role === "user" ? "none" : "1px solid rgba(124,111,224,0.12)", borderRadius: m.role === "user" ? "18px 4px 18px 18px" : "4px 18px 18px 18px", padding: "12px 16px", fontSize: 14.5, lineHeight: 1.7, backdropFilter: "blur(10px)", boxShadow: m.role === "user" ? "0 4px 16px rgba(124,111,224,0.3)" : "0 2px 8px rgba(0,0,0,0.05)" }}>
                {m.role === "assistant"
                  ? renderMessage(m.content, saveSnippet, handlePreview)
                  : m.content}
                {m.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
              </div>
            </div>
          ))}
          {loading && !streamingText && (
            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #2a2a3e, #1a1a2e)", display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
              <div style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(124,111,224,0.12)", borderRadius: "4px 18px 18px 18px", padding: "12px 16px", backdropFilter: "blur(10px)" }}>
                <ThinkingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} style={{ height: 20 }} />
        </div>

        {/* 输入区 */}
        <div style={{ padding: "12px 20px 20px", background: "rgba(245,243,255,0.95)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--line)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "rgba(255,255,255,0.9)", border: "1.5px solid rgba(124,111,224,0.18)", borderRadius: 16, padding: "8px 8px 8px 16px", boxShadow: "0 2px 12px rgba(90,78,201,0.06)" }}>
            <textarea ref={textareaRef} rows={1}
              placeholder="说说你想做什么，或者粘贴代码/报错信息... (Enter发送，Shift+Enter换行)"
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(e); }}
              onKeyDown={handleKeyDown}
              style={{ flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 14.5, fontFamily: "inherit", lineHeight: 1.6, color: "var(--ink)", minHeight: 24, maxHeight: 160 }}
            />
            {loading ? (
              <button onClick={stopStream} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(201,74,74,0.12)", color: "var(--coral-deep)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⏹</button>
            ) : (
              <button onClick={send} disabled={!input.trim()} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: !input.trim() ? "rgba(124,111,224,0.1)" : "linear-gradient(135deg, #9B8FF0, #7C6FE0)", color: "#fff", cursor: !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, boxShadow: !input.trim() ? "none" : "0 4px 14px rgba(124,111,224,0.4)", transition: "all 0.2s" }}>↑</button>
            )}
          </div>
        </div>
      </div>

      {/* 内联预览面板 */}
      {previewCode && (
        <div style={{ width: "45%", borderLeft: "1px solid var(--line)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
          <div style={{ padding: "12px 16px", background: "rgba(245,243,255,0.95)", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>🌐 实时预览</span>
            <button onClick={() => { setPreviewCode(null); setPreviewError(null); }} style={{ background: "none", border: "none", color: "var(--ink-soft)", cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          {previewError && (
            <div style={{ background: "#FEF2F2", borderBottom: "1px solid #FECACA", padding: "10px 14px" }}>
              <p style={{ fontSize: 12.5, color: "#DC2626", margin: "0 0 8px", lineHeight: 1.5 }}>
                ⚠️ 代码运行出错：{previewError}
              </p>
              <button onClick={handlePreviewError} style={{
                background: "#DC2626", color: "#fff", border: "none", fontSize: 12,
                padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 500,
              }}>
                🤖 让代码星帮我看看
              </button>
            </div>
          )}
          <iframe
            srcDoc={previewCode}
            style={{ flex: 1, border: "none", background: "#fff" }}
            sandbox="allow-scripts allow-same-origin"
            title="预览"
          />
        </div>
      )}
    </div>
  );
}
