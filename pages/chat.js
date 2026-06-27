import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function Chat() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) {
      setOpened(true);
      openChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function openChat() {
    setLoading(true);
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: "（开始今天的聊天，跟我打个招呼，问问我今天心情怎么样）" }] }),
    });
    const data = await r.json();
    setLoading(false);
    if (data.reply) setMessages([{ role: "assistant", content: data.reply }]);
    else setMessages([{ role: "assistant", content: "（暂时连不上AI，" + (data.error || "请稍后再试") + "）" }]);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const r = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const data = await r.json();
    setLoading(false);
    if (data.reply) setMessages([...next, { role: "assistant", content: data.reply }]);
    else setMessages([...next, { role: "assistant", content: "（暂时连不上AI，" + (data.error || "请稍后再试") + "）" }]);
  }

  if (status !== "authenticated") return null;

  return (
    <div className="wrap" style={{ paddingBottom: 110 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>和小伙伴聊聊</p>
      </div>

      {messages.map((m, i) => (
        <div key={i} className={`msg-row ${m.role === "user" ? "me" : ""}`}>
          {m.role === "assistant" && <span style={{ fontSize: 20, marginRight: 8 }}>💟</span>}
          <div className={`bubble ${m.role === "user" ? "me" : "ai"}`} style={{ whiteSpace: "pre-line" }}>{m.content}</div>
        </div>
      ))}
      {loading && (
        <div className="msg-row">
          <span style={{ fontSize: 20, marginRight: 8 }}>💟</span>
          <div className="bubble ai">...</div>
        </div>
      )}
      <div ref={bottomRef} />

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 16px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ marginBottom: 0 }}
            placeholder="说点什么..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn primary" style={{ width: "auto", padding: "0 18px" }} onClick={send} disabled={loading}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
