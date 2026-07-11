// components/EmptyState.js
// 统一的空状态和骨架屏组件，给各页面复用。

export function EmptyState({ emoji = "🌱", title, desc, actionLabel, onAction }) {
  return (
    <div className="card" style={{ textAlign: "center", padding: "44px 24px" }}>
      <div style={{ fontSize: 44, marginBottom: 14 }}>{emoji}</div>
      {title && <p style={{ fontSize: 16, fontWeight: 600, margin: "0 0 8px", color: "var(--ink)" }}>{title}</p>}
      {desc && (
        <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>
          {desc}
        </p>
      )}
      {actionLabel && onAction && (
        <button className="btn primary" style={{ marginTop: 20, maxWidth: 240, marginLeft: "auto", marginRight: "auto" }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

// 通用骨架行
export function SkeletonLine({ width = "100%", height = 16, style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: 8,
      background: "linear-gradient(90deg, rgba(124,111,224,0.08) 25%, rgba(124,111,224,0.16) 50%, rgba(124,111,224,0.08) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

// 整页骨架屏（多张卡片）
export function PageSkeleton({ cards = 3 }) {
  return (
    <div className="wrap">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card" style={{ marginBottom: 14 }}>
          <SkeletonLine width="45%" height={18} style={{ marginBottom: 12 }} />
          <SkeletonLine width="100%" style={{ marginBottom: 8 }} />
          <SkeletonLine width="70%" />
        </div>
      ))}
    </div>
  );
}

// 聊天页骨架（气泡形状）
export function ChatSkeleton() {
  return (
    <div className="wrap" style={{ paddingTop: 20 }}>
      {[{ me: false, w: "60%" }, { me: true, w: "40%" }, { me: false, w: "72%" }].map((row, i) => (
        <div key={i} style={{ display: "flex", justifyContent: row.me ? "flex-end" : "flex-start", marginBottom: 16 }}>
          <div style={{
            width: row.w, height: 44, borderRadius: 18,
            background: "linear-gradient(90deg, rgba(124,111,224,0.08) 25%, rgba(124,111,224,0.16) 50%, rgba(124,111,224,0.08) 75%)",
            backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite",
          }} />
        </div>
      ))}
    </div>
  );
}
