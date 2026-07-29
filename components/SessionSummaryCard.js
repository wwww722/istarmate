// components/SessionSummaryCard.js
// 会话小结卡：聊天告一段落时弹出，许安和/余生给的温暖小结。
// 右下角：存进记忆墙 / 转情绪日记 / 分享
import { useRouter } from "next/router";

export default function SessionSummaryCard({ card, onClose, onSaveToMemory }) {
  const router = useRouter();
  if (!card) return null;

  const isCompanion = card.roleKind === "companion";
  // 许安和：米白+浅粉；余生：科技蓝
  const theme = isCompanion
    ? { bg: "linear-gradient(135deg, #fffaf7, #fff0f3)", border: "rgba(224,150,170,0.4)", accent: "#c46b82", emoji: "🌙" }
    : { bg: "linear-gradient(135deg, #f0fffb, #e8f6ff)", border: "rgba(63,140,190,0.4)", accent: "#2f7cae", emoji: "💻" };

  function toDiary() {
    // 把小结数据带到情绪日记页预填
    const params = new URLSearchParams({
      from: "session",
      who: card.who,
      mood: String(card.mood),
      hint: card.diaryHint || "",
    });
    router.push(`/mood-diary?${params.toString()}`);
  }

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,18,31,0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: theme.bg, border: `1.5px solid ${theme.border}`, borderRadius: 22, padding: "24px 22px", maxWidth: 360, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 22 }}>{theme.emoji}</span>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0, color: theme.accent }}>{card.who}的小结</p>
            <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: 0 }}>今天聊得不错，记一笔</p>
          </div>
        </div>

        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--ink)", margin: "0 0 20px" }}>{card.summary}</p>

        <div style={{ display: "grid", gap: 8 }}>
          <button onClick={toDiary}
            style={{ padding: "11px", borderRadius: 12, border: "none", background: theme.accent, color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
            📝 转成今天的情绪日记
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onSaveToMemory?.(card); }}
              style={{ flex: 1, padding: "10px", borderRadius: 12, border: `1px solid ${theme.border}`, background: "rgba(255,255,255,0.6)", color: theme.accent, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              📥 存进记忆墙
            </button>
            <button onClick={onClose}
              style={{ flex: "0 0 auto", padding: "10px 16px", borderRadius: 12, border: "none", background: "transparent", color: "var(--ink-muted)", fontSize: 13, cursor: "pointer" }}>
              关闭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
