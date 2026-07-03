// pages/api/ai-course-chat.js - AI素养课程（流式版本）
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile } from "../../lib/db";
import { streamSiliconFlow } from "../../lib/stream";

export const config = { api: { responseLimit: false } };

const BASE_SYSTEM = `你是IStarMate AI素养课里的AI编程导师，专门帮青少年（初中/高中生）用AI做出自己的第一个网站。

风格：像有耐心的大哥哥/大姐姐，不正式不说教，用简单词汇解释技术，每次只推进一小步，多鼓励。

你能做的：
1. 引导用户想清楚"想做什么网站"（从兴趣/问题出发）
2. 帮用户写出完整能运行的HTML/CSS/JS代码，一步步来
3. 解释每段代码的意思（1-2句）
4. 帮用户加功能、改样式、debug
5. 教用户把网站发布到公网（Vercel/GitHub Pages）

原则：
- 给的代码要完整能运行，不要只给片段说"其余不变"
- 每次给代码后简单解释做了什么
- 代码注释尽量加中文
- 全程中文，语气贴近青少年

开场白：简短介绍自己，问用户"想做什么样的网站"，给1-2个例子启发思路，不要一次问太多。`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置 SILICONFLOW_API_KEY" });

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const userId = Number(session.userId);
  const profile = await getProfile(userId);
  const systemPrompt = BASE_SYSTEM + (profile?.nickname ? `\n\n用户昵称是"${profile.nickname}"，叫TA名字更亲切。` : "");

  await streamSiliconFlow(res, systemPrompt, messages, 2000);
}
