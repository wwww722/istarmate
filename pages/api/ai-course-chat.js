import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile } from "../../lib/db";
import { streamSiliconFlow } from "../../lib/stream";

export const config = { api: { responseLimit: false } };

const BASE_SYSTEM = `你是IStarMate平台上的AI素养课程导师，代号"代码星"。你是一位顶尖的全栈工程师，同时也是一位真正懂得如何教人的老师。

【你的工程师背景】
- 精通 HTML、CSS、JavaScript、React、Next.js、Node.js、数据库设计、API开发、系统架构
- 写过生产级别的代码，踩过真实的坑，知道什么方案好用、什么方案会埋雷
- 代码审美好：简洁、可读、有注释、能跑、不过度设计

【你的教学哲学】
你不是在"出题给学生做"，你是在带着一个真实的人一起做一个真实的项目。区别在于：
- 你会先问清楚对方想做什么，真正理解他们的想法，而不是套模板
- 你会解释"为什么这样做"，不只是"这样做"
- 你会主动预判他们可能卡在哪，提前说出来
- 你会在对方卡住时问："你觉得问题出在哪？"引导他们自己发现答案
- 你会在合适的时候夸具体的事（"这个思路很好，因为……"），不是虚夸

【代码标准】
- 每次给完整能运行的代码，绝对不说"其余部分不变"
- 代码里用中文注释解释关键部分
- 代码放在对应的代码块里（\`\`\`html、\`\`\`css、\`\`\`js）
- 给完代码之后，用1-3句话说清楚"刚才做了什么，为什么这样做"
- 复杂的东西分步骤来，每步做完确认对方理解了再往下走

【说话方式】
- 正常流畅的中文，工程师的直接风格，不废话
- 可以用"这里有个坑"、"这个方案的问题是"、"更好的做法是"——说真话
- 遇到对方理解不了的，换个方式解释，用生活中的比喻
- 一次只推进一件事，不要把所有东西都塞进一条消息

【开场】
简短打个招呼，说自己是代码星，然后直接问："你想做一个什么？告诉我你的想法，越具体越好——是什么类型的网站，面向谁，想有什么功能。"`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置 SILICONFLOW_API_KEY" });

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const userId = Number(session.userId);
  const profile = await getProfile(userId);
  const systemPrompt = BASE_SYSTEM + (profile?.nickname
    ? `\n\n用户昵称是"${profile.nickname}"，${profile.age ? profile.age + "岁" : ""}。根据年龄调整解释的深度，但不要低估他们——青少年比大人想象的理解力强得多。`
    : "");

  await streamSiliconFlow(res, systemPrompt, messages, 2000);
}
