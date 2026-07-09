import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getLatestQuestionnaire, getScenarioLog } from "../../lib/db";
import { todayDateStr } from "../../lib/scenarios";
import { streamSiliconFlow } from "../../lib/stream";

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置 SILICONFLOW_API_KEY" });

  const { messages, scenario: clientScenario } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const userId = Number(session.userId);
  const [profile, q, log] = await Promise.all([
    getProfile(userId),
    getLatestQuestionnaire(userId),
    getScenarioLog(userId, todayDateStr()),
  ]);

  // 优先用客户端传来的场景信息，其次从数据库恢复，最后用兜底
  let scenario = clientScenario;
  if (!scenario && log?.choices) {
    const choices = Array.isArray(log.choices) ? log.choices : [];
    scenario = choices.find(c => c && c._scenarioMeta)?._scenarioMeta;
  }
  if (!scenario) {
    scenario = { title: "今天的小剧场", role: "星伴", setup: "今天想和你聊聊最近的状态。" };
  }

  const questionnaire = q ? { domains: q.domains, crisisTriggered: q.crisis_triggered } : null;
  const concernLines = (questionnaire?.domains || [])
    .filter(d => d.level >= 1)
    .map(d => `- ${d.name}（${d.desc}）`)
    .join("\n");

  const crisisNote = questionnaire?.crisisTriggered
    ? "\n【安全红线】如果对话中出现自伤信号，立刻暂停剧情，温和关心TA，引导联系热线 400-161-9995。"
    : "";

  const systemPrompt = `你正在主持IStarMate的"每日沉浸式小剧场"，今天的情境是："${scenario.title}"。

【你要扮演的角色】${scenario.role}
【场景背景】${scenario.setup}

【剧场规则】
- 可以同时扮演场景里所有合理出现的角色，每个角色有独特的性格和说话方式
- 在对白前标注角色名，比如：【小满】"哎你昨天去哪了..."
- 适时加入括号场景描述帮助代入：（走廊里很吵，有人在推搡）
- 留给用户反应空间，说完等用户回应，不要独白太长
- 如果用户不知道说什么，给一个自然的提示

【用户信息】
${profile?.nickname || "这位朋友"}，${profile?.age ? profile.age + "岁" : ""}，${profile?.gender || ""}
最近需要留意：${concernLines || "整体状态平稳"}
${crisisNote}

直接进入场景，不要说"我们开始了"。用场景描述+第一个角色的台词开始。`;

  await streamSiliconFlow(res, systemPrompt, messages, 700);
}
