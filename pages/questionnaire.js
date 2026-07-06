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
  { d: "mood", t: "最近两周，我对原本喜欢的事情还是会感兴趣。", reverse: true },
  { d: "mood", t: "我经常觉得心情低落、闷闷的，说不上为什么。" },
  { d: "mood", t: "我会突然觉得很烦躁，容易因为小事发脾气。" },
  { d: "mood", t: "我觉得自己最近还挺有活力的。", reverse: true },
  { d: "stress", t: "我经常觉得脑子里一直在担心一些事，停不下来。" },
  { d: "stress", t: "遇到压力时，我大概知道怎么应付。", reverse: true },
  { d: "stress", t: "我会感到心跳加快、手心出汗，或者莫名紧张。" },
  { d: "energy", t: "我最近入睡困难，或者半夜容易醒。" },
  { d: "energy", t: "白天我常常觉得很累，没什么精神。" },
  { d: "energy", t: "我的食欲或睡眠节奏最近变化挺大的。" },
  { d: "social", t: "我觉得身边有朋友或家人，可以说说真实的感受。", reverse: true },
  { d: "social", t: "我开始不太想见人，更愿意一个人待着。" },
  { d: "social", t: "我觉得就算说出我的感受，别人也不会懂。" },
  { d: "mood", t: "我有过伤害自己，或者不想再坚持下去的想法。", critical: true },
  { d: "energy", t: "整体来说，我觉得自己最近的状态还可以维持日常生活。", reverse: true },
];

const OPTIONS = [
  { label: "几乎没有", v: 0 },
  { label: "偶尔有一点", v: 1 },
  { label: "经常这样", v: 2 },
  { label: "几乎每天都是", v: 3 },
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
      if (qq.reverse) v = 3 - v;
      sums[qq.d] += v;
      counts[qq.d] += 1;
    });
    const domains = Object.keys(DOMAIN_META).map((key) => {
      const pct = Math.round((sums[key] / (counts[key] * 3)) * 100);
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
            className="choice-card"
            style={{
              padding: "12px 14px",
              marginBottom: 8,
              borderColor: answers[current] === o.v ? "var(--coral)" : "var(--line)",
              background: answers[current] === o.v ? "#FFF6F4" : "#fff",
            }}
            onClick={() => select(o.v)}
          >
            {o.label}
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
