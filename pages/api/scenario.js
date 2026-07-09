import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getLatestQuestionnaire, getScenarioLog, getScenarioHistory, upsertScenarioProgress } from "../../lib/db";
import { todayDateStr } from "../../lib/scenarios";

// AI生成今日场景（只在用户真正点进小剧场时调用，不在仪表盘加载时调用）
async function generateTodayScenario(questionnaire, dateStr) {
  const domains = questionnaire?.domains || [];
  const weak = domains.filter(d => d.level >= 1).sort((a, b) => b.level - a.level);
  const focusDomain = weak[0];
  const dayIndex = Math.floor(new Date(dateStr).getTime() / 86400000);

  const prompt = `你是青少年心理剧场的场景设计师。请生成今天的小剧场场景。

今天是第 ${dayIndex % 365 + 1} 天。
${focusDomain ? `用户最近"${focusDomain.name}"需要关注（${focusDomain.desc}）` : "用户整体状态平稳"}

用JSON格式回复，不要有其他文字：
{"id":"场景ID(英文字母数字)","title":"场景标题(4-10字)","role":"扮演角色","setup":"场景背景(2-4句,第二人称,生动具体)"}

要求：贴近青少年真实生活，和关注维度自然关联，有画面感，结尾留一个让用户想回应的钩子。`;

  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: "Pro/zai-org/GLM-5.1",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.9,
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no JSON");
    return JSON.parse(match[0]);
  } catch {
    return {
      id: "fallback_checkin",
      title: "普通的一天",
      role: "心情小驿站 · 星伴",
      setup: "今天没有特别的安排，只是想来问问你今天过得怎么样。有什么想说的吗？",
    };
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);
  const dateStr = todayDateStr();

  if (req.method === "GET") {
    const q = await getLatestQuestionnaire(userId);
    if (!q) return res.status(400).json({ error: "请先完成问卷" });

    const history = await getScenarioHistory(userId, 365);
    const completedDays = history.filter(h => h.completed).length;
    const log = await getScenarioLog(userId, dateStr);

    // 检查今天是否已有缓存的场景
    const choices = log?.choices || [];
    const cachedMeta = choices.find?.(c => c && c._scenarioMeta)?._scenarioMeta;

    // 如果仪表盘请求（带 preview=1 参数），只返回基础信息，不生成场景
    if (req.query.preview === "1") {
      return res.status(200).json({
        scenarioTitle: cachedMeta?.title || "今天的故事",
        dayCount: completedDays + 1,
        completed: log?.completed || false,
      });
    }

    // 用户真正进入小剧场，才生成场景
    let scenario = cachedMeta;
    if (!scenario) {
      const questionnaire = { domains: q.domains, crisisTriggered: q.crisis_triggered };
      scenario = await generateTodayScenario(questionnaire, dateStr);
    }

    const userChoices = choices.filter(c => c && !c._scenarioMeta);

    return res.status(200).json({
      scenario,
      dayCount: completedDays + 1,
      progress: {
        stepIndex: log?.step_index || 0,
        choices: userChoices,
        completed: log?.completed || false,
      },
    });
  }

  if (req.method === "POST") {
    const { scenarioId, stepIndex, choices, completed, scenarioMeta } = req.body || {};
    const choicesWithMeta = scenarioMeta
      ? [...(choices || []), { _scenarioMeta: scenarioMeta }]
      : (choices || []);
    await upsertScenarioProgress(userId, dateStr, scenarioId || "ai", stepIndex, choicesWithMeta, !!completed);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
