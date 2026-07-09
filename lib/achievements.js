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
    id: "mood_all",
    emoji: "🌈",
    title: "情绪全家桶",
    desc: "记录过所有5种心情",
  },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find(a => a.id === id);
}
