// components/StarOrb.js
// 星伴圆球：只出现在仪表盘，进入页面后主动弹出气泡问候，点击进入聊天抽屉

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { streamFetch } from "../lib/useStreamChat";
import { renderMarkdown } from "../lib/renderMarkdown";

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--purple)",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

// 根据时间段和心情生成主动问候
function getProactiveGreeting(moodToday) {
  const hour = new Date().getHours();
  if (moodToday === "down" || moodToday === "bad") {
    return ["看到你今天心情有点低落 💙", "想和我说说是什么让你这样吗？"];
  }
  if (hour >= 5 && hour < 10) return ["早上好呀 ☀️", "今天打算怎么过？"];
  if (hour >= 10 && hour < 13) return ["上午好！", "最近有什么在脑子里转来转去吗？"];
  if (hour >= 13 && hour < 17) return ["下午好～", "今天到现在，有什么想说说的吗？"];
  if (hour >= 17 && hour < 20) return ["傍晚好 🌇", "今天过得怎么样？"];
  if (hour >= 20 && hour < 23) return ["晚上好 🌙", "今天有没有什么印象比较深的事？"];
  return ["还没睡呀 🌃", "夜里想聊聊吗，我在这里。"];
}

export default function StarOrb({ moodToday }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);
  const [bubbleDismissed, setBubbleDismissed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [orbPop, setOrbPop] = useState(false);
  const [careSignal, setCareSignal] = useState(null); // { level, days } | null
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  // 连续低落检测：优先于普通问候
  const greeting = careSignal
    ? (careSignal.level === "high"
        ? ["我注意到你这几天都不太好 💙", `已经连续 ${careSignal.days} 天了，要不要和我聊聊？`]
        : ["这两天心情好像都有点低 💙", "我一直在这儿，想说说吗？"])
    : getProactiveGreeting(moodToday);

  // 拉取连续低落信号
  useEffect(() => {
    let cancelled = false;
    fetch("/api/care-check")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (!cancelled && data?.care) setCareSignal(data.care); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // 进入仪表盘后主动弹气泡（有连续低落信号时更快弹出）
  useEffect(() => {
    if (bubbleDismissed) return;
    const delay = careSignal ? 1500 : 3000;
    const t = setTimeout(() => {
      setBubbleVisible(true);
      setOrbPop(true);
      setTimeout(() => setOrbPop(false), 600);
    }, delay);
    return () => clearTimeout(t);
  }, [bubbleDismissed, careSignal]);

  // 气泡自动收起（关怀信号停留更久）
  useEffect(() => {
    if (!bubbleVisible) return;
    const t = setTimeout(() => setBubbleVisible(false), careSignal ? 16000 : 10000);
    return () => clearTimeout(t);
  }, [bubbleVisible, careSignal]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open && inputRef.current) setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  function openChat() {
    setBubbleVisible(false);
    setBubbleDismissed(true);
    setOpen(true);
    if (!initialized) {
      setInitialized(true);
      loadHistoryOrGreet();
    }
  }

  async function loadHistoryOrGreet() {
    try {
      const r = await fetch("/api/companion-session");
      const data = await r.json();
      if (Array.isArray(data.messages) && data.messages.length > 0) {
        setMessages(data.messages);
        return;
      }
    } catch {}
    // 无历史，按情况打招呼
    let openingContent;
    if (careSignal) {
      openingContent = `（这个用户已经连续${careSignal.days}天打卡心情都是低落或很差。请以星伴身份，用真诚温柔、不夸张的语气，让TA感到被看见——不要生硬地说"我发现你连续几天"，而是自然地表达关心，轻轻邀请TA说说最近发生了什么。简短、有温度。）`;
    } else if (moodToday === "down" || moodToday === "bad") {
      openingContent = `（用户今天打卡选了心情"${moodToday === "down" ? "低落" : "很差"}"，请以星伴身份，不要生硬提到"打卡"，而是自然地感知到TA的状态，温柔地引出话题，问问发生了什么）`;
    } else {
      openingContent = "（以星伴身份，根据现在的时间段，用一句温暖有新鲜感的话打招呼，问问用户今天过得怎么样，简短自然）";
    }
    runStream([{ role: "user", content: openingContent }], []);
  }

  function saveHistory(msgs) {
    const clean = msgs.filter(m => !(m.role === "user" && m.content.startsWith("（")));
    if (clean.length === 0) return;
    fetch("/api/companion-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: clean }),
    }).catch(() => {});
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

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    await runStream(next, next);
  }

  return (
    <>
      {/* 主动气泡 */}
      {bubbleVisible && !open && (
        <div
          onClick={openChat}
          style={{
            position: "fixed",
            bottom: 110,
            left: 20,
            maxWidth: 220,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "18px 18px 18px 4px",
            padding: "14px 16px",
            boxShadow: "0 8px 32px rgba(90,78,201,0.18)",
            border: "1px solid rgba(124,111,224,0.2)",
            cursor: "pointer",
            zIndex: 50,
            animation: "slideUp 0.4s ease",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" }}>{greeting[0]}</p>
          <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: 0, lineHeight: 1.5 }}>{greeting[1]}</p>
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--purple-deep)", fontWeight: 500 }}>点击聊聊 →</span>
            <button onClick={(e) => { e.stopPropagation(); setBubbleVisible(false); setBubbleDismissed(true); }}
              style={{ background: "none", border: "none", fontSize: 14, color: "var(--ink-muted)", cursor: "pointer", padding: "0 2px" }}>×</button>
          </div>
          {/* 气泡小尾巴 */}
          <div style={{
            position: "absolute", bottom: -8, left: 20,
            width: 0, height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "8px solid rgba(255,255,255,0.95)",
          }} />
        </div>
      )}

      {/* 圆球按钮 */}
      <button
        onClick={open ? () => setOpen(false) : openChat}
        style={{
          position: "fixed",
          bottom: 32,
          left: 24,
          width: 68,
          height: 68,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          zIndex: 51,
          background: "linear-gradient(135deg, #B8AEFF 0%, #8B7FD9 40%, #6B9EE8 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          boxShadow: open
            ? "0 0 0 4px rgba(124,111,224,0.3), 0 12px 40px rgba(124,111,224,0.5)"
            : "0 0 0 0px rgba(124,111,224,0), 0 8px 32px rgba(124,111,224,0.45)",
          transform: orbPop ? "scale(1.15)" : open ? "scale(1.05)" : "scale(1)",
          transition: "transform 0.3s ease, box-shadow 0.3s ease",
          animation: (!open && !orbPop) ? "orbPulse 3s ease-in-out infinite" : "none",
          overflow: "hidden",
        }}
        title="找星伴聊聊"
      >
        {/* 高光层 */}
        <span style={{
          position: "absolute", top: 6, left: 10,
          width: 24, height: 12,
          background: "rgba(255,255,255,0.35)",
          borderRadius: "50%",
          transform: "rotate(-20deg)",
          pointerEvents: "none",
        }} />
        <span style={{ position: "relative", zIndex: 1 }}>💟</span>
        {/* 未读气泡小点 */}
        {!open && bubbleVisible && (
          <span style={{
            position: "absolute", top: 6, right: 6,
            width: 12, height: 12, borderRadius: "50%",
            background: "#FF6B6B",
            border: "2px solid white",
          }} />
        )}
      </button>

      {/* 聊天抽屉 */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{
            position: "fixed", inset: 0,
            background: "rgba(26,22,51,0.35)",
            backdropFilter: "blur(6px)",
            zIndex: 60,
            animation: "fadeIn 0.2s ease",
          }} />

          <div style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            height: "85vh",
            background: "rgba(245,243,255,0.96)",
            backdropFilter: "blur(40px)",
            borderRadius: "28px 28px 0 0",
            zIndex: 70,
            display: "flex", flexDirection: "column",
            boxShadow: "0 -12px 60px rgba(90,78,201,0.25)",
            animation: "slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
            overflow: "hidden",
          }}>
            {/* 顶部把手 */}
            <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(124,111,224,0.2)" }} />
            </div>

            {/* 顶部信息栏 */}
            <div style={{
              padding: "10px 20px 14px",
              display: "flex", alignItems: "center", gap: 12, flexShrink: 0,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "linear-gradient(135deg, #B8AEFF 0%, #8B7FD9 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 20, flexShrink: 0,
                boxShadow: "0 4px 16px rgba(124,111,224,0.4)",
              }}>💟</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>星伴</p>
                <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>
                  {loading ? "正在思考..." : "在线 · 随时找我说说话"}
                </p>
              </div>
              <button onClick={() => { setOpen(false); router.push("/chat"); }}
                style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 12.5, padding: "7px 14px", borderRadius: 20, cursor: "pointer", fontWeight: 500 }}>
                展开全屏 →
              </button>
            </div>

            {/* 分割线 */}
            <div style={{ height: 1, background: "rgba(124,111,224,0.08)", flexShrink: 0 }} />

            {/* 消息区 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 0" }}>
              {messages.length === 0 && !loading && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--ink-soft)" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>💟</div>
                  <p style={{ fontSize: 14 }}>正在连接星伴...</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role === "user" ? "me" : ""}`}>
                  {m.role === "assistant" && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #B8AEFF, #8B7FD9)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
                      boxShadow: "0 2px 8px rgba(124,111,224,0.3)",
                    }}>💟</div>
                  )}
                  <div className={`bubble ${m.role === "user" ? "me" : "ai"}`} style={{ fontSize: 14.5, lineHeight: 1.65 }}>
                    {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                  </div>
                </div>
              ))}
              {(loading || streamingText) && (
                <div className="msg-row">
                  <div style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #B8AEFF, #8B7FD9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>💟</div>
                  <div className="bubble ai" style={{ fontSize: 14.5 }}>
                    {streamingText || <ThinkingDots />}
                  </div>
                </div>
              )}
              <div ref={bottomRef} style={{ height: 16 }} />
            </div>

            {/* 输入区 */}
            <div style={{
              padding: "12px 16px 28px",
              background: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(124,111,224,0.08)",
              flexShrink: 0,
            }}>
              <div style={{
                display: "flex", gap: 10, alignItems: "center",
                background: "rgba(255,255,255,0.9)",
                border: "1.5px solid rgba(124,111,224,0.18)",
                borderRadius: 22,
                padding: "8px 8px 8px 18px",
                boxShadow: "0 2px 16px rgba(90,78,201,0.07)",
                transition: "border-color 0.2s",
              }}>
                <input
                  ref={inputRef}
                  placeholder="说点什么..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !loading && send()}
                  style={{
                    flex: 1, border: "none", outline: "none",
                    background: "transparent", fontSize: 15,
                    fontFamily: "inherit", color: "var(--ink)",
                  }}
                />
                {loading ? (
                  <button onClick={stopStream} style={{
                    width: 38, height: 38, borderRadius: "50%", border: "none",
                    background: "rgba(201,74,74,0.12)", color: "var(--coral-deep)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                  }}>⏹</button>
                ) : (
                  <button onClick={send} disabled={!input.trim()} style={{
                    width: 38, height: 38, borderRadius: "50%", border: "none",
                    background: !input.trim() ? "rgba(124,111,224,0.12)" : "linear-gradient(135deg, #B8AEFF, #7C6FE0)",
                    color: "#fff", cursor: !input.trim() ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, flexShrink: 0,
                    boxShadow: !input.trim() ? "none" : "0 4px 14px rgba(124,111,224,0.4)",
                    transition: "all 0.2s",
                  }}>↑</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
