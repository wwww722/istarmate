// lib/achievements.js
// 所有成就的定义。achievement_id 是唯一标识，存在数据库里。

export const ACHIEVEMENTS = [
  {
    id: "first_login",
    emoji: "🌟",
    title: "踏出第一步",
    desc: "完成注册并登录 IStarMate",
  },
  {
    id: "first_questionnaire",
    emoji: "📊",
    title: "认识自己",
    desc: "完成第一次情绪自评",
  },
  {
    id: "first_chat",
    emoji: "💬",
    title: "开口说话",
    desc: "第一次和星伴聊天",
  },
  {
    id: "first_scenario",
    emoji: "🎭",
    title: "入戏了",
    desc: "完成第一次小剧场",
  },
  {
    id: "first_ai_course",
    emoji: "💻",
    title: "代码初体验",
    desc: "第一次进入 AI 素养课程",
  },
  {
    id: "streak_3",
    emoji: "🔥",
    title: "三天打鱼",
    desc: "连续打卡3天",
  },
  {
    id: "streak_7",
    emoji: "⚡",
    title: "一周达人",
    desc: "连续打卡7天",
  },
  {
    id: "streak_14",
    emoji: "🏆",
    title: "两周坚持",
    desc: "连续打卡14天",
  },
  {
    id: "scenario_5",
    emoji: "🎬",
    title: "剧场常客",
    desc: "完成5次小剧场",
  },
  {
    id: "scenario_10",
    emoji: "🎪",
    title: "沉浸大师",
    desc: "完成10次小剧场",
  },
  {
    id: "invite_friend",
    emoji: "🤝",
    title: "带朋友来了",
    desc: "邀请一位朋友成功注册 IStarMate",
  },
  {
    id: "joined_via_invite",
    emoji: "🎁",
    title: "受邀而来",
    desc: "通过朋友的邀请码加入 IStarMate",
  },
  {
    id: "mood_all",
    emoji: "🌈",
    title: "情绪全家桶",
    desc: "记录过所有5种心情",
  },
,
  {
    id: "invite_friend",
    emoji: "🌟",
    title: "领路人",
    desc: "成功邀请一位朋友加入IStarMate",
  },
  {
    id: "invited_friend",
    emoji: "🤝",
    title: "被选中的人",
    desc: "通过朋友的邀请加入IStarMate",
  },
  {
    id: "showcase",
    emoji: "🏛️",
    title: "公开展示",
    desc: "把你做的网站分享到作品展示墙",
  },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}
