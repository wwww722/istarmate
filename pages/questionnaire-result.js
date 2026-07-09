import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import ShareCard from "../components/ShareCard";

const DOMAIN_META = {
  mood:   { name: "情绪状态", icon: "🌤️", low: "阳光稳定", mid: "偶有阴云",  high: "需要关心" },
  stress: { name: "压力指数", icon: "⚡",  low: "从容应对", mid: "压力偏高",  high: "需要释放" },
  energy: { name: "活力能量", icon: "🔋",  low: "满格在线", mid: "电量偏低",  high: "需要充电" },
  social: { name: "人际连接", icon: "🤝",  low: "连接顺畅", mid: "稍显疏离",  high: "需要靠近" },
};

const STATE_PROFILES = [
  { condition: (d) => d.every(x => x.pct <= 40),                                  title: "稳稳的幸福者", emoji: "☀️", desc: "你现在整体状态相当平稳，情绪、精力、压力都在健康范围内。" },
  { condition: (d) => d.find(x => x.key === "stress")?.pct > 60,                  title: "奔跑中的追风者", emoji: "🏃", desc: "你最近承受着不小的压力，但还在坚持前行。记得在奔跑的间隙，给自己一点喘息的空间。" },
  { condition: (d) => d.find(x => x.key === "mood")?.pct > 60,                    title: "需要阳光的花", emoji: "🌱", desc: "情绪上有些低落，这很正常。找一个能说说话的人，或者今天就和星伴聊聊？" },
  { condition: (d) => d.find(x => x.key === "energy")?.pct > 60,                  title: "需要充电的旅行者", emoji: "🔌", desc: "身体在发出休息的信号，今晚早点睡，哪怕只是躺着发呆也好。" },
  { condition: (d) => d.find(x => x.key === "social")?.pct > 60,                  title: "安静的独行者", emoji: "🌙", desc: "最近想一个人待着，这也是一种自我保护。但如果孤独感开始变重，记得来找星伴。" },
  { condition: () => true,                                                          title: "复杂地带的探索者", emoji: "🗺️", desc: "你的状态有些复杂，先从最让你难受的那一块开始关注，一步步来。" },
];

function getProfile(domains) {
  return STATE_PROFILES.find(p => p.condition(domains)) || STATE_PROFILES[STATE_PROFILES.length - 1];
}

export default function QuestionnaireResult() {
  const router = useRouter();
  const { status } = useSession();
  const [domains, setDomains] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const [qRes, pRes] = await Promise.all([fetch("/api/questionnaire"), fetch("/api/profile")]);
    const qData = await qRes.json();
    const pData = await pRes.json();
    if (qData.questionnaire?.domains) setDomains(qData.questionnaire.domains);
    setUserProfile(pData.profile);
    setLoading(false);
  }

  useEffect(() => {
    if (domains.length) setProfile(getProfile(domains));
  }, [domains]);

  if (status !== "authenticated" || loading || !profile) return null;

  return (
    <div className="wrap">
      <div className="card" style={{ textAlign: "center", padding: "28px 22px", marginBottom: 20, background: "linear-gradient(135deg, #8B7FD9 0%, #A89AE8 100%)", border: "none" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>{profile.emoji}</div>
        <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 12.5, margin: "0 0 4px" }}>你现在的状态是</p>
        <h2 style={{ color: "#fff", fontSize: 22, margin: "0 0 12px" }}>{profile.title}</h2>
        <p style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>{profile.desc}</p>
        <button onClick={() => setShowShare(true)}
          style={{ marginTop: 18, padding: "9px 20px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.5)", background: "transparent", color: "#fff", cursor: "pointer", fontSize: 13.5 }}>
          📤 分享我的状态
        </button>
      </div>

      <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>四个维度详情</p>

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
              <span style={{ fontSize: 12, padding: "3px 10px", borderRadius: 999, background: tagBg, color: tagColor, fontWeight: 500 }}>{tagText}</span>
            </div>
            <div style={{ height: 8, borderRadius: 999, background: "#EFEBDD", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: color }} />
            </div>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "8px 0 0", lineHeight: 1.6 }}>{d.desc}</p>
          </div>
        );
      })}

      <div style={{ marginTop: 24 }}>
        <button className="btn primary" onClick={() => router.push("/dashboard")}>开始今天的陪伴 →</button>
        <p style={{ fontSize: 12, color: "var(--ink-soft)", textAlign: "center", marginTop: 14, lineHeight: 1.7 }}>
          这份评估仅作为状态参考，不是医学诊断。
        </p>
      </div>

      {showShare && (
        <ShareCard
          profile={userProfile}
          domains={domains}
          stateTitle={profile.title}
          stateEmoji={profile.emoji}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
