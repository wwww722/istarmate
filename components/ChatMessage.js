// components/ChatMessage.js
// 统一的高级聊天消息组件，星伴和代码星共用
import { useState } from "react";
import { RichText } from "../lib/richText";

export default function ChatMessage({
  role, content, avatar, streaming,
  onCopy, onRegenerate, onFeedback, feedbackValue,
  showActions = true,
}) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";

  function copy() {
    navigator.clipboard?.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  }

  return (
    <div style={{
      display: "flex", gap: 12, marginBottom: 22,
      flexDirection: isUser ? "row-reverse" : "row",
      alignItems: "flex-start",
    }}>
      {/* 头像 */}
      <div style={{
        width: 34, height: 34, borderRadius: isUser ? "50%" : 11, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        background: isUser
          ? "linear-gradient(135deg, var(--purple), var(--purple-deep))"
          : "linear-gradient(135deg, #B8AEFF, #7C6FE0)",
        boxShadow: "0 2px 10px rgba(124,111,224,0.25)",
      }}>
        {avatar || (isUser ? "🙂" : "✦")}
      </div>

      {/* 内容 */}
      <div style={{ maxWidth: "84%", minWidth: 0 }}>
        <div style={{
          background: isUser
            ? "linear-gradient(135deg, var(--purple), var(--purple-deep))"
            : "rgba(255,255,255,0.92)",
          color: isUser ? "#fff" : "var(--ink)",
          border: isUser ? "none" : "1px solid rgba(124,111,224,0.1)",
          borderRadius: isUser ? "18px 6px 18px 18px" : "6px 18px 18px 18px",
          padding: "12px 16px",
          fontSize: 14.5, lineHeight: 1.7,
          boxShadow: isUser ? "0 4px 16px rgba(124,111,224,0.28)" : "0 2px 12px rgba(90,78,201,0.06)",
          backdropFilter: isUser ? "none" : "blur(10px)",
          wordBreak: "break-word",
        }}>
          {isUser ? (
            <span style={{ whiteSpace: "pre-wrap" }}>{content}</span>
          ) : (
            <RichText text={content} />
          )}
          {streaming && <span style={{ opacity: 0.5, marginLeft: 2 }}>▌</span>}
        </div>

        {/* AI消息的操作栏 */}
        {!isUser && !streaming && showActions && content && (
          <div style={{ display: "flex", gap: 4, marginTop: 6, paddingLeft: 4, alignItems: "center" }}>
            <button onClick={copy} title="复制"
              style={actionBtnStyle}>
              {copied ? "✓" : "⧉"}
            </button>
            {onRegenerate && (
              <button onClick={onRegenerate} title="重新生成" style={actionBtnStyle}>↻</button>
            )}
            {onFeedback && (
              <>
                <button onClick={() => onFeedback(1)} title="有帮助"
                  style={{ ...actionBtnStyle, color: feedbackValue === 1 ? "var(--teal)" : "var(--ink-muted)" }}>
                  {feedbackValue === 1 ? "👍" : "👍"}
                </button>
                <button onClick={() => onFeedback(-1)} title="没帮助"
                  style={{ ...actionBtnStyle, color: feedbackValue === -1 ? "var(--coral-deep)" : "var(--ink-muted)" }}>
                  👎
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtnStyle = {
  background: "transparent",
  border: "none",
  color: "var(--ink-muted)",
  cursor: "pointer",
  fontSize: 14,
  padding: "3px 7px",
  borderRadius: 7,
  transition: "background 0.15s",
  lineHeight: 1,
};
