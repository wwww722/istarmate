import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../lib/useStreamChat";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import EmotionPicker from "../components/EmotionPicker";
import BreathingExercise from "../components/BreathingExercise";
import { toggleTheme, getTheme } from "../lib/theme";

const HOTLINE = "400-161-9995";

const QUICK_PROMPTS = [
  { label: "😮‍💨 今天有点累", text: "今天感觉有点累，不太想说话" },
  { label: "😟 我很焦虑", text: "我最近很焦虑，静不下来" },
  { label: "🤔 帮我理清思路", text: "有件事我想不明白，能帮我理一理吗？" },
  { label: "💬 随便聊聊", text: "没什么特别的，就想找你聊聊天" },
];

export default function Chat() {
  const router = useRouter();
  const { status } = useSession();
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [opened, setOpened] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [showEmotions, setShowEmotions] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [dark, setDark] = useState(false);
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !opened && router.isReady) {
      setOpened(true);
      loadHistory();
    }
    setDark(getTheme() === "dark");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router.isReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streamingText ? "auto" : "smooth" });
  }, [messages, streamingText]);

  async function loadHistory() {
    try {
      const r = await fetch("/api/companion-session");
      const data = await r.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
        return;
      }
    } catch {}
    openChat(router.query.mood);
  }

  function saveHistory(msgs) {
    const clean = msgs.filter(m => !(m.role === "user" && m.content.startsWith("（")));
    if (clean.length === 0) return;
    fetch("/api/companion-session", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: clean }),
    }).catch(() => {});
  }

  async function newConversation() {
    if (!confirm("开始新对话？当前聊天记录会被清空。")) return;
    await fetch("/api/companion-session", { method: "DELETE" }).catch(() => {});
    setMessages([]);
    setFeedbackMap({});
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
        method: "POST", headers: { "Content-Type": "application/json" },
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
    checkCrisis(text);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    await runStream(next, next);
  }

  async function regenerate() {
    if (loading || messages.length < 2) return;
    let idx = messages.length - 1;
    while (idx >= 0 && messages[idx].role !== "assistant") idx--;
    if (idx < 0) return;
    const trimmed = messages.slice(0, idx);
    setMessages(trimmed);
    await runStream(trimmed, trimmed);
  }

  async function runStream(apiMessages, displayMsgs) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch("/api/chat", apiMessages,
      (token) => { fullText += token; setStreamingText(fullText); },
      () => {
        const next = [...displayMsgs, { role: "assistant", content: fullText }];
        setMessages(next);
        setStreamingText("");
        setLoading(false);
        saveHistory(next);
        if (next.filter(m => m.role === "assistant").length === 1) {
          fetch("/api/achievement-trigger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trigger: "first_chat" }) }).catch(() => {});
        }
      },
      (err) => {
        setMessages([...displayMsgs, { role: "assistant", content: `（${err}）` }]);
        setStreamingText("");
        setLoading(false);
      },
      {}, abortRef
    );
  }

  function msgFeedback(msgIndex, rating) {
    setFeedbackMap(prev => ({ ...prev, [msgIndex]: rating }));
    fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: "chat", rating }) }).catch(() => {});
    if (rating === 1 && messages.length >= 4) {
      fetch("/api/chat-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages }) }).catch(() => {});
    }
  }

  function switchTheme() {
    const t = toggleTheme();
    setDark(t === "dark");
  }

  if (status !== "authenticated") return null;

  const displayMessages = messages.filter(m => !(m.role === "user" && m.content.startsWith("（")));
  let lastAiIndex = -1;
  for (let i = displayMessages.length - 1; i >= 0; i--) {
    if (displayMessages[i].role === "assistant") { lastAiIndex = i; break; }
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "var(--card)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
        <button onClick={() => router.push("/dashboard")} style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #B8AEFF, #7C6FE0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 2px 10px rgba(124,111,224,0.3)" }}>✦</div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>星伴</p>
          <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>{loading ? "正在思考..." : "在线 · 随时陪你聊"}</p>
        </div>
        <button onClick={switchTheme} title="切换主题" style={{ background: "transparent", border: "none", fontSize: 17, cursor: "pointer", padding: "4px 8px" }}>{dark ? "☀️" : "🌙"}</button>
        <button onClick={newConversation} style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 12.5, padding: "7px 13px", borderRadius: 18, cursor: "pointer", fontWeight: 500 }}>新对话</button>
      </div>

      {crisisAlert && (
        <div style={{ padding: "14px 16px", background: crisisAlert === "high" ? "#FEF2F2" : "#FFFBEB", borderBottom: `1px solid ${crisisAlert === "high" ? "#FECACA" : "#FDE68A"}`, flexShrink: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: "0 0 6px", color: crisisAlert === "high" ? "#DC2626" : "#92400E" }}>
            {crisisAlert === "high" ? "💙 我注意到你刚才说的话" : "💛 我想多了解你现在的状态"}
          </p>
          <p style={{ fontSize: 13.5, color: crisisAlert === "high" ? "#991B1B" : "#78350F", margin: "0 0 10px", lineHeight: 1.6 }}>
            {crisisAlert === "high"
              ? "听到你这样说，我很担心你。不管发生了什么，你现在不是一个人。如果你非常难受，请联系身边信任的人，或拨打热线。"
              : "有些事说出来会轻一点。如果你愿意，可以和我多说说你现在的感受。"}
          </p>
          {crisisAlert === "high" && <p style={{ fontSize: 14, fontWeight: 600, color: "#DC2626", margin: "0 0 8px" }}>📞 24小时希望热线：{HOTLINE}</p>}
          <button onClick={() => setShowBreathing(true)} style={{ background: crisisAlert === "high" ? "#DC2626" : "#92400E", color: "#fff", border: "none", fontSize: 13, padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 500, marginRight: 10 }}>🌬️ 做个呼吸练习</button>
          <button onClick={() => setCrisisAlert(null)} style={{ background: "none", border: "none", color: "#6B7280", fontSize: 12.5, cursor: "pointer" }}>收起</button>
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 0" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          {displayMessages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              avatar={m.role === "assistant" ? "✦" : "🙂"}
              onRegenerate={m.role === "assistant" && i === lastAiIndex && !loading ? regenerate : null}
              onFeedback={m.role === "assistant" ? (r) => msgFeedback(i, r) : null}
              feedbackValue={feedbackMap[i]}
            />
          ))}
          {(loading || streamingText) && (
            <ChatMessage role="assistant" avatar="✦" content={streamingText} streaming showActions={false} />
          )}
          <div ref={bottomRef} style={{ height: 12 }} />
        </div>
      </div>

      <div style={{ position: "relative", maxWidth: 820, margin: "0 auto", width: "100%" }}>
        {showEmotions && (
          <div style={{ position: "absolute", bottom: "100%", left: 16, right: 16, zIndex: 20 }}>
            <EmotionPicker onSelect={(word) => setInput(prev => prev ? prev + " " + word : word)} onClose={() => setShowEmotions(false)} />
          </div>
        )}
      </div>
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        onStop={stopStream}
        loading={loading}
        placeholder="和星伴说点什么..."
        quickPrompts={displayMessages.length <= 1 ? QUICK_PROMPTS : []}
        leftButton={
          <button onClick={() => setShowEmotions(!showEmotions)} title="情绪词汇"
            style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: showEmotions ? "var(--purple-light)" : "transparent", cursor: "pointer", fontSize: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>💭</button>
        }
      />

      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}
    </div>
  );
}
