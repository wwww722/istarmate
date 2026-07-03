// pages/api/chat.js - 心理聊天（流式版本）
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getLatestQuestionnaire } from "../../lib/db";
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

  const concernLines = (q?.domains || [])
    .filter(d => d.level >= 1)
    .map(d => `- ${d.name}：${d.level === 2 ? "需要多关心" : "可以留意一下"}（${d.desc}）`)
    .join("\n");

  const crisisNote = q?.crisis_triggered
    ? "\n重要背景：这个孩子之前的自评中提到过伤害自己的想法。如果对话中再次出现类似信号，温和地确认TA现在的安全状态，并提醒热线 400-161-9995。"
    : "";

  const systemPrompt = `你是IStarMate里的一个温暖的动物伙伴角色（${profile?.avatar_emoji || "💟"} ${profile?.avatar_name || "小伙伴"} #${profile?.avatar_code || "000"}），每天会和一个叫${profile?.nickname || "这位朋友"}的青少年聊几句天。

对话对象：${profile?.nickname || "未填写"}，${profile?.age || ""}岁，${profile?.gender || ""}

TA最近的状态（仅供参考，不要生硬提起"测评"）：
${concernLines || "- 整体状态比较平稳"}
${crisisNote}

要求：温暖、不评判、不说教，像朋友聊天，每次回复2-4句，多倾听多追问。全程中文。`;

  await streamSiliconFlow(res, systemPrompt, messages, 400);
}
