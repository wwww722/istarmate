import { useState } from "react";

export default function CbtMicroCard({ initial, onClose }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  if (!initial) return null;
  const steps = initial.steps;
  const step = steps[stepIdx];

  return (
    <div style={{
      marginTop: 6, padding: 14, borderRadius: 16,
      background: "linear-gradient(135deg, #fff5ff, #f0efff)",
      border: "1px solid rgba(184,174,255,0.45)", color: "#22212c",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#4b42b4" }}>
          {initial.icon || "🧘"} {initial.title} · 步骤 {stepIdx + 1}/{steps.length}
        </div>
        {onClose && <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 16 }}>×</button>}
      </div>
      <div style={{ fontSize: 14.5, lineHeight: 1.7, marginBottom: 10, whiteSpace: "pre-wrap" }}>{step.q}</div>
      {step.choices ? (
        <div style={{ display: "grid", gap: 8 }}>
          {step.choices.map((c, i) => (
            <button key={i} onClick={() => {
              setAnswers({ ...answers, [stepIdx]: c.text });
              if (stepIdx < steps.length - 1) setStepIdx(stepIdx + 1);
            }} style={{
              textAlign: "left", padding: "10px 14px", borderRadius: 12,
              background: "#fff", border: "1.5px solid rgba(124,111,224,0.2)",
              color: "#22212c", fontSize: 13.5, cursor: "pointer",
            }}>{c.text}</button>
          ))}
        </div>
      ) : (
        <textarea value={answers[stepIdx] || ""} onChange={e => setAnswers({ ...answers, [stepIdx]: e.target.value })}
          rows={3}
          style={{ width: "100%", borderRadius: 12, border: "1.5px solid rgba(124,111,224,0.2)", padding: 10, fontSize: 14, fontFamily: "inherit" }}
          placeholder="写点什么也行，不用很完整～"
        />
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, gap: 8 }}>
        <button disabled={stepIdx === 0} onClick={() => setStepIdx(Math.max(0, stepIdx - 1))}
          style={{ padding: "7px 14px", borderRadius: 999, border: "1px solid #ddd", background: "#fff", cursor: stepIdx === 0 ? "not-allowed" : "pointer", opacity: stepIdx === 0 ? 0.4 : 1 }}>
          上一步
        </button>
        {stepIdx < steps.length - 1 ? (
          <button onClick={() => setStepIdx(stepIdx + 1)} style={{
            padding: "7px 16px", borderRadius: 999, border: "none", background: "#7c6fe0",
            color: "#fff", cursor: "pointer", fontWeight: 600,
          }}>下一步 →</button>
        ) : (
          <button onClick={() => {
            fetch("/api/gamification/sync", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "award_xp", payload: { delta: 15, reason: "cbt_completed", detail: initial.title } }) });
            window.dispatchEvent(new CustomEvent("istarmate-award", { detail: { justAwarded: { xp: 15, stardust: 5 } } }));
            setTimeout(onClose || (() => {}), 50);
            alert("太棒了！你完成了一次 " + initial.title + "，+15 XP / +5 ✨ 已入账，今天你又更了解自己一点点了 🪷");
          }} style={{
            padding: "7px 18px", borderRadius: 999, border: "none",
            background: "linear-gradient(135deg,#ff6fb3,#7c6fe0)", color: "#fff",
            cursor: "pointer", fontWeight: 700,
          }}>完成！领取奖励 ✨</button>
        )}
      </div>
    </div>
  );
}

export const CBT_PRESETS = {
  exam_anxiety: {
    icon: "📝", title: "考前焦虑放松",
    steps: [
      { q: "现在的紧张感，0 分完全不紧张，10 分要崩溃那种，打几分？🤔", choices: [{text:"1-3 分：还好"},{text:"4-6 分：有点慌"},{text:"7-10 分：快喘不过气"}] },
      { q: "脑子里第一个冒出来、最让你慌的念头是什么？（比如 我肯定考砸）——写下来，它就没那么可怕了。" },
      { q: "来当侦探 🕵️：支持这个念头的证据有哪些？反对它的证据又有哪些？（各写一条也好）" },
      { q: "就算真考砸一次，一个月后、一年后，你还会像今天一样在意它吗？\n一起深呼吸：吸 4 秒，呼 6 秒，3 次。" },
    ],
  },
  parent_conflict: {
    icon: "🏡", title: "和爸妈吵架了 · 家族视角",
    steps: [
      { q: "先给愤怒/委屈打分（0-10），它现在在你身体的哪个部位？胸口闷 / 喉咙堵？", choices: [{text:"胸口"},{text:"喉咙/胃部"},{text:"头/肩"},{text:"说不清楚"}] },
      { q: "你有没有觉得，爸妈今天发火的语气、用词，跟他们描述自己小时候被对待的样子……有点像？不是要原谅，是先看见这个剧本。" },
      { q: "如果今天有个完全中立的观察者在旁边，TA 会怎么描述刚才的事？写 2 句。" },
      { q: "今晚睡觉前，做一个最小的行动：不用道歉不用求和，把自己房门轻轻关好看 5 分钟星星——你先稳住，家里的能量就会跟着变。" },
    ],
  },
  general_crash: {
    icon: "🪂", title: "心情崩溃着陆术",
    steps: [
      { q: "先别想任何事，跟我一起做 3 次：吸 4 秒 → 憋 2 秒 → 呼 6 秒。做完再点下一步。", choices: [{text:"做完了，舒服一点了"},{text:"还是难受，继续"}] },
      { q: "5-4-3-2-1 着陆法：说你看到的 5 样东西、摸到的 4 样东西、听到的 3 种声音、闻到的 2 种气味、尝到的 1 种味道。（打字也有用！）" },
      { q: "现在再给刚才那股难受打个分（0-10），比一开始低了几分？哪怕只降 1 分——那也是你做到的。" },
      { q: "今晚你可以对自己说一句：'____，你今天已经非常努力了。'（把空格填上你的小名，然后说出来）" },
    ],
  },
};
