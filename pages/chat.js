import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../lib/useStreamChat";
import { renderMarkdown } from "../lib/renderMarkdown";
import { ThinkingDots } from "../components/PageTransition";
import EmotionPicker from "../components/EmotionPicker";
import BreathingExercise from "../components/BreathingExercise";

const HOTLINE = "400-161-9995";

export default function Chat() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [opened, setOpened] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showEmotions, setShowEmotions] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(null); // null | "medium" | "high"
  const [showBreathing, setShowBreathing] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened && router.isReady) {
      setOpened(true);
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router.isReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function loadHistory() {
    try {
      const r = await fetch("/api/companion-session");
      const data = await r.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        // 有历史记录，直接恢复，不重新打招呼
        setMessages(data.messages);
        if (data.messages.filter(m => m.role === "user").length >= 3) setShowFeedback(true);
        return;
      }
    } catch {}
    // 没有历史，正常开场
    const moodLabel = router.query.mood;
    openChat(moodLabel);
  }

  async function saveHistory(msgs) {
    // 过滤掉隐藏的指令消息（以括号开头的user消息），只存真实对话
    const clean = msgs.filter(m => !(m.role === "user" && m.content.startsWith("（")));
    if (clean.length === 0) return;
    fetch("/api/companion-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: clean }),
    }).catch(() => {});
  }

  async function newConversation() {
    if (!confirm("开始新对话？当前的聊天记录会被清空。")) return;
    await fetch("/api/companion-session", { method: "DELETE" }).catch(() => {});
    setMessages([]);
    setShowFeedback(false);
    setFeedback(null);
    openChat(null);
  }

  async function openChat(moodLabel) {
    const content = moodLabel
      ? `（用户刚才打卡选了"心情${moodLabel}"，请以星伴身份，自然地感知到TA的情绪，温柔地引出话题）`
      : "（以星伴身份温暖打招呼，问问今天过得怎么样，方式要新鲜有温度）";
    await runStream([{ role: "user", content }], []);
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  async function checkCrisis(text) {
    try {
      const r = await fetch("/api/crisis-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await r.json();
      if (data.crisis) setCrisisAlert(data.crisis.level);
    } catch {}
  }

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setShowEmotions(false);
    import("../lib/feedback").then(({ feedback }) => feedback.send()).catch(() => {});
    // 危机检测（不阻塞发送）
    checkCrisis(text);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    await runStream(next, next);
  }

  async function runStream(apiMessages, displayMessages) {
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
        saveHistory(next);
        if (next.filter(m => m.role === "user").length >= 3) setShowFeedback(true);
        if (next.filter(m => m.role === "assistant").length === 1) {
          fetch("/api/achievement-trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "first_chat" }) }).catch(() => {});
        }
      },
      (err) => {
        setMessages([...displayMessages, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      {},
      abortRef
    );
  }

  async function submitFeedback(rating) {
    setFeedback(rating);
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: "chat", rating }) });
    if (messages.length >= 4) {
      fetch("/api/chat-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) }).catch(() => {});
    }
  }

  if (status !== "authenticated") return null;

  return (
    <div className="wrap" style={{ paddingBottom: 130 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <p style={{ fontSize: 15, fontWeight: 500, margin: 0, flex: 1 }}>和星伴聊聊</p>
        <button onClick={newConversation}
          style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 12.5, padding: "6px 12px", borderRadius: 16, cursor: "pointer", fontWeight: 500 }}>
          新对话
        </button>
      </div>

      {/* 危机提醒横幅 */}
      {crisisAlert && (
        <div style={{
          background: crisisAlert === "high" ? "#FEF2F2" : "#FFFBEB",
          border: `1.5px solid ${crisisAlert === "high" ? "#FECACA" : "#FDE68A"}`,
          borderRadius: 14, padding: "14px 16px", marginBottom: 14,
        }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 6px", color: crisisAlert === "high" ? "#DC2626" : "#92400E" }}>
            {crisisAlert === "high" ? "💙 我注意到你刚才说的话" : "💛 我想多了解一下你现在的状态"}
          </p>
          <p style={{ fontSize: 13.5, color: crisisAlert === "high" ? "#991B1B" : "#78350F", margin: "0 0 10px", lineHeight: 1.6 }}>
            {crisisAlert === "high"
              ? "听到你这样说，我很担心你。不管发生了什么，你现在不是一个人。如果你现在非常难受，请联系身边信任的人，或者拨打热线。"
              : "有些事说出来会轻一点。如果你愿意，可以和我多说说你现在的感受。"}
          </p>
          {crisisAlert === "high" && (
            <p style={{ fontSize: 14, fontWeight: 600, color: "#DC2626", margin: "0 0 8px" }}>
              📞 24小时希望热线：{HOTLINE}
            </p>
          )}
          <button onClick={() => setShowBreathing(true)} style={{ background: crisisAlert === "high" ? "#DC2626" : "#92400E", color: "#fff", border: "none", fontSize: 13, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 500, marginRight: 10 }}>
            🌬️ 做个呼吸练习
          </button>
          <button onClick={() => setCrisisAlert(null)} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 12.5, cursor: "pointer", padding: 0 }}>
            收起提醒
          </button>
        </div>
      )}

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

      {/* 输入区 */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(245,243,255,0.96)", backdropFilter: "blur(20px)", borderTop: "1px solid var(--line)", padding: "12px 16px 24px" }}>
        <div style={{ maxWidth: 500, margin: "0 auto", position: "relative" }}>
          {showEmotions && (
            <EmotionPicker
              onSelect={(word) => setInput(prev => prev ? prev + " " + word : word)}
              onClose={() => setShowEmotions(false)}
            />
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={() => setShowEmotions(!showEmotions)} title="情绪词汇" style={{
              width: 38, height: 38, borderRadius: "50%", border: "1.5px solid var(--line)",
              background: showEmotions ? "var(--purple-light)" : "#fff",
              cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>💭</button>
            <input className="input" style={{ marginBottom: 0, flex: 1 }} placeholder="说点什么..."
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !loading) send(); }} />
            {loading ? (
              <button onClick={stopStream} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "rgba(201,74,74,0.12)", color: "var(--coral-deep)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⏹</button>
            ) : (
              <button onClick={send} disabled={!input.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: !input.trim() ? "rgba(124,111,224,0.1)" : "linear-gradient(135deg, #9B8FF0, #7C6FE0)", color: "#fff", cursor: !input.trim() ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, boxShadow: !input.trim() ? "none" : "0 4px 14px rgba(124,111,224,0.4)", transition: "all 0.2s" }}>↑</button>
            )}
          </div>
        </div>
      </div>
      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
    </div>
  );
}
