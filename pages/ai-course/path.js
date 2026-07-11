import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

const STAGES = [
  {
    num: 1, emoji: "📄", title: "第一课：做出一个能打开的网页",
    goal: "学会用HTML搭出网页的骨架，让浏览器能显示你写的内容。",
    task: "做一个自我介绍页面：写上你的名字、爱好、一句喜欢的话。",
    color: "#7C6FE0",
  },
  {
    num: 2, emoji: "🎨", title: "第二课：让网页变好看",
    goal: "学会用CSS给网页加颜色、字体、布局，让它从朴素变精致。",
    task: "给你的自我介绍页加上背景色、好看的字体和居中的布局。",
    color: "#EF9F27",
  },
  {
    num: 3, emoji: "⚡", title: "第三课：加入交互",
    goal: "学会用JavaScript让网页'活'起来——按钮、点击、变化。",
    task: "加一个按钮，点击后显示一句隐藏的话，或者切换主题颜色。",
    color: "#3FA796",
  },
  {
    num: 4, emoji: "🚀", title: "第四课：发布给全世界",
    goal: "学会把做好的网站生成公开链接，分享给任何人。",
    task: "把你的作品保存，生成分享链接，发给一个朋友看看。",
    color: "#D85A30",
  },
];

export default function LearningPath() {
  const router = useRouter();
  const { status } = useSession();
  const [progress, setProgress] = useState({ stage: 1, completed_stages: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    try {
      const r = await fetch("/api/course-progress");
      const data = await r.json();
      if (data.progress) setProgress(data.progress);
    } catch {}
    setLoading(false);
  }

  function startStage(stage) {
    router.push(`/ai-course/chat?stage=${stage.num}`);
  }

  if (status !== "authenticated" || loading) return null;

  const completed = (progress.completed_stages || "").split(",").filter(Boolean).map(Number);
  const currentStage = progress.stage || 1;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>学习地图</h2>
      </div>

      {/* 进度总览 */}
      <div className="card" style={{ marginBottom: 20, padding: "18px 20px", textAlign: "center" }}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 8px" }}>你的进度</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10 }}>
          {STAGES.map(s => (
            <div key={s.num} style={{
              width: 40, height: 6, borderRadius: 3,
              background: completed.includes(s.num) ? s.color : "rgba(124,111,224,0.15)",
            }} />
          ))}
        </div>
        <p style={{ fontSize: 14.5, fontWeight: 600, margin: 0 }}>
          已完成 {completed.length} / {STAGES.length} 课
        </p>
      </div>

      {/* 阶段列表 */}
      {STAGES.map(stage => {
        const isDone = completed.includes(stage.num);
        const isLocked = stage.num > currentStage;
        const isCurrent = stage.num === currentStage && !isDone;
        return (
          <div key={stage.num} className="card" style={{
            marginBottom: 14, padding: "18px 20px",
            opacity: isLocked ? 0.55 : 1,
            border: isCurrent ? `1.5px solid ${stage.color}` : "1px solid rgba(255,255,255,0.6)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 46, height: 46, borderRadius: 13, flexShrink: 0,
                background: isDone ? stage.color : `${stage.color}22`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
              }}>
                {isDone ? "✓" : isLocked ? "🔒" : stage.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 2px" }}>{stage.title}</p>
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: 0 }}>
                  {isDone ? "已完成 ✨" : isLocked ? "完成上一课后解锁" : "进行中"}
                </p>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--ink)", margin: "0 0 6px", lineHeight: 1.6 }}>
              🎯 {stage.goal}
            </p>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 12px", lineHeight: 1.6, background: "var(--bg)", padding: "8px 12px", borderRadius: 10 }}>
              ✏️ 小任务：{stage.task}
            </p>
            {!isLocked && (
              <button
                onClick={() => startStage(stage)}
                style={{
                  width: "100%", padding: "11px", borderRadius: 12, border: "none",
                  background: isDone ? "transparent" : stage.color,
                  color: isDone ? stage.color : "#fff",
                  border: isDone ? `1.5px solid ${stage.color}` : "none",
                  cursor: "pointer", fontSize: 14, fontWeight: 500,
                }}>
                {isDone ? "再做一遍" : "开始这一课 →"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
