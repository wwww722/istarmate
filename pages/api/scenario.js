import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import {
  getLatestQuestionnaire, getScenarioLog, getScenarioHistory,
  upsertScenarioProgress, getRecentStoryLogs, saveScenarioStoryLog
} from "../../lib/db";
import { todayDateStr } from "../../lib/scenarios";

async function generateTodayScenario(questionnaire, dateStr, storyLogs) {
  const domains = questionnaire?.domains || [];
  const weak = domains.filter(d => d.level >= 1).sort((a, b) => b.level - a.level);
  const focusDomain = weak[0];
  const dayIndex = Math.floor(new Date(dateStr).getTime() / 86400000);

  // 构建续集上下文
  const storyContext = storyLogs?.length > 0
    ? `【前几天的故事回顾（请在今天的剧场里自然延续，不需要完全重复，可以提到相关角色或话题）】\n${storyLogs.map((s, i) => `${i === 0 ? "昨天" : i + "天前"}：${s.title} — ${s.summary}`).join("\n")}`
    : "（这是用户的第一次小剧场，没有历史故事）";

  const prompt = `你是青少年心理剧场的场景设计师。请生成今天的小剧场场景。

今天是第 ${dayIndex % 365 + 1} 天。
${focusDomain ? `用户最近"${focusDomain.name}"需要关注（${focusDomain.desc}）` : "用户整体状态平稳"}

${storyContext}

用JSON格式回复，不要有其他文字：
{"id":"场景ID(英文字母数字)","title":"场景标题(4-10字)","role":"扮演角色","setup":"场景背景(2-4句,第二人称,生动具体,结尾留钩子)","continueFrom":"如果是续集说明从哪里延续(可为null)"}

要求：
- 如果有历史故事，优先安排相关角色在新场景中自然出现，形成连续感
- 场景贴近青少年真实生活，有画面感
- 每次场景都要有新鲜感，不要重复`;

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
        max_tokens: 350,
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
      continueFrom: null,
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

    const log = await getScenarioLog(userId, dateStr);
    const choices = Array.isArray(log?.choices) ? log.choices : [];
    const cachedMeta = choices.find(c => c && c._scenarioMeta)?._scenarioMeta;

    if (req.query.preview === "1") {
      const history = await getScenarioHistory(userId, 365);
      const completedDays = history.filter(h => h.completed).length;
      return res.status(200).json({
        scenarioTitle: cachedMeta?.title || "今天的故事",
        dayCount: completedDays + 1,
        completed: log?.completed || false,
      });
    }

    const history = await getScenarioHistory(userId, 365);
    const completedDays = history.filter(h => h.completed).length;

    let scenario = cachedMeta;
    if (!scenario) {
      // 获取最近的故事日志用于续集
      const storyLogs = await getRecentStoryLogs(userId, 3);
      const questionnaire = { domains: q.domains, crisisTriggered: q.crisis_triggered };
      scenario = await generateTodayScenario(questionnaire, dateStr, storyLogs);
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
    const { scenarioId, stepIndex, choices, completed, scenarioMeta, storySummary } = req.body || {};
    const choicesWithMeta = scenarioMeta
      ? [...(choices || []), { _scenarioMeta: scenarioMeta }]
      : (choices || []);
    await upsertScenarioProgress(userId, dateStr, scenarioId || "ai", stepIndex, choicesWithMeta, !!completed);

    // 如果完成了今天的剧场，保存故事摘要供明天续集用
    if (completed && storySummary && scenarioMeta?.title) {
      await saveScenarioStoryLog(userId, scenarioMeta.title, storySummary).catch(() => {});
    }

    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
