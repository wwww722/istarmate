// components/MoodChart.js
// 过去7天心情折线图，纯SVG绘制，不依赖任何图表库

const MOOD_VALUES = { great: 4, ok: 3, meh: 2, down: 1, bad: 0 };
const MOOD_EMOJI = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };
const MOOD_LABEL = { great: "很好", ok: "还行", meh: "一般", down: "低落", bad: "很差" };

function getDayLabel(dateStr) {
  const d = new Date(dateStr);
  return ["日", "一", "二", "三", "四", "五", "六"][d.getDay()];
}

export default function MoodChart({ logs }) {
  // 生成过去7天的日期列表
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const logMap = {};
  (logs || []).forEach(l => {
    const dateStr = typeof l.log_date === "string" ? l.log_date : new Date(l.log_date).toISOString().slice(0, 10);
    logMap[dateStr] = l.mood;
  });

  const width = 320, height = 110, padX = 20, padY = 16;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const stepX = innerW / 6;

  const points = days.map((d, i) => {
    const mood = logMap[d];
    const val = mood ? MOOD_VALUES[mood] : null;
    return {
      x: padX + i * stepX,
      y: val !== null ? padY + innerH - (val / 4) * innerH : null,
      mood,
      date: d,
      day: getDayLabel(d),
    };
  });

  // 只连接有数据的点
  const validPoints = points.filter(p => p.y !== null);
  const polyline = validPoints.map(p => `${p.x},${p.y}`).join(" ");

  return (
    <div className="card" style={{ padding: "16px 18px", marginBottom: 16 }}>
      <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 12 }}>过去7天心情</p>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
        {/* 横向参考线 */}
        {[0, 1, 2, 3, 4].map(v => (
          <line key={v}
            x1={padX} y1={padY + innerH - (v / 4) * innerH}
            x2={width - padX} y2={padY + innerH - (v / 4) * innerH}
            stroke="#E7E1D4" strokeWidth="1" strokeDasharray="3,3"
          />
        ))}
        {/* 折线 */}
        {validPoints.length > 1 && (
          <polyline points={polyline} fill="none" stroke="#8B7FD9" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* 数据点 + emoji */}
        {points.map((p, i) => (
          <g key={i}>
            {p.y !== null && (
              <>
                <circle cx={p.x} cy={p.y} r="4" fill="#8B7FD9" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="14">{MOOD_EMOJI[p.mood]}</text>
              </>
            )}
            {p.y === null && (
              <text x={p.x} y={padY + innerH / 2} textAnchor="middle" fontSize="10" fill="#C4BEDD">—</text>
            )}
            {/* 星期标签 */}
            <text x={p.x} y={height - 2} textAnchor="middle" fontSize="10" fill="#8A84A3">
              {p.day}
            </text>
          </g>
        ))}
      </svg>
      {/* 图例 */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
        {Object.entries(MOOD_EMOJI).map(([k, e]) => (
          <span key={k} style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{e} {MOOD_LABEL[k]}</span>
        ))}
      </div>
    </div>
  );
}
