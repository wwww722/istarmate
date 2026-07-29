// lib/memoryCategories.js
// 记忆卡片的 6 个固定分类，前后端共用。
// 每类带 emoji、中文标签、卡片配色（许安和的心事类偏米白粉，余生的作品目标类偏科技蓝）

export const MEMORY_CATEGORIES = {
  heart: {
    emoji: "💭", label: "心事",
    desc: "你放在心里的感受和想法",
    bg: "linear-gradient(135deg, #fffaf7, #fff0f3)",
    border: "rgba(224,150,170,0.35)",
    accent: "#c46b82",
  },
  milestone: {
    emoji: "🏆", label: "里程碑",
    desc: "你走过的重要节点",
    bg: "linear-gradient(135deg, #fffef7, #fff8e8)",
    border: "rgba(224,192,104,0.4)",
    accent: "#b5901f",
  },
  people: {
    emoji: "👥", label: "人际",
    desc: "对你重要的人",
    bg: "linear-gradient(135deg, #f9f7ff, #f3f0ff)",
    border: "rgba(124,111,224,0.3)",
    accent: "#7c6fe0",
  },
  goal: {
    emoji: "🎯", label: "目标",
    desc: "你想做到的事",
    bg: "linear-gradient(135deg, #f0fbff, #e8f6ff)",
    border: "rgba(63,140,190,0.35)",
    accent: "#2f7cae",
  },
  work: {
    emoji: "💻", label: "作品",
    desc: "你亲手做出来的东西",
    bg: "linear-gradient(135deg, #f0fffb, #e6fff7)",
    border: "rgba(63,167,150,0.4)",
    accent: "#0a9a80",
  },
  followup: {
    emoji: "😔", label: "下次问问",
    desc: "许安和/余生下次想主动问问你的事",
    bg: "linear-gradient(135deg, #f7f9fc, #eef2f8)",
    border: "rgba(120,140,170,0.35)",
    accent: "#5a6b85",
  },
};

// 兼容旧分类 → 新6类的映射（老数据不丢）
export const LEGACY_MAP = {
  person: "people",
  event: "milestone",
  concern: "heart",
  preference: "heart",
  goal: "goal",
};

// 把任意 category 归一化到新6类
export function normalizeCategory(cat) {
  if (MEMORY_CATEGORIES[cat]) return cat;
  if (LEGACY_MAP[cat]) return LEGACY_MAP[cat];
  return "heart"; // 兜底
}

export const CATEGORY_ORDER = ["heart", "people", "goal", "work", "milestone", "followup"];
