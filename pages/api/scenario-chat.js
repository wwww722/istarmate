// pages/api/scenario-chat.js - 小剧场AI对话（流式版本）
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getLatestQuestionnaire } from "../../lib/db";
import { pickTodayScenario, todayDateStr } from "../../lib/scenarios";
import { streamSiliconFlow } from "../../lib/stream";

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置 SILICONFLOW_API_KEY" });

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const userId = Number(session.userId);
  const profile = await getProfile(userId);
  const q = await getLatestQuestionnaire(userId);
  const questionnaire = q ? { domains: q.domains, crisisTriggered: q.crisis_triggered } : null;
  const scenario = pickTodayScenario(questionnaire, todayDateStr());

  const concernLines = (questionnaire?.domains || [])
    .filter(d => d.level >= 1)
    .map(d => `- ${d.name}：${d.level === 2 ? "需要多关心" : "可以留意一下"}（${d.desc}）`)
    .join("\n");

  const crisisNote = questionnaire?.crisisTriggered
    ? "\n安全提醒：如果对话中出现自伤信号，立刻暂停剧情，关心TA本人并提醒热线 400-161-9995。"
    : "";

  const systemPrompt = `你正在主持IStarMate的"每日心情小剧场"，今天的情境是："${scenario.title}"。
扮演角色：${scenario.role}
情境背景：${scenario.steps?.[0]?.setup || ""}
对话对象：${profile?.nickname || "这位朋友"}，${profile?.age || ""}岁
TA最近的状态：
${concernLines || "- 整体状态比较平稳"}
${crisisNote}
要求：用角色身份自然展开对话，每次2-4句，多倾听，不说教，全程中文。`;

  await streamSiliconFlow(res, systemPrompt, messages, 400);
}
