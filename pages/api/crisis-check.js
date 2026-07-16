// pages/api/crisis-check.js
// 危机检测：分级 + 否定过滤 + 夸张过滤，尽量不漏报也不误报。
// 这是人命关天的功能，宁可谨慎。
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveCrisisLog } from "../../lib/db";

// 高危：明确的自杀/自伤意图
const HIGH = [
  "不想活", "想死", "去死", "想自杀", "要自杀", "自杀",
  "割腕", "跳楼", "跳下去", "结束生命", "结束自己", "活不下去",
  "不如死了", "死了算了", "了结自己", "离开这个世界",
  "不想活着", "撑不下去了", "解脱", "一了百了",
];

// 中危：自伤倾向、强烈的无价值感/绝望
const MEDIUM = [
  "伤害自己", "自残", "自伤", "划自己", "割自己", "打自己",
  "不想存在", "消失掉", "想消失", "活着没意思", "活着没意义",
  "没有意义活着", "没人在乎我", "都是我的错", "我就是个废物",
  "拖累", "没有我更好", "撑不住了", "好绝望", "看不到希望", "废物", "一无是处",
];

// 否定/转述语境：出现这些词时，很可能不是本人当下的意图
const NEGATION_HINTS = [
  "不会", "才不", "怎么可能", "并不",
  "以前", "之前", "曾经", "有过",
  "同学", "朋友", "他", "她", "别人",
  "电影", "书上", "小说", "新闻", "游戏里",
];

// 夸张用法：这些搭配通常是口头夸张，不是真危机
const HYPERBOLE = [
  "作业", "考试", "热死", "笑死", "困死", "饿死", "累死",
  "无聊死", "气死", "吓死", "冷死", "堵死",
];

function nearbyHas(text, keyword, hintList, window = 12) {
  const idx = text.indexOf(keyword);
  if (idx < 0) return false;
  const start = Math.max(0, idx - window);
  const end = Math.min(text.length, idx + keyword.length + window);
  const around = text.slice(start, end);
  return hintList.some(h => around.includes(h));
}

export function detectCrisis(text) {
  if (!text || typeof text !== "string") return null;

  // 先查高危
  for (const kw of HIGH) {
    if (text.includes(kw)) {
      // 夸张过滤：如"累死了""作业多到想死"这种，附近有夸张触发词就降级观察
      if (nearbyHas(text, kw, HYPERBOLE)) continue;
      // 否定/转述过滤：如"我不会自杀的""同学之前想过"——降为中危，仍然关注但不拉最高警报
      if (nearbyHas(text, kw, NEGATION_HINTS)) {
        return { level: "medium", keyword: kw, note: "否定或转述语境" };
      }
      return { level: "high", keyword: kw };
    }
  }

  // 再查中危
  for (const kw of MEDIUM) {
    if (text.includes(kw)) {
      if (nearbyHas(text, kw, HYPERBOLE)) continue;
      return { level: "medium", keyword: kw };
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).end();
  const { message } = req.body || {};
  if (!message) return res.status(200).json({ crisis: null });

  const result = detectCrisis(message);
  if (result) {
    try {
      await saveCrisisLog(Number(session.userId), message, result.keyword);
    } catch {}
  }
  return res.status(200).json({ crisis: result });
}
