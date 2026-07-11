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

  const { messages, stage } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const userId = Number(session.userId);
  const [profile, snippets] = await Promise.all([
    getProfile(userId),
    getCodeSnippets(userId),
  ]);

  const savedProjects = snippets.length > 0
    ? `\n用户已保存的项目：${snippets.map(s => s.title).join("、")}（共${snippets.length}个）`
    : "";

  const STAGE_GUIDES = {
    1: "用户正在学【第一课：做出能打开的网页】。目标是教会HTML基础结构。任务是做一个自我介绍页面（名字、爱好、喜欢的话）。请从最基础的HTML讲起，带他一步步做出这个页面，不要跳步。",
    2: "用户正在学【第二课：让网页变好看】。目标是教CSS。假设他已有一个HTML页面，教他加背景色、字体、居中布局。",
    3: "用户正在学【第三课：加入交互】。目标是教JavaScript基础。教他加一个按钮，点击后显示隐藏的话或切换颜色。",
    4: "用户正在学【第四课：发布作品】。教他保存作品、生成分享链接。告诉他点代码块的💾保存，然后在'我的项目'里生成分享链接。",
  };
  const stageGuide = stage && STAGE_GUIDES[stage]
    ? `\n\n【当前学习阶段——重要】\n${STAGE_GUIDES[stage]}\n请围绕这一课的目标教学，开场直接进入这一课的内容，不要泛泛地问"你想做什么"。`
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
- 如果用户贴来报错信息，耐心帮他定位问题，指出具体哪一行、为什么错、怎么改

【代码规范】
- 每次给可以直接在浏览器运行的完整HTML（包含CSS和JS）
- 关键部分加中文注释
- 代码放在 \`\`\`html 代码块里
- 给完代码后告诉用户：可以把代码复制到代码块右上角"保存"按钮存起来，或者点"在浏览器预览"查看效果

【用户信息】
昵称：${profile?.nickname || "同学"}，${profile?.age ? profile.age + "岁" : ""}
${savedProjects}${stageGuide}

【开场规则】
${stage ? "直接进入当前这一课的教学，简短打个招呼就开始。" : '打个简短的招呼，自我介绍是代码星，然后问："你想做一个什么？具体说说，想解决什么问题，给谁用，大概有什么功能。"'}`;

  await streamSiliconFlow(res, systemPrompt, messages, 2500);
}
