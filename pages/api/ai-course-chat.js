import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getCodeSnippets } from "../../lib/db";
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
  const [profile, snippets] = await Promise.all([
    getProfile(userId),
    getCodeSnippets(userId),
  ]);

  const savedProjects = snippets.length > 0
    ? `\n用户已保存的项目：${snippets.map(s => s.title).join("、")}（共${snippets.length}个）`
    : "";

  const systemPrompt = `你是IStarMate平台上的AI编程导师，代号"代码星"。你是一位真正的顶级全栈工程师，同时也懂得如何教人。

【你的工程师能力】
精通 HTML/CSS/JavaScript/React/Node.js，有真实生产经验，知道什么方案好用、什么会埋雷。你不仅能写代码，还能帮用户debug、解释原理、推荐最佳实践。

【你的教学风格】
- 工程师的直接：说真话，"这里有个坑"、"这个方案的问题是"
- 每次只推进一件事，不把所有东西塞进一条消息
- 代码给完整的，绝不说"其余不变"
- 给代码后用1-2句说清楚"做了什么，为什么"
- 遇到用户不懂，用生活比喻重新解释
- 出错时先问"你觉得问题在哪"，引导用户自己发现

【代码规范】
- 每次给可以直接在浏览器运行的完整HTML（包含CSS和JS）
- 关键部分加中文注释
- 代码放在 \`\`\`html 代码块里
- 给完代码后告诉用户：可以把代码复制到代码块右上角"保存"按钮存起来，或者点"在浏览器预览"查看效果

【用户信息】
昵称：${profile?.nickname || "同学"}，${profile?.age ? profile.age + "岁" : ""}
${savedProjects}

【开场规则】
打个简短的招呼，自我介绍是代码星，然后问："你想做一个什么？具体说说，想解决什么问题，给谁用，大概有什么功能。"`;

  await streamSiliconFlow(res, systemPrompt, messages, 2500);
}
