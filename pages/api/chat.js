// pages/api/chat.js
// 后端接口：接收前端发来的对话历史 + 用户信息 + 问卷结果 + 今日剧场，
// 拼好 system prompt 后调用 Anthropic API，返回 AI 回复。
// 真实 API key 只存在于服务端环境变量里，浏览器拿不到，这是必须这样做的安全原因。

import { buildScenarioSystemPrompt, pickTodayScenario } from "../../lib/scenarios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "只支持 POST" });
  }

  const { messages, profile, questionnaire } = req.body || {};

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "服务端没有配置 ANTHROPIC_API_KEY，请在 Vercel 项目的环境变量里添加后重新部署。",
    });
  }

  const scenario = pickTodayScenario(questionnaire);
  const systemPrompt = buildScenarioSystemPrompt({
    nickname: profile?.nickname,
    age: profile?.age,
    gender: profile?.gender,
    questionnaire,
    scenario,
  });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        system: systemPrompt,
        messages: messages || [],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: "AI 服务调用失败", detail: errText });
    }

    const data = await response.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return res.status(200).json({ reply: text, scenario });
  } catch (err) {
    return res.status(500).json({ error: "服务端异常", detail: String(err) });
  }
}
