// components/MoodChart.js
const MOOD_VALUES = { great: 4, ok: 3, meh: 2, down: 1, bad: 0 };
const MOOD_EMOJI  = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };
const MOOD_LABEL  = { great: "很好", ok: "还行", meh: "一般", down: "低落", bad: "很差" };

function getDayLabel(dateStr) {
  const d = new Date(dateStr);
  return ["日","一","二","三","四","五","六"][d.getDay()];
}

export default function MoodChart({ logs }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const logMap = {};
  (logs || []).forEach(l => {
    const ds = typeof l.log_date === "string" ? l.log_date : new Date(l.log_date).toISOString().slice(0, 10);
    logMap[ds] = l.mood;
  });

  const hasData = days.some(d => logMap[d]);

  // 空状态
  if (!hasData) {
    return (
      <div className="card" style={{ padding: "20px", marginBottom: 16, textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>📈</div>
        <p style={{ fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>心情趋势图</p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0, lineHeight: 1.6 }}>
          每天打卡心情，<br />连续3天后这里会出现你的情绪趋势。
        </p>
      </div>
    );
  }

  const W = 320, H = 110, padX = 20, padY = 16;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const stepX = innerW / 6;

  const points = days.map((d, i) => {
    const mood = logMap[d];
    const val = mood != null ? MOOD_VALUES[mood] : null;
    return {
      x: padX + i * stepX,
      y: val !== null ? padY + innerH - (val / 4) * innerH : null,
      mood, day: getDayLabel(d),
    };
  });

  const validPoints = points.filter(p => p.y !== null);
  const polyline = validPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card" style={{ padding: "16px 18px", marginBottom: 16 }}>
      <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 12 }}>过去7天心情</p>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {[0,1,2,3,4].map(v => (
          <line key={v} x1={padX} y1={padY + innerH - (v/4)*innerH}
            x2={W - padX} y2={padY + innerH - (v/4)*innerH}
            stroke="rgba(124,111,224,0.1)" strokeWidth="1" strokeDasharray="3,3" />
        ))}
        {validPoints.length > 1 && (
          <polyline points={polyline} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#9B8FF0" />
            <stop offset="100%" stopColor="#6B9EE8" />
          </linearGradient>
        </defs>
        {points.map((p, i) => (
          <g key={i}>
            {p.y !== null ? (
              <>
                <circle cx={p.x} cy={p.y} r="5" fill="#8B7FD9" />
                <circle cx={p.x} cy={p.y} r="8" fill="rgba(139,127,217,0.15)" />
                <text x={p.x} y={p.y - 12} textAnchor="middle" fontSize="14">{MOOD_EMOJI[p.mood]}</text>
              </>
            ) : (
              <text x={p.x} y={padY + innerH/2} textAnchor="middle" fontSize="10" fill="rgba(124,111,224,0.3)">—</text>
            )}
            <text x={p.x} y={H - 1} textAnchor="middle" fontSize="10" fill="var(--ink-muted)">{p.day}</text>
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {Object.entries(MOOD_EMOJI).map(([k, e]) => (
          <span key={k} style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{e} {MOOD_LABEL[k]}</span>
        ))}
      </div>
    </div>
  );
}
