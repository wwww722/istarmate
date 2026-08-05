// lib/festivalEasterEggs.js
// 生日 + 节日彩蛋。纯前端检测，一次性触发（localStorage 记录当天已触发）。

// 固定节日（月-日）
const FESTIVALS = {
  "1-1":  { emoji: "🎊", theme: "new_year", msg: "新的一年，我还在 🤍" },
  "6-1":  { emoji: "🎈", theme: "children", msg: "不管几岁，快乐万岁 🎈" },
  "9-1":  { emoji: "📚", theme: "school", msg: "新学期冲！新的开始，慢慢来也没关系 💙" },
};

function todayKey(date = new Date()) {
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

// 检测今天是否有彩蛋。birthday 格式 "M-D" 或 null
// 返回 { type, emoji, msg, once_key } | null
export function detectEasterEgg(birthday, date = new Date()) {
  const key = todayKey(date);

  // 生日优先
  if (birthday && birthday === key) {
    return { type: "birthday", emoji: "🎂", msg: "生日快乐 🎂🤍 今天你是全世界最重要的人", once_key: `egg_birthday_${date.getFullYear()}` };
  }
  // 节日
  if (FESTIVALS[key]) {
    const f = FESTIVALS[key];
    return { type: "festival", emoji: f.emoji, theme: f.theme, msg: f.msg, once_key: `egg_${f.theme}_${date.getFullYear()}` };
  }
  return null;
}

// 是否今天已触发过（避免重复打扰）
export function alreadyTriggered(once_key) {
  try { return localStorage.getItem(once_key) === "1"; } catch { return false; }
}
export function markTriggered(once_key) {
  try { localStorage.setItem(once_key, "1"); } catch {}
}
