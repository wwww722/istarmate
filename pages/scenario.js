import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../lib/useStreamChat";
import { renderMarkdown } from "../lib/renderMarkdown";
import { ThinkingDots } from "../components/PageTransition";

export default function Scenario() {
  const router = useRouter();
  const { status } = useSession();
  const [scenario, setScenario] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(true); // AI生成场景中
  const [completed, setCompleted] = useState(false);
  const [opened, setOpened] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) { setOpened(true); loadAndOpen(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function loadAndOpen() {
    setGenerating(true);
    const r = await fetch("/api/scenario");
    const data = await r.json();
    if (!r.ok) {
      setGenerating(false);
      if (data.error === "请先完成问卷") router.push("/questionnaire");
      return;
    }
    setScenario(data.scenario);
    setCompleted(data.progress.completed || false);
    setGenerating(false);

    if (data.progress.choices?.length > 0) {
      setMessages(data.progress.choices);
    } else {
      await runStream(
        [{ role: "user", content: "（开始今天的剧场，按角色身份自然开场）" }],
        [],
        data.scenario
      );
    }
  }

  async function runStream(apiMessages, displayMessages, scenarioOverride) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch(
      "/api/scenario-chat",
      apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMessages, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        saveProgress(next, false, scenarioOverride || scenario);
      },
      (err) => {
        const next = [...displayMessages, { role: "assistant", content: `（${err}）` }];
        setMessages(next);
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
    await runStream(next, next);
  }

  async function saveProgress(msgs, isCompleted, scenarioData) {
    const s = scenarioData || scenario;
    await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: s?.id || "ai",
        stepIndex: msgs.length,
        choices: msgs,
        completed: isCompleted,
        scenarioMeta: s, // 把场景信息也存起来
      }),
    });
  }

  function finishToday() {
    setCompleted(true);
    saveProgress(messages, true);
  }

  if (status !== "authenticated") return null;

  if (generating) {
    return (
      <div className="wrap" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>✨</div>
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>今天的小剧场正在生成中...</p>
        <ThinkingDots />
      </div>
    );
  }

  if (!scenario) return null;

  return (
    <div className="wrap" style={{ paddingBottom: completed ? 40 : 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{scenario.title}</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{scenario.role} · AI 对话</p>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
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
      </div>

      {!completed && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 16px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="input" style={{ marginBottom: 0 }} placeholder="说点什么..."
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()} />
              <button className="btn primary" style={{ width: "auto", padding: "0 18px" }}
                onClick={send} disabled={loading}>发送</button>
            </div>
            <button className="btn" style={{ fontSize: 13 }} onClick={finishToday}>结束今天的小剧场</button>
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
