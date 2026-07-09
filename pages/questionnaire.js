import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const DOMAIN_META = {
  mood: { name: "情绪状态", low: "整体情绪比较稳定。", mid: "最近情绪有点低落或波动。", high: "情绪持续低落、提不起兴趣的情况比较明显。" },
  stress: { name: "压力与焦虑", low: "压力大致在可应付范围内。", mid: "最近压力或紧张感偏高。", high: "持续的紧张、担心或心慌感比较强烈。" },
  energy: { name: "睡眠与精力", low: "睡眠和精力整体不错。", mid: "睡眠或精力有些下降。", high: "睡眠和精力明显受影响。" },
  social: { name: "人际与连接", low: "和身边人的连接感不错。", mid: "最近有点想远离别人。", high: "明显的孤立感或回避社交。" },
};

const QUESTIONS = [
  // 情绪状态
  { d: "mood", t: "最近两周，我对平时喜欢的事（比如游戏、音乐、追剧）还是会有兴趣。", reverse: true },
  { d: "mood", t: "我会无缘无故地感到心情很低、提不起劲，说不清是为什么。" },
  { d: "mood", t: "我比平时更容易烦躁，一件小事就能让我很不耐烦或发脾气。" },
  { d: "mood", t: "我觉得最近的自己还算有状态，不是每天都在"撑着过"。", reverse: true },
  // 压力与焦虑
  { d: "stress", t: "我的脑子里总在反复转一些担心的事，很难停下来。" },
  { d: "stress", t: "当遇到让我紧张的事时，我通常能找到一些方法让自己平静下来。", reverse: true },
  { d: "stress", t: "我会出现心跳加速、手心出汗、胸口发紧等身体反应，但不是因为运动。" },
  // 睡眠与精力
  { d: "energy", t: "我最近睡觉有问题——要么很难睡着，要么睡着了也容易醒。" },
  { d: "energy", t: "白天即使休息了，我也经常觉得身体很沉、没精神做事。" },
  { d: "energy", t: "我的饮食或作息节奏最近明显变了（比如不想吃饭、或者睡很多但还是累）。" },
  // 人际与连接
  { d: "social", t: "我觉得身边至少有一个人——朋友或家人——可以让我说说真实的想法和感受。", reverse: true },
  { d: "social", t: "最近我不太想和别人互动，更想一个人待着，包括之前喜欢的聚会或聊天。" },
  { d: "social", t: "和别人在一起时，我常常觉得自己格格不入，或者觉得别人不会真正理解我。" },
  { d: "social", t: "最近有发生过让我和朋友或家人关系变紧张、产生矛盾的事。" },
  // 安全题
  { d: "mood", t: "我有过觉得活着没什么意思、或者想伤害自己的念头。", critical: true },
];

const OPTIONS = [
  { label: "几乎没有", v: 0 },
  { label: "偶尔有一点", v: 1 },
  { label: "间歇性发生", v: 2 },
  { label: "经常这样", v: 3 },
  { label: "几乎每天都是", v: 4 },
];

export default function Questionnaire() {
  const router = useRouter();
  const { status } = useSession();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(new Array(QUESTIONS.length).fill(null));
  const [showCrisis, setShowCrisis] = useState(false);
  const [crisisTriggered, setCrisisTriggered] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  const q = QUESTIONS[current];

  function select(v) {
    const next = [...answers];
    next[current] = v;
    setAnswers(next);
  }

  function goNext() {
    if (q.critical && answers[current] >= 1 && !crisisTriggered) {
      setCrisisTriggered(true);
      setShowCrisis(true);
      return;
    }
    if (current < QUESTIONS.length - 1) setCurrent(current + 1);
    else finish();
  }

  function continueFromCrisis() {
    setShowCrisis(false);
    if (current < QUESTIONS.length - 1) setCurrent(current + 1);
    else finish();
  }

  async function finish() {
    setSubmitting(true);
    const sums = {}, counts = {};
    Object.keys(DOMAIN_META).forEach((k) => { sums[k] = 0; counts[k] = 0; });
    QUESTIONS.forEach((qq, i) => {
      let v = answers[i] ?? 0;
      if (qq.reverse) v = 4 - v;
      sums[qq.d] += v;
      counts[qq.d] += 1;
    });
    const domains = Object.keys(DOMAIN_META).map((key) => {
      const pct = Math.round((sums[key] / (counts[key] * 4)) * 100);
      const level = pct <= 33 ? 0 : pct <= 66 ? 1 : 2;
      const desc = level === 0 ? DOMAIN_META[key].low : level === 1 ? DOMAIN_META[key].mid : DOMAIN_META[key].high;
      return { key, name: DOMAIN_META[key].name, level, pct, desc };
    });

    await fetch("/api/questionnaire", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domains, crisisTriggered }),
    });

    setSubmitting(false);
    router.push("/questionnaire-result");
  }

  if (status !== "authenticated") return null;

  if (showCrisis) {
    return (
      <div className="wrap">
        <div className="card" style={{ background: "#FDECEC", borderColor: "#E89B96" }}>
          <h3 style={{ color: "#7A2A24", marginBottom: 8 }}>先别划走，这条很重要</h3>
          <p style={{ color: "#7A2A24", fontSize: 14.5 }}>
            你刚才提到自己有过伤害自己的想法。这种感觉很沉重，但你不需要一个人扛着它。
          </p>
          <p style={{ color: "#7A2A24", fontSize: 14.5 }}>
            能不能现在就联系一个你信任的人，或者拨打热线：<strong>400-161-9995</strong>
          </p>
        </div>
        <button className="btn primary" style={{ marginTop: 16 }} onClick={continueFromCrisis}>
          我先看看后面的内容 →
        </button>
      </div>
    );
  }

  return (
    <div className="wrap">
      <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 10 }}>
        第 {current + 1} / {QUESTIONS.length} 题
      </p>
      <div className="card" style={{ minHeight: 200 }}>
        <p style={{ fontSize: 17, fontWeight: 500, marginBottom: 20 }}>{q.t}</p>
        {OPTIONS.map((o) => (
          <div
            key={o.v}
            onClick={() => select(o.v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 14px",
              marginBottom: 8,
              borderRadius: 12,
              border: `1.5px solid ${answers[current] === o.v ? "var(--purple)" : "var(--line)"}`,
              background: answers[current] === o.v ? "var(--purple-light)" : "#fff",
              cursor: "pointer",
              transition: "all .15s",
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
              border: `2px solid ${answers[current] === o.v ? "var(--purple)" : "var(--line)"}`,
              background: answers[current] === o.v ? "var(--purple)" : "transparent",
            }} />
            <span style={{ fontSize: 14.5, color: answers[current] === o.v ? "var(--purple-deep)" : "var(--ink)" }}>
              {o.label}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button className="btn" style={{ width: "auto", padding: "9px 18px" }} disabled={current === 0} onClick={() => setCurrent(current - 1)}>
          上一题
        </button>
        <button
          className="btn primary"
          style={{ width: "auto", padding: "9px 18px" }}
          disabled={answers[current] === null || submitting}
          onClick={goNext}
        >
          {current === QUESTIONS.length - 1 ? "完成并查看每日剧场" : "下一题"}
        </button>
      </div>
    </div>
  );
}
