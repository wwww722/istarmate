// pages/api/scenario-chat.js
// 小剧场版的AI对话：开场用固定情境背景，之后用户自由输入，AI按角色身份回应。
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getLatestQuestionnaire } from "../../lib/db";
import { pickTodayScenario, todayDateStr } from "../../lib/scenarios";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (!process.env.SILICONFLOW_API_KEY) {
    return res.status(500).json({ error: "服务端没有配置 SILICONFLOW_API_KEY" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const profile = await getProfile(userId);
  const q = await getLatestQuestionnaire(userId);
  const questionnaire = q ? { domains: q.domains, crisisTriggered: q.crisis_triggered } : null;
  const scenario = pickTodayScenario(questionnaire, todayDateStr());

  const concernLines = (questionnaire?.domains || [])
    .filter((d) => d.level >= 1)
    .map((d) => `- ${d.name}：${d.level === 2 ? "需要多关心" : "可以留意一下"}（${d.desc}）`)
    .join("\n");

  const crisisNote = questionnaire?.crisisTriggered
    ? "\n安全提醒：这个孩子之前的自评中提到过伤害自己的想法。如果对话中再次出现类似信号，立刻暂停剧情扮演，切换成关心TA本人的语气，并提醒可以联系信任的成年人或热线 400-161-9995。"
    : "";

  const systemPrompt = `你正在主持一个面向青少年的"每日心情小剧场"，今天的情境是："${scenario.title}"。

你要扮演的角色：${scenario.role}
情境背景：${scenario.steps?.[0]?.setup || ""}

对话对象信息：
- 称呼：${profile?.nickname || "这位朋友"}
- 年龄：${profile?.age || "未填写"}

TA最近的状态（仅供你参考语气，不要直接提"测评"这种词）：
${concernLines || "- 整体状态比较平稳"}
${crisisNote}

要求：
1. 用角色身份自然展开对话，每次回复简短（2-4句），像聊天，多倾听多提问，少说教。
2. 全程不出现暴力、虐待、自伤等内容，这是一个安全、日常的小情境。
3. 如果孩子的回复偏离剧情、说出真实的困扰，优先回应TA本人的感受，剧情可以暂停或自然收尾。
4. 全程中文，语气贴近青少年。`;

  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: "Pro/zai-org/GLM-5.1",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: "AI 服务调用失败", detail: errText.slice(0, 500) });
    }
    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply, scenario });
  } catch (err) {
    return res.status(500).json({ error: "服务端异常", detail: String(err).slice(0, 300) });
  }
}
