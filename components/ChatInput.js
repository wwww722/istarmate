// components/ChatInput.js
// 统一输入栏：自动高度、快捷提示、语音输入、图片上传、发送/停止
import { useRef } from "react";
import VoiceInput from "./VoiceInput";
import ImageUpload from "./ImageUpload";

export default function ChatInput({
  value, onChange, onSend, onStop, loading,
  placeholder = "说点什么...",
  quickPrompts = [],
  leftButton = null,
  enableVoice = true,
  enableImage = false,
  pendingImage = null,
  onImage = null,
  onRemoveImage = null,
}) {
  const ref = useRef(null);

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (!loading) onSend(); }
  }
  function resize(e) {
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 150) + "px";
  }

  const canSend = value.trim() || pendingImage;

  return (
    <div style={{ padding: "10px 16px 20px", borderTop: "1px solid var(--line)", background: "var(--card)", backdropFilter: "blur(20px)" }}>
      {quickPrompts.length > 0 && !value && !pendingImage && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 10, paddingBottom: 2, maxWidth: 820, margin: "0 auto 10px" }}>
          {quickPrompts.map((q, i) => (
            <button key={i} onClick={() => onChange(q.text || q)}
              style={{ flexShrink: 0, background: "var(--card-solid)", border: "1px solid rgba(124,111,224,0.2)", color: "var(--purple-deep)", fontSize: 12.5, padding: "6px 13px", borderRadius: 20, cursor: "pointer", whiteSpace: "nowrap" }}>
              {q.label || q}
            </button>
          ))}
        </div>
      )}

      {/* 待发送的图片预览 */}
      {pendingImage && (
        <div style={{ maxWidth: 820, margin: "0 auto 8px", display: "flex" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={pendingImage} alt="待发送" style={{ height: 70, borderRadius: 10, border: "1px solid var(--line)", display: "block" }} />
            <button onClick={onRemoveImage}
              style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: "50%", background: "var(--coral-deep)", color: "#fff", border: "2px solid var(--bg)", cursor: "pointer", fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", gap: 4, alignItems: "flex-end", background: "var(--card-solid)", border: "1.5px solid rgba(124,111,224,0.18)", borderRadius: 18, padding: "7px 7px 7px 8px", boxShadow: "0 2px 16px rgba(90,78,201,0.07)" }}>
        {leftButton}
        {enableImage && onImage && <ImageUpload onImage={onImage} disabled={loading} />}
        <textarea
          ref={ref}
          rows={1}
          placeholder={placeholder}
          value={value}
          onChange={(e) => { onChange(e.target.value); resize(e); }}
          onKeyDown={handleKey}
          style={{ flex: 1, border: "none", outline: "none", resize: "none", background: "transparent", fontSize: 15, fontFamily: "inherit", lineHeight: 1.55, color: "var(--ink)", minHeight: 24, maxHeight: 150, padding: "6px 4px" }}
        />
        {enableVoice && (
          <VoiceInput
            disabled={loading}
            onTranscript={(text, isFinal) => { if (text) onChange(text); }}
          />
        )}
        {loading ? (
          <button onClick={onStop} title="停止"
            style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "rgba(201,74,74,0.12)", color: "var(--coral-deep)", cursor: "pointer", fontSize: 15, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>■</button>
        ) : (
          <button onClick={onSend} disabled={!canSend}
            style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: canSend ? "linear-gradient(135deg, #9B8FF0, #7C6FE0)" : "rgba(124,111,224,0.12)", color: "#fff", cursor: canSend ? "pointer" : "default", fontSize: 17, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: canSend ? "0 4px 14px rgba(124,111,224,0.4)" : "none", transition: "all 0.2s" }}>↑</button>
        )}
      </div>
    </div>
  );
}
