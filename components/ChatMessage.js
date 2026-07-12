// components/ChatMessage.js
// 统一的聊天消息组件：富文本、图片、复制、重新生成、编辑、反馈
import { useState } from "react";
import { RichText } from "../lib/richText";

// 从多模态content里取出文本和图片
function parseContent(content) {
  if (typeof content === "string") return { text: content, images: [] };
  if (Array.isArray(content)) {
    let text = "";
    const images = [];
    for (const part of content) {
      if (part?.type === "text") text += part.text || "";
      else if (part?.type === "image_url") images.push(part.image_url?.url);
    }
    return { text, images };
  }
  return { text: "", images: [] };
}

export default function ChatMessage({
  role, content, avatar, streaming,
  onRegenerate, onFeedback, feedbackValue, onEdit,
  showActions = true,
}) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const isUser = role === "user";
  const { text, images } = parseContent(content);

  function copy() {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function startEdit() {
    setDraft(text);
    setEditing(true);
  }
  function commitEdit() {
    if (draft.trim() && draft.trim() !== text) onEdit(draft.trim());
    setEditing(false);
  }

  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 22, flexDirection: isUser ? "row-reverse" : "row", alignItems: "flex-start" }}>
      <div style={{
        width: 34, height: 34, borderRadius: isUser ? "50%" : 11, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
        background: isUser ? "linear-gradient(135deg, var(--purple), var(--purple-deep))" : "linear-gradient(135deg, #B8AEFF, #7C6FE0)",
        boxShadow: "0 2px 10px rgba(124,111,224,0.25)",
      }}>
        {avatar || (isUser ? "🙂" : "✦")}
      </div>

      <div style={{ maxWidth: "84%", minWidth: 0 }}>
        {editing ? (
          <div style={{ background: "var(--card-solid)", border: "1.5px solid var(--purple)", borderRadius: 14, padding: "10px 12px" }}>
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
                if (e.key === "Escape") setEditing(false);
              }}
              rows={3}
              style={{ width: "100%", border: "none", outline: "none", resize: "vertical", background: "transparent", fontSize: 14.5, fontFamily: "inherit", lineHeight: 1.6, color: "var(--ink)", minHeight: 60 }}
            />
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 6 }}>
              <button onClick={() => setEditing(false)} style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--ink-soft)", fontSize: 12.5, padding: "5px 12px", borderRadius: 8, cursor: "pointer" }}>取消</button>
              <button onClick={commitEdit} style={{ background: "var(--purple)", border: "none", color: "#fff", fontSize: 12.5, padding: "5px 12px", borderRadius: 8, cursor: "pointer" }}>发送</button>
            </div>
          </div>
        ) : (
          <div style={{
            background: isUser ? "linear-gradient(135deg, var(--purple), var(--purple-deep))" : "var(--card-solid)",
            color: isUser ? "#fff" : "var(--ink)",
            border: isUser ? "none" : "1px solid rgba(124,111,224,0.1)",
            borderRadius: isUser ? "18px 6px 18px 18px" : "6px 18px 18px 18px",
            padding: "12px 16px", fontSize: 14.5, lineHeight: 1.7,
            boxShadow: isUser ? "0 4px 16px rgba(124,111,224,0.28)" : "0 2px 12px rgba(90,78,201,0.06)",
            wordBreak: "break-word",
          }}>
            {images.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: text ? 8 : 0 }}>
                {images.map((src, i) => (
                  <img key={i} src={src} alt="上传的图片"
                    style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 10, display: "block", cursor: "pointer" }}
                    onClick={() => window.open(src, "_blank")} />
                ))}
              </div>
            )}
            {isUser ? (
              text && <span style={{ whiteSpace: "pre-wrap" }}>{text}</span>
            ) : (
              <RichText text={text} />
            )}
            {streaming && <span style={{ opacity: 0.5, marginLeft: 2 }}>▌</span>}
          </div>
        )}

        {/* 操作栏 */}
        {!streaming && !editing && showActions && (
          <div style={{ display: "flex", gap: 4, marginTop: 6, paddingLeft: 4, justifyContent: isUser ? "flex-end" : "flex-start" }}>
            {isUser && onEdit && (
              <button onClick={startEdit} title="编辑" style={actionBtnStyle}>✎</button>
            )}
            {!isUser && text && (
              <>
                <button onClick={copy} title="复制" style={actionBtnStyle}>{copied ? "✓" : "⧉"}</button>
                {onRegenerate && <button onClick={onRegenerate} title="重新生成" style={actionBtnStyle}>↻</button>}
                {onFeedback && (
                  <>
                    <button onClick={() => onFeedback(1)} title="有帮助"
                      style={{ ...actionBtnStyle, opacity: feedbackValue === 1 ? 1 : 0.55 }}>👍</button>
                    <button onClick={() => onFeedback(-1)} title="没帮助"
                      style={{ ...actionBtnStyle, opacity: feedbackValue === -1 ? 1 : 0.55 }}>👎</button>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const actionBtnStyle = {
  background: "transparent", border: "none", color: "var(--ink-muted)",
  cursor: "pointer", fontSize: 14, padding: "3px 7px", borderRadius: 7, lineHeight: 1,
};
