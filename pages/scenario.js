import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function Scenario() {
  const router = useRouter();
  const { status } = useSession();
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [opened, setOpened] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) {
      setOpened(true);
      loadAndOpen();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadAndOpen() {
    setLoading(true);
    // 先看看今天是不是已经聊过、有没有进度
    const r = await fetch("/api/scenario");
    const data = await r.json();
    if (!r.ok) {
      setLoading(false);
      if (data.error === "请先完成问卷") router.push("/questionnaire");
      return;
    }
    setScenario(data.scenario);
    setCompleted(data.progress.completed || false);

    if (data.progress.choices && data.progress.choices.length > 0) {
      // 已经有聊天记录，直接展示
      setMessages(data.progress.choices);
      setLoading(false);
    } else {
      // 第一次进来，让AI开场
      const cr = await fetch("/api/scenario-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [{ role: "user", content: "（开始今天的剧场，按角色身份开场）" }] }),
      });
      const cData = await cr.json();
      setLoading(false);
      const opening = cData.reply
        ? [{ role: "assistant", content: cData.reply }]
        : [{ role: "assistant", content: "（暂时连不上AI，" + (cData.error || "请稍后再试") + "）" }];
      setMessages(opening);
      saveProgress(opening, false);
    }
  }

  async function saveProgress(msgs, isCompleted) {
    await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: scenario?.id || "chat",
        stepIndex: msgs.length,
        choices: msgs,
        completed: isCompleted,
      }),
    });
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    setLoading(true);
    const r = await fetch("/api/scenario-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: next }),
    });
    const data = await r.json();
    setLoading(false);
    const withReply = data.reply
      ? [...next, { role: "assistant", content: data.reply }]
      : [...next, { role: "assistant", content: "（暂时连不上AI，" + (data.error || "请稍后再试") + "）" }];
    setMessages(withReply);
    saveProgress(withReply, false);
  }

  function finishToday() {
    setCompleted(true);
    saveProgress(messages, true);
  }

  if (status !== "authenticated") return null;
  if (!scenario) return null;

  return (
    <div className="wrap" style={{ paddingBottom: completed ? 40 : 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{scenario.title}</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{scenario.role} · AI 对话</p>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
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
      </div>

      {!completed && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 16px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
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
            <button className="btn" style={{ fontSize: 13 }} onClick={finishToday}>
              结束今天的小剧场
            </button>
          </div>
        </div>
      )}

      {completed && (
        <button className="btn primary" style={{ marginTop: 20 }} onClick={() => router.push("/dashboard")}>
          回到今天
        </button>
      )}
    </div>
  );
}
