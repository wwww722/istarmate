// components/StarOrb.js
// 仿Siri风格的星伴浮动圆球，常驻在页面左下角。
// 点击弹出全屏聊天抽屉，带呼吸动画和渐变光效。

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { streamFetch } from "../lib/useStreamChat";
import { renderMarkdown } from "../lib/renderMarkdown";

// 不显示圆球的页面
const HIDDEN_PATHS = ["/login", "/", "/onboarding", "/avatar", "/questionnaire", "/questionnaire-result"];

function ThinkingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--ink-soft)",
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
  );
}

export default function StarOrb() {
  const { status } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [orbActive, setOrbActive] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);

  const hidden = HIDDEN_PATHS.includes(router.pathname) || status !== "authenticated";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  async function openOrb() {
    setOrbActive(true);
    setTimeout(() => setOrbActive(false), 600);
    setOpen(true);
    if (!initialized) {
      setInitialized(true);
      await runStream([{ role: "user", content: "（以星伴身份，用一句温暖简短的话打个招呼，问问我现在怎么样——不要用固定公式，要有新鲜感）" }], []);
    }
  }

  function stopStream() {
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    setLoading(false);
  }

  async function runStream(apiMessages, displayMessages) {
    setLoading(true);
    setStreamingText("");
    let fullText = "";
    await streamFetch("/api/chat", apiMessages,
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

  async function send() {
    if (!input.trim() || loading) return;
    const next = [...messages, { role: "user", content: input }];
    setMessages(next);
    setInput("");
    await runStream(next, next);
  }

  if (hidden) return null;

  return (
    <>
      {/* 圆球按钮 */}
      <button
        onClick={openOrb}
        style={{
          position: "fixed",
          bottom: 28,
          left: 24,
          width: 58,
          height: 58,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          zIndex: 50,
          background: "linear-gradient(135deg, #9B8FF0 0%, #7C6FE0 40%, #6B9EE8 100%)",
          animation: open ? "none" : "orbPulse 3s ease-in-out infinite",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          boxShadow: "0 8px 32px rgba(124,111,224,0.45)",
          transform: orbActive ? "scale(0.92)" : "scale(1)",
          transition: "transform 0.15s ease",
        }}
        title="找星伴聊聊"
      >
        <span style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%)",
        }} />
        💟
      </button>

      {/* 聊天抽屉 */}
      {open && (
        <>
          {/* 背景遮罩 */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(26,22,51,0.4)",
              backdropFilter: "blur(4px)",
              zIndex: 60,
              animation: "fadeIn 0.2s ease",
            }}
          />

          {/* 聊天面板 */}
          <div style={{
            position: "fixed",
            bottom: 0, left: 0, right: 0,
            height: "82vh",
            background: "rgba(245,243,255,0.95)",
            backdropFilter: "blur(30px)",
            borderRadius: "28px 28px 0 0",
            zIndex: 70,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -8px 60px rgba(90,78,201,0.2)",
            animation: "slideUp 0.3s ease",
            overflow: "hidden",
          }}>
            {/* 顶部导航 */}
            <div style={{
              padding: "14px 20px 12px",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              borderBottom: "1px solid rgba(124,111,224,0.1)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}>
              {/* 小圆球 */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%",
                background: "linear-gradient(135deg, #9B8FF0 0%, #7C6FE0 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
                boxShadow: "0 4px 12px rgba(124,111,224,0.35)",
              }}>💟</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0, color: "var(--ink)" }}>星伴</p>
                <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>随时找我说说话</p>
              </div>
              {/* 去完整聊天页 */}
              <button
                onClick={() => { setOpen(false); router.push("/chat"); }}
                style={{ background: "var(--purple-light)", border: "none", color: "var(--purple-deep)", fontSize: 12, padding: "6px 12px", borderRadius: 20, cursor: "pointer", fontWeight: 500 }}>
                展开 →
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-soft)", padding: "0 4px" }}>
                ×
              </button>
            </div>

            {/* 消息区 */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 0" }}>
              {messages.map((m, i) => (
                <div key={i} className={`msg-row ${m.role === "user" ? "me" : ""}`}>
                  {m.role === "assistant" && (
                    <div style={{
                      width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                      background: "linear-gradient(135deg, #9B8FF0, #7C6FE0)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
                    }}>💟</div>
                  )}
                  <div className={`bubble ${m.role === "user" ? "me" : "ai"}`} style={{ fontSize: 14.5 }}>
                    {m.role === "assistant" ? renderMarkdown(m.content) : m.content}
                  </div>
                </div>
              ))}
              {(loading || streamingText) && (
                <div className="msg-row">
                  <div style={{ width: 30, height: 30, borderRadius: "50%", flexShrink: 0, background: "linear-gradient(135deg, #9B8FF0, #7C6FE0)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>💟</div>
                  <div className="bubble ai" style={{ fontSize: 14.5 }}>
                    {streamingText || <ThinkingDots />}
                  </div>
                </div>
              )}
              <div ref={bottomRef} style={{ height: 16 }} />
            </div>

            {/* 输入区 */}
            <div style={{
              padding: "12px 16px 24px",
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(20px)",
              borderTop: "1px solid rgba(124,111,224,0.1)",
              flexShrink: 0,
            }}>
              <div style={{
                display: "flex", gap: 10, alignItems: "center",
                background: "rgba(255,255,255,0.8)",
                border: "1.5px solid rgba(124,111,224,0.15)",
                borderRadius: 20,
                padding: "8px 8px 8px 16px",
                boxShadow: "0 2px 12px rgba(90,78,201,0.06)",
              }}>
                <input
                  ref={inputRef}
                  placeholder="说点什么..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  style={{
                    flex: 1, border: "none", outline: "none",
                    background: "transparent", fontSize: 15,
                    fontFamily: "inherit", color: "var(--ink)",
                  }}
                />
                {loading ? (
                  <button onClick={stopStream} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "rgba(201,74,74,0.15)", color: "var(--coral-deep)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>⏹</button>
                ) : (
                <button
                  onClick={send}
                  disabled={!input.trim()}
                  style={{
                    width: 36, height: 36, borderRadius: "50%", border: "none",
                    background: loading || !input.trim()
                      ? "rgba(124,111,224,0.15)"
                      : "linear-gradient(135deg, #9B8FF0, #7C6FE0)",
                    color: "#fff", cursor: loading || !input.trim() ? "default" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, flexShrink: 0,
                    transition: "all 0.2s",
                    boxShadow: loading || !input.trim() ? "none" : "0 4px 12px rgba(124,111,224,0.35)",
                  }}
                >↑</button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
