import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const MOOD_EMOJI = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };
const MOOD_VALUES = { great: 4, ok: 3, meh: 2, down: 1, bad: 0 };

function weekLabel(dateStr) {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}月${d.getDate()}日 那周`;
}

export default function WeeklyReport() {
  const router = useRouter();
  const { status } = useSession();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const r = await fetch("/api/weekly-report");
    const data = await r.json();
    setReports(data.reports || []);
    setLoading(false);
  }

  if (status !== "authenticated" || loading) return null;

  const report = reports[selected]?.report;
  const avgToColor = (avg) => avg >= 3 ? "#1D9E75" : avg >= 2 ? "#EF9F27" : "#D85A30";

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>每周情绪报告</h2>
      </div>

      {reports.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8 }}>
            本周还没有足够的数据。<br />每天打卡心情，这里会自动生成周报。
          </p>
        </div>
      ) : (
        <>
          {/* 周报选择 */}
          {reports.length > 1 && (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
              {reports.map((r, i) => (
                <button key={i} onClick={() => setSelected(i)} style={{
                  padding: "6px 14px", borderRadius: 20, border: "1.5px solid",
                  borderColor: i === selected ? "var(--purple)" : "var(--line)",
                  background: i === selected ? "var(--purple-light)" : "#fff",
                  color: i === selected ? "var(--purple-deep)" : "var(--ink-soft)",
                  fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {i === 0 ? "本周" : weekLabel(r.report?.weekStart || r.week_start)}
                </button>
              ))}
            </div>
          )}

          {report && (
            <>
              {/* 总览卡片 */}
              <div className="card" style={{ marginBottom: 14, padding: "20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {[
                    { label: "打卡天数", value: `${report.checkIns} 天`, color: "var(--purple)" },
                    { label: "完成小剧场", value: `${report.scenarios} 次`, color: "var(--teal)" },
                    { label: "本周基调", value: `${MOOD_EMOJI[report.dominantMood]} ${report.dominantMoodLabel}`, color: avgToColor(report.avgScore) },
                    { label: "平均心情", value: `${report.avgScore}/4`, color: avgToColor(report.avgScore) },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: "center", padding: "12px 8px", background: "var(--bg)", borderRadius: 12 }}>
                      <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 0 4px" }}>{item.label}</p>
                      <p style={{ fontSize: 17, fontWeight: 600, margin: 0, color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 最好/最差 */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div className="card" style={{ padding: "14px", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 4px" }}>心情最好那天</p>
                  <p style={{ fontSize: 24, margin: "0 0 4px" }}>{MOOD_EMOJI[report.bestDay?.mood]}</p>
                  <p style={{ fontSize: 13, color: "#1D9E75", margin: 0 }}>{report.bestDay?.label}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "2px 0 0" }}>{report.bestDay?.date}</p>
                </div>
                <div className="card" style={{ padding: "14px", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 4px" }}>最低落那天</p>
                  <p style={{ fontSize: 24, margin: "0 0 4px" }}>{MOOD_EMOJI[report.worstDay?.mood]}</p>
                  <p style={{ fontSize: 13, color: "#D85A30", margin: 0 }}>{report.worstDay?.label}</p>
                  <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "2px 0 0" }}>{report.worstDay?.date}</p>
                </div>
              </div>

              {/* 本周每天心情 */}
              {report.logs?.length > 0 && (
                <div className="card" style={{ padding: "16px 18px" }}>
                  <p style={{ fontSize: 13.5, fontWeight: 500, marginBottom: 12 }}>这周的打卡</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {report.logs.map((l, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22 }}>{MOOD_EMOJI[l.mood]}</div>
                        <p style={{ fontSize: 10, color: "var(--ink-soft)", margin: "2px 0 0" }}>{l.date?.slice(5)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
