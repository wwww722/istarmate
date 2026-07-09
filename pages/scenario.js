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
  const [generating, setGenerating] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [opened, setOpened] = useState(false);
  const abortRef = useRef(null);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [questionnaireData, setQuestionnaireData] = useState(null);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened) { setOpened(true); loadAndOpen(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText, summary]);

  async function loadAndOpen() {
    setGenerating(true);
    const [sRes, qRes] = await Promise.all([fetch("/api/scenario"), fetch("/api/questionnaire")]);
    const data = await sRes.json();
    const qData = await qRes.json();

    if (!sRes.ok) {
      setGenerating(false);
      if (data.error === "请先完成问卷") router.push("/questionnaire");
      return;
    }
    setScenario(data.scenario);
    setCompleted(data.progress.completed || false);
    setQuestionnaireData(qData.questionnaire);
    setGenerating(false);

    if (data.progress.choices?.length > 0) {
      setMessages(data.progress.choices);
    } else {
      await runStream([{ role: "user", content: "（开始今天的剧场，按角色身份自然开场）" }], [], data.scenario);
    }
  }

  async function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
  }

  function stopStream() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
    setStreamingText(prev => prev || "");
  }

  async function runStream(apiMessages, displayMessages, scenarioOverride) {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    const currentScenario = scenarioOverride || scenario;
    await streamFetch("/api/scenario-chat", apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMessages, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        saveProgress(next, false, currentScenario);
      },
      (err) => {
        const next = [...displayMessages, { role: "assistant", content: `（${err}）` }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
      },
      { scenario: currentScenario },
      controller.signal
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
      body: JSON.stringify({ scenarioId: s?.id || "ai", stepIndex: msgs.length, choices: msgs, completed: isCompleted, scenarioMeta: s }),
    });
  }

  async function finishToday() {
    setCompleted(true);
    saveProgress(messages, true);
    // 成就触发
    fetch("/api/achievement-trigger", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: "first_scenario" }),
    }).then(r => r.json()).then(data => {
      if (data.newlyUnlocked?.length) {
        // 可以在这里显示成就弹窗，暂时先存localStorage供仪表盘读取
        localStorage.setItem("pending_achievements", JSON.stringify(data.newlyUnlocked));
      }
    }).catch(() => {});
    // AI生成今日收获总结（走后端API，前端无法直接访问API Key）
    if (messages.length >= 2) {
      setSummaryLoading(true);
      try {
        const r = await fetch("/api/scenario-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages, scenarioTitle: scenario?.title }),
        });
        const data = await r.json();
        if (data.summary) setSummary(data.summary);
      } catch {}
      setSummaryLoading(false);
    }
  }

  async function submitFeedback(rating) {
    setFeedback(rating);
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context: "scenario", rating }),
    });
  }

  // 找出最弱的维度
  const weakDomain = questionnaireData?.domains?.filter(d => d.level >= 1).sort((a, b) => b.level - a.level)[0];

  if (status !== "authenticated") return null;

  if (generating) return (
    <div className="wrap" style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>✨</div>
      <p style={{ color: "var(--ink-soft)", fontSize: 14.5 }}>今天的小剧场正在生成中...</p>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 8 }}><ThinkingDots /></div>
    </div>
  );

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

      {/* 联动透明提示 */}
      {weakDomain && !completed && messages.length === 0 && (
        <div style={{ background: "var(--purple-light)", borderRadius: 10, padding: "8px 14px", marginBottom: 12, fontSize: 12.5, color: "var(--purple-deep)" }}>
          ✨ 今天的场景和你最近的「{weakDomain.name}」有关
        </div>
      )}

      <div style={{ marginTop: 12 }}>
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

        {/* 今日收获总结 */}
        {completed && (
          <div style={{ margin: "20px 0" }}>
            <div className="card" style={{ background: "linear-gradient(135deg, #f8f6ff 0%, #ede9fb 100%)", border: "1.5px solid var(--purple)" }}>
              <p style={{ fontSize: 13, color: "var(--purple-deep)", fontWeight: 500, marginBottom: 6 }}>✨ 今天的收获</p>
              {summaryLoading ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}><ThinkingDots /><span style={{ fontSize: 13, color: "var(--ink-soft)" }}>星伴正在整理...</span></div>
              ) : (
                <p style={{ fontSize: 14.5, color: "var(--ink)", lineHeight: 1.7, margin: 0 }}>{summary || "今天能来这里聊聊，本身就是很好的一步。"}</p>
              )}
            </div>

            {/* 反馈 */}
            <div style={{ textAlign: "center", padding: "14px 0", color: "var(--ink-soft)", fontSize: 13.5 }}>
              {feedback === null ? (
                <>
                  <span>这次体验怎么样？</span>
                  <button onClick={() => submitFeedback(1)} style={{ margin: "0 8px", background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>👍</button>
                  <button onClick={() => submitFeedback(-1)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>👎</button>
                </>
              ) : (
                <span>{feedback === 1 ? "谢谢！明天见 😊" : "收到，我们会继续改进 💪"}</span>
              )}
            </div>

            <button className="btn primary" onClick={() => router.push("/dashboard")}>回到今天</button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {!completed && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg)", borderTop: "1px solid var(--line)", padding: "14px 16px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input className="input" style={{ marginBottom: 0 }} placeholder="说点什么..."
                value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !loading && send()} />
              {loading ? (
                <button className="btn" style={{ width: "auto", padding: "0 16px", color: "var(--coral-deep)", borderColor: "var(--coral-deep)" }} onClick={stopStream}>■ 停止</button>
              ) : (
                <button className="btn primary" style={{ width: "auto", padding: "0 18px" }} onClick={send}>发送</button>
              )}
            </div>
            <button className="btn" style={{ fontSize: 13 }} onClick={finishToday}>结束今天的小剧场</button>
          </div>
        </div>
      )}
    </div>
  );
}
