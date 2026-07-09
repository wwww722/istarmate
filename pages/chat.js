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
  const bottomRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened && router.isReady) {
      setOpened(true);
      const moodFromQuery = router.query.mood; // 从仪表盘带过来的心情
      openChat(moodFromQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router.isReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function openChat(moodLabel) {
    // 如果带了心情参数，用带情绪背景的开场；否则用普通打招呼
    const openingMsg = moodLabel
      ? `（用户刚才在今日打卡里选了"心情${moodLabel}"，请以星伴的身份，温柔地问问TA今天发生了什么让心情变得${moodLabel}，不要说"我看到你打卡选了XXX"这种生硬的话，要自然地引出话题，像是你感觉到了TA的情绪一样）`
      : "（开始今天的聊天，跟我打个招呼，问问我今天过得怎么样）";

    await runStream([{ role: "user", content: openingMsg }], []);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    await runStream(next, next);
  }

  async function runStream(apiMessages, displayMessages) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch(
      "/api/chat",
      apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        setMessages([...displayMessages, { role: "assistant", content: fullText }]);
        setStreamingText("");
        setLoading(false);
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      }
    );
  }

  if (status !== "authenticated") return null;

  return (
    <div className="wrap" style={{ paddingBottom: 110 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
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
          <div className="bubble ai" style={{ whiteSpace: "pre-line" }}>
            {streamingText || <ThinkingDots />}
          </div>
        </div>
      )}
      <div ref={bottomRef} />

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 16px"
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ marginBottom: 0 }}
            placeholder="说点什么..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn primary" style={{ width: "auto", padding: "0 18px" }}
            onClick={send} disabled={loading}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
