// components/LearningPathWizard.js
// 对标：Khanmigo 学习路径 + Duolingo Max 路线图
// - 家长/孩子选择目标（比如「我想 3 个月做出第一个属于自己的 App」/「这学期数学从 C 到 A」/「敢在课堂上发言」）
// - 明川老师拆解为每周里程碑，每完成一个解锁 XP + 星光币
import { useState } from "react";

const PRESET_GOALS = [
  { icon: "📱", title: "3 个月做出属于我的第一个 App", weeks: 12, track: "code" },
  { icon: "📚", title: "这学期把数学从 C 提到 A", weeks: 18, track: "academy" },
  { icon: "🎤", title: "敢在课堂上主动发言 3 次", weeks: 4, track: "mental" },
  { icon: "🏃", title: "每周跑 3 次步坚持 1 个月", weeks: 4, track: "habit" },
  { icon: "💗", title: "和妈妈不再一说话就吵架", weeks: 8, track: "family" },
];

export default function LearningPathWizard({ onConfirm }) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(null);
  const [milestones, setMilestones] = useState([]);

  function pickGoal(g) {
    setGoal(g);
    const m = buildMilestones(g);
    setMilestones(m);
    setStep(1);
  }

  function confirm() {
    onConfirm && onConfirm({ goal, milestones });
    setStep(2);
  }

  if (step === 2) {
    return (
      <div style={{ padding: 18, borderRadius: 16, background: "linear-gradient(135deg,#f0fff4,#e6fffa)", border: "1.5px solid rgba(60,180,120,0.3)" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1f7a4c" }}>🎉 路径已启动！已同步 +120 XP 到你的账户～</div>
        <div style={{ marginTop: 8, fontSize: 13, color: "#222" }}>
          余生会每周提醒你本周的里程碑，完成后自动解锁奖励！
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16, borderRadius: 16, background: "linear-gradient(135deg,#faf7ff,#fff4fa)", border: "1.5px solid rgba(124,111,224,0.25)" }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: step === 0 ? 10 : 8, color: "#4b42b4" }}>
        🪜 {step === 0 ? "选一个你最想实现的目标：" : `好！${goal.title}，余生帮你拆解成每周里程碑：`}
      </div>
      {step === 0 && (
        <div style={{ display: "grid", gap: 8 }}>
          {PRESET_GOALS.map((g, i) => (
            <button key={i} onClick={() => pickGoal(g)} style={{
              textAlign: "left", padding: "10px 14px", borderRadius: 12,
              background: "#fff", border: "1.5px solid rgba(124,111,224,0.2)",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
            }}>
              <span style={{ fontSize: 22 }}>{g.icon}</span>
              <div>
                <div style={{ fontWeight: 600, color: "#222" }}>{g.title}</div>
                <div style={{ fontSize: 11.5, color: "#888" }}>预计 {g.weeks} 周 · 完成可拿 {g.weeks * 20} XP + {g.weeks * 5} ✨</div>
              </div>
            </button>
          ))}
        </div>
      )}
      {step === 1 && (
        <div>
          <ol style={{ paddingLeft: 20, margin: "4px 0 12px" }}>
            {milestones.map((m, i) => (
              <li key={i} style={{ padding: "4px 0", fontSize: 13.5, lineHeight: 1.6 }}>
                <b>第 {m.week} 周</b> · {m.title}
                <div style={{ fontSize: 11.5, color: "#888" }}>{m.detail}　奖励：+{m.xp} XP / +{m.sd} ✨</div>
              </li>
            ))}
          </ol>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setStep(0)} style={{
              padding: "7px 14px", borderRadius: 999, border: "1px solid #ddd", background: "#fff", cursor: "pointer",
            }}>← 换个目标</button>
            <button onClick={confirm} style={{
              padding: "7px 18px", borderRadius: 999, border: "none",
              background: "linear-gradient(135deg,#7c6fe0,#ff6fb3)", color: "#fff",
              fontWeight: 700, cursor: "pointer",
            }}>就这个了！🚀 启动路径</button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildMilestones(g) {
  const weeks = g.weeks;
  const perXp = 20, perSd = 5;
  const common = [
    { week: 1, title: "第一步很小但最重要：把目标写下来", detail: "在日记里写下「我为什么想做到这件事」——越具体越好", xp: perXp, sd: perSd },
  ];
  if (g.track === "code") {
    common.push(
      { week: 2, title: "搞懂代码三兄弟：HTML/CSS/JS 分别是干嘛的", detail: "完成一个 Hello World 网页，加上自己的名字和头像", xp: perXp, sd: perSd*2 },
      { week: 4, title: "会用变量和循环了", detail: "做一个每天抽打卡语的随机鼓励机", xp: perXp, sd: perSd*2 },
      { week: 8, title: "把 App 原型跑起来", detail: "不管多简陋，要有 3 个页面，能点来点去", xp: perXp*2, sd: perSd*4 },
      { week: 12, title: "App 上线到 Showcase，让所有人看见", detail: "截图 + 一段介绍，点发布，邀请 1 个好朋友试用", xp: perXp*3, sd: perSd*6 },
    );
  } else if (g.track === "family") {
    common.push(
      { week: 2, title: "观察一次：妈妈/爸爸发火之前 TA 在干嘛", detail: "不评判，只是像侦探一样记在本子上", xp: perXp, sd: perSd },
      { week: 4, title: "做一件 30 秒的小事", detail: "比如回家时先对妈妈/爸爸笑一下，或主动说一句「我回来了」", xp: perXp, sd: perSd*2 },
      { week: 8, title: "心平气和聊一次你们都烦的话题", detail: "提前对自己说一句：TA 说的第一句话我不反驳", xp: perXp*2, sd: perSd*4 },
    );
  } else {
    // 默认
    for (let w = 2; w <= weeks; w++) {
      common.push({
        week: w,
        title: `第 ${w} 周：把上周的好习惯再坚持 7 天`,
        detail: `坚持不是完美，是 7 天里有 4 天做到就够`,
        xp: perXp, sd: perSd,
      });
    }
  }
  return common.slice(0, Math.min(common.length, Math.max(3, Math.ceil(weeks / 2))));
}
