import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

function maskEmail(email) {
  if (!email) return "匿名用户";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const masked = name.length <= 2 ? name[0] + "*" : name.slice(0, 2) + "***";
  return `${masked}@${domain}`;
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${hours}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

const thStyle = { padding: "6px 8px", textAlign: "left", borderBottom: "1px solid var(--line)", fontWeight: 500 };
const tdStyle = { padding: "6px 8px", borderBottom: "1px solid var(--line)", color: "var(--ink)" };

export default function Admin() {
  const router = useRouter();
  const { status } = useSession();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    try {
      const r = await fetch("/api/admin");
      if (r.status === 403) { setForbidden(true); setLoading(false); return; }
      const d = await r.json();
      setData(d);
    } catch {}
    setLoading(false);
  }

  if (status !== "authenticated" || loading) {
    return <div className="wrap"><p style={{ color: "var(--ink-soft)", textAlign: "center", padding: 40 }}>加载中...</p></div>;
  }

  if (forbidden) {
    return (
      <div className="wrap" style={{ textAlign: "center", paddingTop: 80 }}>
        <div style={{ fontSize: 44, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: 20, marginBottom: 8 }}>无权访问</h2>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 24 }}>这个页面只有管理员可以查看。</p>
        <button className="btn primary" style={{ maxWidth: 200, margin: "0 auto" }} onClick={() => router.push("/dashboard")}>返回首页</button>
      </div>
    );
  }

  const { stats, crisisLogs, signupTrend, safetyLogs, usage, retention, quality } = data || {};

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>管理后台</h2>
      </div>

      {/* 核心数据 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        {[
          { label: "总用户", value: stats?.totalUsers, color: "var(--purple)" },
          { label: "今日活跃", value: stats?.todayActive, color: "var(--teal)" },
          { label: "7天活跃", value: stats?.weekActive, color: "#6B9EE8" },
          { label: "30天危机信号", value: stats?.crisisCount30d, color: "var(--coral-deep)" },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: "16px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 6px" }}>{s.label}</p>
            <p style={{ fontSize: 28, fontWeight: 700, margin: 0, color: s.color }}>{s.value ?? 0}</p>
          </div>
        ))}
      </div>

      {/* 危机信号 —— 最重要 */}
      <div className="card" style={{ marginBottom: 16, padding: "18px 20px", border: crisisLogs?.length ? "1.5px solid var(--coral-deep)" : "1px solid var(--line)" }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--coral-deep)" }}>
          ⚠️ 危机信号记录
        </p>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>
          用户对话中触发高风险关键词的记录，请及时关注
        </p>
        {crisisLogs?.length === 0 ? (
          <p style={{ fontSize: 14, color: "var(--teal-deep)", textAlign: "center", padding: "16px 0" }}>
            ✓ 近期没有危机信号
          </p>
        ) : (
          <div>
            {crisisLogs?.map((log) => (
              <div key={log.id} style={{ padding: "12px 0", borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--coral-deep)" }}>
                    关键词：{log.keywords}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>{timeAgo(log.created_at)}</span>
                </div>
                <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 2px" }}>
                  用户：{maskEmail(log.email)}
                </p>
                <p style={{ fontSize: 13, color: "var(--ink)", margin: 0, background: "#FEF2F2", padding: "8px 10px", borderRadius: 8, lineHeight: 1.5 }}>
                  "{log.message_snippet}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 内容安全事件 */}
      <div className="card" style={{ marginBottom: 16, padding: "18px 20px", border: safetyLogs?.length ? "1.5px solid var(--gold)" : "1px solid var(--line)" }}>
        <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px", color: "var(--gold)" }}>🛡️ 内容安全事件</p>
        <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 12px" }}>
          越狱诱导尝试 / AI输出被拦截的记录
        </p>
        {!safetyLogs?.length ? (
          <p style={{ fontSize: 14, color: "var(--teal-deep)", textAlign: "center", padding: "12px 0" }}>✓ 近期没有安全事件</p>
        ) : safetyLogs.map(log => (
          <div key={log.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
              <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--gold)" }}>
                {log.event_type === "jailbreak" ? "⚠️ 越狱尝试" : "🚫 输出拦截"}
              </span>
              <span style={{ fontSize: 11.5, color: "var(--ink-muted)" }}>{timeAgo(log.created_at)}</span>
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 2px" }}>{maskEmail(log.email)}</p>
            <p style={{ fontSize: 12.5, color: "var(--ink)", margin: 0, background: "var(--bg)", padding: "6px 9px", borderRadius: 7, lineHeight: 1.5 }}>
              {log.snippet}
            </p>
          </div>
        ))}
      </div>

      {/* 对话质量评估 */}
      {quality?.stats?.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px" }}>🎯 对话质量（近30天抽样）</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 14px" }}>后台自动抽样评估，用户无感</p>
          {quality.stats.map((q, i) => (
            <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < quality.stats.length - 1 ? "1px solid var(--line)" : "none" }}>
              <p style={{ fontSize: 13.5, fontWeight: 600, margin: "0 0 6px" }}>{q.role_kind === "companion" ? "星伴" : "代码星"} <span style={{ fontSize: 11.5, color: "var(--ink-muted)", fontWeight: 400 }}>（{q.n}次抽样）</span></p>
              <div style={{ display: "flex", gap: 18, fontSize: 12.5, color: "var(--ink-soft)" }}>
                <span>深度/共情 <b style={{ color: q.avg_depth >= 3.5 ? "var(--teal-deep)" : "var(--gold)" }}>{q.avg_depth || "-"}</b>/5</span>
                <span>有用度 <b style={{ color: q.avg_help >= 3.5 ? "var(--teal-deep)" : "var(--gold)" }}>{q.avg_help || "-"}</b>/5</span>
                {Number(q.safety_issues) > 0 && <span style={{ color: "var(--coral-deep)" }}>⚠️ 安全问题 {q.safety_issues} 次</span>}
              </div>
            </div>
          ))}
          {quality.recentIssues?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", margin: "0 0 6px" }}>发现的问题：</p>
              {quality.recentIssues.slice(0, 5).map((iss, i) => (
                <p key={i} style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 4px", lineHeight: 1.5 }}>
                  · [{iss.role_kind === "companion" ? "星伴" : "代码星"}] {iss.issue}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 功能使用热力 */}
      {usage?.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px" }}>📊 功能使用（近30天）</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px" }}>哪些功能真的被用起来了</p>
          {(() => {
            const max = Math.max(...usage.map(u => Number(u.count)), 1);
            const LABELS = { chat: "星伴聊天", code: "代码星", checkin: "心情打卡", breathing: "呼吸练习", scenario: "小剧场" };
            return usage.map((u, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
                  <span style={{ color: "var(--ink)" }}>{LABELS[u.feature] || u.feature}</span>
                  <span style={{ color: "var(--ink-soft)" }}>{u.count} 次 · {u.users} 人</span>
                </div>
                <div style={{ height: 6, background: "var(--purple-light)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${(Number(u.count) / max) * 100}%`, height: "100%", background: "var(--purple)", borderRadius: 3 }} />
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* 留存曲线 */}
      {retention?.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px" }}>📈 留存（按注册日分组）</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: "0 0 12px" }}>注册后有多少人回来打卡</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--ink-soft)" }}>
                  <th style={thStyle}>注册日</th>
                  <th style={thStyle}>人数</th>
                  <th style={thStyle}>次日</th>
                  <th style={thStyle}>7日</th>
                  <th style={thStyle}>30日</th>
                </tr>
              </thead>
              <tbody>
                {retention.map((r, i) => {
                  const size = Number(r.cohort_size) || 1;
                  const pct = (n) => Math.round((Number(n) / size) * 100);
                  return (
                    <tr key={i}>
                      <td style={tdStyle}>{new Date(r.signup_date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}</td>
                      <td style={tdStyle}>{r.cohort_size}</td>
                      <td style={tdStyle}>{pct(r.day1)}%</td>
                      <td style={tdStyle}>{pct(r.week1)}%</td>
                      <td style={tdStyle}>{pct(r.month1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 反馈统计 */}
      {stats?.feedback?.length > 0 && (
        <div className="card" style={{ marginBottom: 16, padding: "18px 20px" }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 12px" }}>用户反馈</p>
          {stats.feedback.map((f, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "6px 0", color: "var(--ink-soft)" }}>
              <span>{f.context === "chat" ? "星伴聊天" : "小剧场"} · {f.rating === 1 ? "👍 有帮助" : "👎 没帮助"}</span>
              <span style={{ fontWeight: 600, color: "var(--ink)" }}>{f.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* 注册趋势 */}
      {signupTrend?.length > 0 && (
        <div className="card" style={{ padding: "18px 20px" }}>
          <p style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 12px" }}>近30天注册</p>
          {signupTrend.slice(0, 10).map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0", color: "var(--ink-soft)" }}>
              <span>{new Date(s.date).toLocaleDateString("zh-CN")}</span>
              <span style={{ fontWeight: 500, color: "var(--ink)" }}>+{s.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
