import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const DOMAIN_META = {
  mood:   { name: "情绪状态",   icon: "🌤️", low: "阳光稳定", mid: "偶有阴云", high: "需要关心" },
  stress: { name: "压力指数",   icon: "⚡", low: "从容应对", mid: "压力偏高", high: "需要释放" },
  energy: { name: "活力能量",   icon: "🔋", low: "满格在线", mid: "电量偏低", high: "需要充电" },
  social: { name: "人际连接",   icon: "🤝", low: "连接顺畅", mid: "稍显疏离", high: "需要靠近" },
};

const STATE_PROFILES = [
  { condition: (d) => d.every(x => x.pct <= 40), title: "稳稳的幸福者", emoji: "☀️", desc: "你现在整体状态相当平稳，情绪、精力、压力都在健康范围内。继续保持这份平衡，同时也可以留意细小的波动。" },
  { condition: (d) => d.find(x => x.key === "stress")?.pct > 60, title: "奔跑中的追风者", emoji: "🏃", desc: "你最近承受着不小的压力，但还在坚持前行。记得在奔跑的间隙，给自己一点喘息的空间。" },
  { condition: (d) => d.find(x => x.key === "mood")?.pct > 60, title: "需要阳光的花", emoji: "🌱", desc: "情绪上有些低落，这很正常，每个人都会有这样的时期。找一个能说说话的人，或者今天就和星伴聊聊？" },
  { condition: (d) => d.find(x => x.key === "energy")?.pct > 60, title: "需要充电的旅行者", emoji: "🔌", desc: "身体在发出休息的信号，睡眠和精力都在提醒你放慢脚步。今晚早点睡，哪怕只是躺着发呆也好。" },
  { condition: (d) => d.find(x => x.key === "social")?.pct > 60, title: "安静的独行者", emoji: "🌙", desc: "最近想一个人待着，这也是一种自我保护。但如果孤独感开始变重，记得随时可以来找星伴说说话。" },
  { condition: () => true, title: "复杂地带的探索者", emoji: "🗺️", desc: "你的状态有些复杂，不同维度呈现出不同的面貌。先从最让你难受的那一块开始关注，一步一步来。" },
];

function getProfile(domains) {
  return STATE_PROFILES.find(p => p.condition(domains)) || STATE_PROFILES[STATE_PROFILES.length - 1];
}

export default function QuestionnaireResult() {
  const router = useRouter();
  const { status } = useSession();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const r = await fetch("/api/questionnaire");
    const data = await r.json();
    if (data.questionnaire?.domains) {
      setDomains(data.questionnaire.domains);
    }
    setLoading(false);
  }

  if (status !== "authenticated" || loading) return null;

  const profile = getProfile(domains);

  return (
    <div className="wrap">
      {/* 总体状态卡片 */}
      <div className="card" style={{ textAlign: "center", padding: "28px 22px", marginBottom: 20, background: "linear-gradient(135deg, #8B7FD9 0%, #A89AE8 100%)", border: "none" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>{profile.emoji}</div>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12.5, margin: "0 0 4px", letterSpacing: ".05em" }}>你现在的状态是</p>
        <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 12px" }}>{profile.title}</h2>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{profile.desc}</p>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>四个维度详情</p>

      {/* 四个维度 */}
      {domains.map((d) => {
        const meta = DOMAIN_META[d.key];
        if (!meta) return null;
        const pct = d.pct || 0;
        const level = d.level || 0;
        const color = level === 0 ? "#1D9E75" : level === 1 ? "#EF9F27" : "#D85A30";
        const tagBg = level === 0 ? "#E1F5EE" : level === 1 ? "#FDF3E2" : "#FAE3DE";
        const tagColor = level === 0 ? "#1F6457" : level === 1 ? "#8A5A12" : "#B8402F";
        const tagText = level === 0 ? meta.low : level === 1 ? meta.mid : meta.high;

        return (
          <div key={d.key} className="card" style={{ marginBottom: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>{meta.icon}</span>
                <span style={{ fontWeight: 500, fontSize: 15 }}>{meta.name}</span>
              </div>
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: tagBg, color: tagColor, fontWeight: 500 }}>
                {tagText}
              </span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#EFEBDD", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: color, transition: "width 0.8s ease" }} />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.6 }}>{d.desc}</p>
          </div>
        );
      })}

      <div style={{ marginTop: 24 }}>
        <button className="btn primary" onClick={() => router.push("/dashboard")}>
          开始今天的陪伴 →
        </button>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center", marginTop: 14, lineHeight: 1.7 }}>
          这份评估基于你的自我报告，仅作为状态参考，不是医学诊断。<br />如果状态持续影响生活，建议和专业的人聊聊。
        </p>
      </div>
    </div>
  );
}
