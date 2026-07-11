import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { PageSkeleton } from "../components/EmptyState";

const MOOD_EMOJI = { great: "😄", ok: "🙂", meh: "😐", down: "😔", bad: "😣" };
const TREND_ICON = { "上升": "📈", "下降": "📉", "平稳": "➡️" };

function MonthLabel(yearMonth) {
  if (!yearMonth) return "";
  const [y, m] = yearMonth.split("-");
  return `${y}年${parseInt(m)}月`;
}

export default function MonthlyReport() {
  const router = useRouter();
  const { status } = useSession();
  const [reports, setReports] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const r = await fetch("/api/monthly-report");
    const data = await r.json();
    const rpts = (data.reports || []).map(r => r.report);
    setReports(rpts);
    if (rpts.length > 0) setSelected(rpts[0]);
    setLoading(false);
  }

  async function generate() {
    setGenerating(true);
    setError("");
    const r = await fetch("/api/monthly-report", { method: "POST" });
    const data = await r.json();
    setGenerating(false);
    if (data.error) { setError(data.error); return; }
    if (data.report) {
      setReports(prev => [data.report, ...prev.filter(r => r.yearMonth !== data.report.yearMonth)]);
      setSelected(data.report);
    }
  }

  if (status !== "authenticated") return null;
  if (loading) return <PageSkeleton cards={3} />;

  const report = selected;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
  const hasThisMonth = reports.some(r => r.yearMonth === thisMonth);

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>成长报告</h2>
      </div>

      {/* 生成按钮 */}
      {!hasThisMonth && (
        <div className="card" style={{ marginBottom: 16, padding: "16px 20px" }}>
          <p style={{ fontSize: 14, margin: "0 0 10px" }}>
            {MonthLabel(thisMonth)}的报告还没有生成
          </p>
          <button className="btn primary" onClick={generate} disabled={generating}>
            {generating ? "AI正在回顾这个月..." : "✨ 生成本月成长报告"}
          </button>
          {error && <p style={{ color: "var(--coral-deep)", fontSize: 13, marginTop: 8 }}>{error}</p>}
        </div>
      )}

      {/* 月份选择 */}
      {reports.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 16, paddingBottom: 4 }}>
          {reports.map((r, i) => (
            <button key={i} onClick={() => setSelected(r)} style={{
              padding: "6px 16px", borderRadius: 20, border: "1.5px solid",
              borderColor: selected?.yearMonth === r.yearMonth ? "var(--purple)" : "var(--line)",
              background: selected?.yearMonth === r.yearMonth ? "var(--purple-light)" : "#fff",
              color: selected?.yearMonth === r.yearMonth ? "var(--purple-deep)" : "var(--ink-soft)",
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
            }}>
              {MonthLabel(r.yearMonth)}
            </button>
          ))}
        </div>
      )}

      {report ? (
        <>
          {/* 主卡片 */}
          <div style={{
            background: "linear-gradient(135deg, #8B7FD9 0%, #6B9EE8 100%)",
            borderRadius: 20, padding: "24px 22px", marginBottom: 16, color: "#fff",
            boxShadow: "0 8px 32px rgba(124,111,224,0.35)",
          }}>
            <p style={{ opacity: 0.8, fontSize: 12.5, margin: "0 0 4px" }}>{MonthLabel(report.yearMonth)} · 成长报告</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
              <span style={{ fontSize: 36 }}>{report.dominantEmoji}</span>
              <div>
                <p style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>本月基调：{report.dominantLabel}</p>
                <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
                  {TREND_ICON[report.trend]} 情绪趋势{report.trend} · 打卡{report.checkIns}天
                </p>
              </div>
            </div>
          </div>

          {/* AI叙述 */}
          <div className="card" style={{ marginBottom: 16, padding: "20px 22px" }}>
            <p style={{ fontSize: 13, color: "var(--purple-deep)", fontWeight: 500, marginBottom: 10 }}>⭐ 星伴的话</p>
            <p style={{ fontSize: 15, lineHeight: 1.85, margin: 0, color: "var(--ink)" }}>
              {report.narrative || "正在生成..."}
            </p>
          </div>

          {/* 数据亮点 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div className="card" style={{ padding: "14px", textAlign: "center" }}>
              <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 0 4px" }}>心情最好的一天</p>
              <p style={{ fontSize: 26, margin: "0 0 2px" }}>{MOOD_EMOJI[report.bestDay?.mood]}</p>
              <p style={{ fontSize: 12.5, color: "#1D9E75", margin: "0 0 2px", fontWeight: 500 }}>{report.bestDay?.label}</p>
              <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: 0 }}>{report.bestDay?.date}</p>
            </div>
            <div className="card" style={{ padding: "14px", textAlign: "center" }}>
              <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 0 4px" }}>平均心情指数</p>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "0 0 2px", color: "var(--purple)" }}>
                {report.avgScore}<span style={{ fontSize: 14 }}>/4</span>
              </p>
              <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: 0 }}>共{report.checkIns}天记录</p>
            </div>
          </div>

          {/* 重新生成 */}
          {report.yearMonth === thisMonth && (
            <button className="btn" style={{ marginTop: 8 }} onClick={generate} disabled={generating}>
              {generating ? "生成中..." : "🔄 重新生成本月报告"}
            </button>
          )}
        </>
      ) : (
        <div className="card" style={{ textAlign: "center", padding: "40px 24px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
          <p style={{ color: "var(--ink-soft)", fontSize: 14.5, lineHeight: 1.8 }}>
            每月打卡3天以上，<br />就可以让星伴帮你回顾这个月的成长。
          </p>
        </div>
      )}
    </div>
  );
}
