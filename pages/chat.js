import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../lib/useStreamChat";
import { renderMarkdown } from "../lib/renderMarkdown";
import { ThinkingDots } from "../components/PageTransition";

export default function Chat() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [opened, setOpened] = useState(false);
  const [feedback, setFeedback] = useState(null); // null | 1 | -1
  const [showFeedback, setShowFeedback] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened && router.isReady) {
      setOpened(true);
      const moodLabel = router.query.mood;
      openChat(moodLabel);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router.isReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function openChat(moodLabel) {
    const openingMsg = moodLabel
      ? `（用户刚才打卡选了"心情${moodLabel}"，请以星伴身份，自然地感知到TA的情绪状态，温柔地引出话题，不要生硬地说"我看到你打卡选了..."）`
      : "（开始今天的聊天，以星伴身份温暖打招呼，问问今天过得怎么样，方式要新鲜有温度，不要用固定公式）";
    await runStream([{ role: "user", content: openingMsg }], []);
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setStreamingText("");
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    await runStream(next, next);
  }

  async function runStream(apiMessages, displayMessages) {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch("/api/chat", apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMessages, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        // 超过4轮对话后显示反馈
        if (next.filter(m => m.role === "user").length >= 3) setShowFeedback(true);
        // 首次聊天成就
        if (next.filter(m => m.role === "assistant").length === 1) {
          fetch("/api/achievement-trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "first_chat" }) });
        }
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      }
    );
  }

  async function submitFeedback(rating) {
    setFeedback(rating);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: "chat", rating }),
    });
    // 同时保存对话摘要
    if (messages.length >= 4) {
      fetch("/api/chat-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="wrap" style={{ paddingBottom: 110 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>和星伴聊聊</p>
      </div>

      {messages.map((m, i) => (
        <div key={i} className={`msg-row ${m.role === "user" ? "me" : ""}`}>
          {m.role === "assistant" && <span style={{ fontSize: 20, marginRight: 8 }}>💟</span>}
          <div className={`bubble ${m.role === "user" ? "me" : "ai"}`} style={{ whiteSpace: "pre-line" }}>
            {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
          </div>
        </div>
      ))}
      {(loading || streamingText) && (
        <div className="msg-row">
          <span style={{ fontSize: 20, marginRight: 8 }}>💟</span>
          <div className="bubble ai">{streamingText || <ThinkingDots />}</div>
        </div>
      )}

      {/* 反馈区 */}
      {showFeedback && !loading && (
        <div style={{ textAlign: "center", padding: "12px 0", color: "var(--ink-soft)", fontSize: 13.5 }}>
          {feedback === null ? (
            <>
              <span>这次聊天对你有帮助吗？</span>
              <button onClick={() => submitFeedback(1)} style={{ margin: "0 8px", background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>👍</button>
              <button onClick={() => submitFeedback(-1)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>👎</button>
            </>
          ) : (
            <span>{feedback === 1 ? "谢谢你的反馈 😊" : "收到，我们会继续改进 💪"}</span>
          )}
        </div>
      )}
      <div ref={bottomRef} />

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 16px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 8 }}>
          <input className="input" style={{ marginBottom: 0 }} placeholder="说点什么..."
            value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && send()} />
          {loading ? (
            <button className="btn" style={{ width: "auto", padding: "0 14px", color: "var(--coral-deep)", borderColor: "var(--coral-deep)" }} onClick={stopStream}>■</button>
          ) : (
            <button className="btn primary" style={{ width: "auto", padding: "0 18px" }} onClick={send}>发送</button>
          )}
        </div>
      </div>
    </div>
  );
}
