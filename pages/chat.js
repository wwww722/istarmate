import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";

export default function Chat() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    const p = JSON.parse(localStorage.getItem("istarmate_profile") || "null");
    const q = JSON.parse(localStorage.getItem("istarmate_questionnaire") || "null");
    if (!p || !q) {
      router.push("/onboarding");
      return;
    }
    setProfile(p);
    setQuestionnaire(q);
    openTodayScene(p, q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openTodayScene(p, q) {
    setLoading(true);
    const res = await callApi([], p, q);
    setLoading(false);
    if (res?.reply) {
      setMessages([{ role: "assistant", content: res.reply }]);
    }
  }

  async function callApi(history, p, q) {
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.length ? history : [{ role: "user", content: "（开始今天的对话）" }],
          profile: p,
          questionnaire: q,
        }),
      });
      return await r.json();
    } catch (e) {
      return { error: String(e) };
    }
  }

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    const res = await callApi(next, profile, questionnaire);
    setLoading(false);
    if (res?.reply) {
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } else {
      setMessages([...next, { role: "assistant", content: "（AI 暂时连不上，请检查后端 ANTHROPIC_API_KEY 配置）" }]);
    }
  }

  return (
    <div className="wrap" style={{ paddingBottom: 100 }}>
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>今天的小剧场</h2>

      <div>
        {messages.map((m, i) => (
          <div key={i} className={`msg-row ${m.role === "user" ? "me" : ""}`}>
            <div className={`bubble ${m.role === "user" ? "me" : "ai"}`}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div className="msg-row">
            <div className="bubble ai">...</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--bg)",
          borderTop: "1px solid var(--line)",
          padding: "12px 16px",
        }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto", display: "flex", gap: 8 }}>
          <input
            className="input"
            style={{ marginBottom: 0 }}
            placeholder="说点什么..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
          />
          <button className="btn primary" style={{ width: "auto", padding: "0 18px" }} onClick={send}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
