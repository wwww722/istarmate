import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

const EXAMPLES = [
  { emoji: "🎵", title: "音乐推荐页", desc: "一个展示自己最爱歌单的个人页面，有封面、歌词、播放链接。", tag: "个人主页" },
  { emoji: "🗳️", title: "班级投票器", desc: "让同学投票选班级活动，实时显示票数，简单好用。", tag: "工具" },
  { emoji: "🎮", title: "猜数字游戏", desc: "经典猜数字小游戏，有倒计时和排行榜，纯网页版。", tag: "游戏" },
  { emoji: "📸", title: "摄影作品集", desc: "展示自己拍的照片，有分类、灯箱效果，像专业摄影网站。", tag: "作品集" },
  { emoji: "📝", title: "读书笔记本", desc: "记录读过的书和想法，支持搜索，数据存在本地。", tag: "工具" },
  { emoji: "🌍", title: "旅行地图", desc: "在地图上标记去过/想去的地方，加上照片和文字记录。", tag: "个人主页" },
];

export default function AiCourseProjects() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated") return null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/ai-course"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>示例项目</h2>
      </div>

      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 20 }}>
        这些都是用AI做出来的真实网站示例，你也可以做出类似的，或者完全不一样的。
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {EXAMPLES.map((e, i) => (
          <div key={i} className="card" style={{ padding: "16px 14px", cursor: "default" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{e.emoji}</div>
            <span className="tag" style={{ fontSize: 11, marginBottom: 8, display: "inline-block" }}>{e.tag}</span>
            <p style={{ fontWeight: 500, fontSize: 14, margin: "6px 0 4px" }}>{e.title}</p>
            <p style={{ color: "var(--ink-soft)", fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>{e.desc}</p>
          </div>
        ))}
      </div>

      <button className="btn primary" onClick={() => router.push("/ai-course/chat")}>
        我也想做一个 →
      </button>
    </div>
  );
}
