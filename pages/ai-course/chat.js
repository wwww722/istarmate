import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../../lib/useStreamChat";
import { renderMarkdown } from "../../lib/renderMarkdown";
import { ThinkingDots } from "../../components/PageTransition";

export default function AiCourseChat() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) { setOpened(true); loadHistory(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function loadHistory() {
    // 先尝试加载历史对话
    const r = await fetch("/api/ai-course-session");
    const data = await r.json();
    if (data.messages?.length > 1) {
      // 有历史记录，直接恢复
      setMessages(data.messages);
    } else {
      // 没有历史，开新对话
      openChat();
    }
  }

  async function saveHistory(msgs) {
    await fetch("/api/ai-course-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs }),
    });
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function openChat() {
    await runStream([{ role: "user", content: "开始" }], []);
  }

  async function runStream(apiMessages, displayMessages) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch(
      "/api/ai-course-chat",
      apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMessages, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        saveHistory(next); // 保存到数据库
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      }
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

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function autoResize(e) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  }

  const allMessages = [
    ...messages,
    ...(streamingText ? [{ role: "assistant", content: streamingText, streaming: true }] : [])
  ];

  if (status !== "authenticated") return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", maxWidth: 680, margin: "0 auto" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "var(--bg)", position: "sticky", top: 0, zIndex: 10 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <div>
          <p style={{ fontSize: 14.5, fontWeight: 500, margin: 0 }}>AI 编程导师</p>
          <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>帮你做出第一个网站</p>
        </div>
        <button
          onClick={() => {
          setMessages([]); setOpened(false);
          fetch("/api/ai-course-session", { method: "DELETE" });
          setTimeout(() => { setOpened(true); openChat(); }, 100);
        }}
          style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-soft)", background: "transparent", border: "1px solid var(--line)", padding: "5px 12px", borderRadius: 8, cursor: "pointer" }}
        >
          新对话
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 0" }}>
        {allMessages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: 10, marginBottom: 20, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: m.role === "user" ? "var(--purple)" : "var(--purple-light)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
              {m.role === "user" ? "👤" : "🤖"}
            </div>
            <div style={{ maxWidth: "85%", background: m.role === "user" ? "var(--purple)" : "var(--card)", color: m.role === "user" ? "#fff" : "var(--ink)", border: m.role === "user" ? "none" : "1px solid var(--line)", borderRadius: m.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "12px 16px", fontSize: 14.5, lineHeight: 1.7 }}>
              {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
              {m.streaming && <span style={{ opacity: 0.5 }}>▌</span>}
            </div>
          </div>
        ))}
        {loading && !streamingText && (
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--purple-light)", display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", color: "var(--ink-soft)" }}><ThinkingDots /></div>
          </div>
        )}
        <div ref={bottomRef} style={{ height: 20 }} />
      </div>

      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid var(--line)", background: "var(--bg)" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: "8px 8px 8px 14px" }}>
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="说说你想做什么，或者粘贴代码/报错信息..."
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(e); }}
            onKeyDown={handleKeyDown}
            style={{ flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 14.5, fontFamily: "inherit", lineHeight: 1.6, color: "var(--ink)", minHeight: 24, maxHeight: 160 }}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{ width: 34, height: 34, borderRadius: 10, border: "none", background: loading || !input.trim() ? "var(--line)" : "var(--purple)", color: "#fff", cursor: loading || !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 16 }}
          >
            ↑
          </button>
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink-soft)", textAlign: "center", marginTop: 8 }}>Enter 发送 · Shift+Enter 换行</p>
      </div>
    </div>
  );
}
