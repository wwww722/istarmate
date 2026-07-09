// pages/api/scenario.js - 支持AI动态生成场景 + 进度存取
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getLatestQuestionnaire, getScenarioLog, getScenarioHistory, upsertScenarioProgress } from "../../lib/db";
import { todayDateStr } from "../../lib/scenarios";
import { streamSiliconFlow } from "../../lib/stream";

// 根据问卷结果和日期，让AI生成今天的场景背景
async function generateTodayScenario(questionnaire, dateStr) {
  const domains = questionnaire?.domains || [];
  const weak = domains.filter(d => d.level >= 1).sort((a, b) => b.level - a.level);
  const focusDomain = weak[0];
  
  const dayIndex = Math.floor(new Date(dateStr).getTime() / 86400000);
  
  const prompt = `你是一个青少年心理剧场的场景设计师。请根据以下信息，生成今天的小剧场场景。

今天是第 ${dayIndex % 365 + 1} 天的剧场。
${focusDomain ? `用户最近在"${focusDomain.name}"方面需要关注（${focusDomain.desc}）` : "用户整体状态平稳"}

请生成一个符合以下要求的场景，用JSON格式回复，不要有任何其他文字：
{
  "id": "场景唯一ID（英文字母数字，比如 cafe_awkward_01）",
  "title": "场景标题（4-10个字，吸引人的）",
  "role": "今天你要扮演的角色（比如：隔壁班同学·林然，或者：学校图书馆管理员）",
  "setup": "场景背景描述，用第二人称，描述发生了什么，让用户立刻代入（2-4句话，生动具体，有画面感）"
}

要求：
- 场景要贴近青少年真实生活（学校、家里、社交、网上、兴趣爱好等）
- 场景要和${focusDomain ? '"' + focusDomain.name + '"' : "日常状态"}有自然关联，但不要说教
- 每次生成的场景要有新鲜感，不要重复常见模板
- setup里要有一个自然的"钩子"，让用户想回应`;

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
        max_tokens: 400,
        temperature: 0.9, // 高温让场景更有创意
      }),
    });
    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const clean = text.replace(/```json|```/g, "").trim();
    const scenario = JSON.parse(clean);
    return scenario;
  } catch {
    // AI生成失败，用兜底场景
    return {
      id: "fallback_checkin",
      title: "普通的一天",
      role: "心情小驿站 · 星伴",
      setup: "今天没有特别的安排，只是想来问问你今天过得怎么样。",
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
    const questionnaire = { domains: q.domains, crisisTriggered: q.crisis_triggered };

    const history = await getScenarioHistory(userId, 365);
    const completedDays = history.filter(h => h.completed).length;

    // 先看今天有没有已存的场景
    const log = await getScenarioLog(userId, dateStr);

    let scenario;
    if (log?.scenario_id && log.scenario_id !== "chat" && log.choices?.length > 0) {
      // 今天已经有进度了，恢复已存的场景信息
      // 场景信息存在choices的metadata里
      const meta = log.choices.find(c => c._scenarioMeta);
      scenario = meta?._scenarioMeta || await generateTodayScenario(questionnaire, dateStr);
    } else {
      // 今天还没开始，AI生成新场景
      scenario = await generateTodayScenario(questionnaire, dateStr);
    }

    return res.status(200).json({
      scenario,
      dayCount: completedDays + 1,
      progress: log
        ? { stepIndex: log.step_index, choices: log.choices?.filter(c => !c._scenarioMeta) || [], completed: log.completed }
        : { stepIndex: 0, choices: [], completed: false },
    });
  }

  if (req.method === "POST") {
    const { scenarioId, stepIndex, choices, completed, scenarioMeta } = req.body || {};
    // 把场景元信息也存进choices，方便下次恢复
    const choicesWithMeta = scenarioMeta
      ? [...(choices || []), { _scenarioMeta: scenarioMeta }]
      : choices;
    await upsertScenarioProgress(userId, dateStr, scenarioId || "ai", stepIndex, choicesWithMeta, !!completed);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
