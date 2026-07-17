import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetchSmooth as streamFetch } from "../lib/useStreamChat";
import ChatMessage from "../components/ChatMessage";
import ChatInput from "../components/ChatInput";
import ConversationSidebar from "../components/ConversationSidebar";
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

// 从消息里取纯文本（兼容多模态）
function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.filter(p => p?.type === "text").map(p => p.text).join("");
  }
  return "";
}
function isHidden(m) {
  return m.role === "user" && textOf(m.content).startsWith("（");
}

export default function Chat() {
  const router = useRouter();
  const { status } = useSession();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState(null);
  const [booted, setBooted] = useState(false);
  const [feedbackMap, setFeedbackMap] = useState({});
  const [showEmotions, setShowEmotions] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30); // 虚拟滚动：只渲染最近N条
  const bottomRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !booted && router.isReady) {
      setBooted(true);
      boot();
    }
    setDark(getTheme() === "dark");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, router.isReady]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: streamingText ? "auto" : "smooth" });
  }, [messages, streamingText]);

  // 草稿自动保存（防抖，避免打字时频繁写）
  useEffect(() => {
    if (!activeId) return;
    const t = setTimeout(() => {
      try {
        if (input.trim()) localStorage.setItem(`istarmate_draft_companion_${activeId}`, input);
        else localStorage.removeItem(`istarmate_draft_companion_${activeId}`);
      } catch {}
    }, 400);
    return () => clearTimeout(t);
  }, [input, activeId]);

  async function boot() {
    const list = await loadConversations();
    if (list.length > 0) {
      // 打开最近一个会话
      await openConversation(list[0].id);
    } else {
      // 全新用户：建一个会话并打招呼
      await newConversation(router.query.mood);
    }
  }

  async function loadConversations() {
    try {
      const r = await fetch("/api/conversations?kind=companion");
      const d = await r.json();
      const list = d.conversations || [];
      setConversations(list);
      return list;
    } catch { return []; }
  }

  async function openConversation(id) {
    setActiveId(id);
    setMessages([]);
    setFeedbackMap({});
    setVisibleCount(30);
    // 恢复该会话未发送的草稿
    try {
      const draft = localStorage.getItem(`istarmate_draft_companion_${id}`);
      setInput(draft || "");
    } catch { setInput(""); }
    try {
      const r = await fetch(`/api/conversations?id=${id}`);
      const d = await r.json();
      setMessages(d.conversation?.messages || []);
    } catch {}
  }

  async function newConversation(moodLabel) {
    const r = await fetch("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "companion", title: "新对话" }),
    });
    const d = await r.json();
    const id = d.conversation?.id;
    if (!id) return;
    setActiveId(id);
    setMessages([]);
    setFeedbackMap({});
    await loadConversations();
    // 开场白
    const content = moodLabel
      ? `（用户刚才打卡选了"心情${moodLabel}"，请以星伴身份，自然地感知到TA的情绪，温柔地引出话题）`
      : "（以星伴身份温暖打招呼，问问今天过得怎么样，方式要新鲜有温度）";
    await runStream([{ role: "user", content }], [], id);
  }

  function saveMessages(msgs, convId) {
    const id = convId || activeId;
    if (!id) return;
    fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, messages: msgs }),
    }).then(() => loadConversations()).catch(() => {});
  }

  // 第一条用户消息后，自动用它作为会话标题
  function maybeAutoTitle(msgs, convId) {
    const firstUser = msgs.find(m => !isHidden(m) && m.role === "user");
    if (!firstUser) return;
    const userCount = msgs.filter(m => !isHidden(m) && m.role === "user").length;
    if (userCount !== 1) return;
    const t = textOf(firstUser.content).slice(0, 20) || "新对话";
    fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: convId || activeId, title: t }),
    }).then(() => loadConversations()).catch(() => {});
  }

  async function renameConv(id, title) {
    await fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title }),
    });
    loadConversations();
  }

  async function deleteConv(id) {
    if (!confirm("删除这个对话？删了就找不回来了。")) return;
    await fetch(`/api/conversations?id=${id}`, { method: "DELETE" });
    const list = await loadConversations();
    if (id === activeId) {
      if (list.length > 0) openConversation(list[0].id);
      else newConversation(null);
    }
  }

  async function pinConv(id, pinned) {
    await fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned }),
    });
    loadConversations();
  }

  async function archiveConv(id) {
    await fetch("/api/conversations", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, archived: true }),
    });
    const list = await loadConversations();
    if (id === activeId && list.length > 0) openConversation(list[0].id);
  }

  async function searchConv(q) {
    try {
      const r = await fetch(`/api/conversations?kind=companion&q=${encodeURIComponent(q)}`);
      const d = await r.json();
      return d.results || [];
    } catch { return []; }
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  async function checkCrisis(text) {
    if (!text) return;
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
    if ((!input.trim() && !pendingImage) || loading) return;
    const text = input.trim();
    const img = pendingImage;
    setInput("");
    setPendingImage(null);
    setShowEmotions(false);
    try { if (activeId) localStorage.removeItem(`istarmate_draft_companion_${activeId}`); } catch {}
    import("../lib/feedback").then(({ feedback }) => feedback.send()).catch(() => {});
    checkCrisis(text);

    // 有图片时用多模态格式
    const content = img
      ? [
          ...(text ? [{ type: "text", text }] : [{ type: "text", text: "看看这张图片" }]),
          { type: "image_url", image_url: { url: img, detail: "low" } },
        ]
      : text;

    const next = [...messages, { role: "user", content }];
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

  // 编辑用户消息后，从那条重新开始
  async function editMessage(displayIdx, newText) {
    if (loading) return;
    // displayIdx 是过滤后的索引，映射回真实索引
    const visible = messages.map((m, i) => ({ m, i })).filter(({ m }) => !isHidden(m));
    const real = visible[displayIdx];
    if (!real) return;
    const trimmed = messages.slice(0, real.i);
    const next = [...trimmed, { role: "user", content: newText }];
    setMessages(next);
    await runStream(next, next);
  }

  async function runStream(apiMessages, displayMsgs, convId) {
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
        saveMessages(next, convId);
        maybeAutoTitle(next, convId);
        const userTurns = next.filter(m => m.role === "user" && !isHidden(m)).length;
        if (userTurns >= 3 && userTurns % 2 === 1) {
          fetch("/api/chat-summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) }).catch(() => {});
          // 后台质量评估（抽样，不阻塞）
          fetch("/api/quality-eval", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, roleKind: "companion" }) }).catch(() => {});
        }
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

  function msgFeedback(idx, rating) {
    setFeedbackMap(prev => ({ ...prev, [idx]: rating }));
    fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ context: "chat", rating }) }).catch(() => {});
  }

  function switchTheme() {
    const t = toggleTheme();
    setDark(t === "dark");
  }

  if (status !== "authenticated") return null;

  const displayMessages = messages.filter(m => !isHidden(m));
  let lastAiIndex = -1;
  for (let i = displayMessages.length - 1; i >= 0; i--) {
    if (displayMessages[i].role === "assistant") { lastAiIndex = i; break; }
  }

  return (
    <div style={{ height: "100vh", display: "flex", background: "var(--bg)" }}>
      <ConversationSidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={openConversation}
        onNew={() => newConversation(null)}
        onRename={renameConv}
        onDelete={deleteConv}
        onPin={pinConv}
        onArchive={archiveConv}
        onSearch={searchConv}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* 顶栏 */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line)", display: "flex", alignItems: "center", gap: 10, background: "var(--card)", backdropFilter: "blur(20px)", flexShrink: 0 }}>
          <button onClick={() => setSidebarOpen(true)} className="conv-toggle"
            style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 19, cursor: "pointer", padding: 0, display: "none" }}>☰</button>
          <button onClick={() => router.push("/dashboard")}
            style={{ background: "transparent", border: "none", color: "var(--ink-soft)", fontSize: 20, cursor: "pointer", padding: 0 }}>←</button>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #B8AEFF, #7C6FE0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, boxShadow: "0 2px 10px rgba(124,111,224,0.3)" }}>✦</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>星伴</p>
            <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: 0 }}>{loading ? "正在思考..." : "在线 · 随时陪你聊"}</p>
          </div>
          <button onClick={switchTheme} title="切换主题" style={{ background: "transparent", border: "none", fontSize: 17, cursor: "pointer", padding: "4px 8px" }}>{dark ? "☀️" : "🌙"}</button>
        </div>

        {/* 危机横幅 */}
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

        {/* 消息区 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 0" }}>
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            {displayMessages.length > visibleCount && (
              <button onClick={() => setVisibleCount(c => c + 30)}
                style={{ display: "block", margin: "0 auto 16px", background: "var(--card-solid)", border: "1px solid var(--line)", color: "var(--ink-soft)", fontSize: 12.5, padding: "7px 16px", borderRadius: 16, cursor: "pointer" }}>
                ↑ 加载更早的消息
              </button>
            )}
            {displayMessages.slice(Math.max(0, displayMessages.length - visibleCount)).map((m0, i0) => {
              const i = Math.max(0, displayMessages.length - visibleCount) + i0;
              const m = m0;
              return (
              <ChatMessage
                key={i}
                role={m.role}
                content={m.content}
                avatar={m.role === "assistant" ? "✦" : "🙂"}
                onRegenerate={m.role === "assistant" && i === lastAiIndex && !loading ? regenerate : null}
                onFeedback={m.role === "assistant" ? (r) => msgFeedback(i, r) : null}
                feedbackValue={feedbackMap[i]}
                onEdit={m.role === "user" && !loading ? (t) => editMessage(i, t) : null}
              />
              );
            })}
            {(loading || streamingText) && (
              <ChatMessage role="assistant" avatar="✦" content={streamingText} streaming showActions={false} />
            )}
            <div ref={bottomRef} style={{ height: 12 }} />
          </div>
        </div>

        {/* 情绪词汇浮层 */}
        <div style={{ position: "relative", maxWidth: 820, margin: "0 auto", width: "100%" }}>
          {showEmotions && (
            <div style={{ position: "absolute", bottom: "100%", left: 16, right: 16, zIndex: 20 }}>
              <EmotionPicker onSelect={(w) => setInput(prev => prev ? prev + " " + w : w)} onClose={() => setShowEmotions(false)} />
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
          enableVoice
          enableImage
          pendingImage={pendingImage}
          onImage={setPendingImage}
          onRemoveImage={() => setPendingImage(null)}
          leftButton={
            <button onClick={() => setShowEmotions(!showEmotions)} title="情绪词汇"
              style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: showEmotions ? "var(--purple-light)" : "transparent", cursor: "pointer", fontSize: 18, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>💭</button>
          }
        />
      </div>

      {showBreathing && <BreathingExercise onClose={() => setShowBreathing(false)} />}

      <style>{`@media (max-width: 900px) { .conv-toggle { display: block !important; } }`}</style>
    </div>
  );
}
