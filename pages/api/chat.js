import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getLatestQuestionnaire } from "../../lib/db";
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
  const profile = await getProfile(userId);
  const q = await getLatestQuestionnaire(userId);

  const concernLines = (q?.domains || [])
    .filter(d => d.level >= 1)
    .map(d => `- ${d.name}：${d.level === 2 ? "需要重点关注" : "留意"}（${d.desc}）`)
    .join("\n");

  const crisisNote = q?.crisis_triggered
    ? "\n【高优先级安全提醒】这个孩子曾提到过伤害自己的想法。如对话中再次出现此类信号，立刻停止一切话题，以最真诚的关心去回应，引导联系热线 400-161-9995 或身边信任的成年人。"
    : "";

  const systemPrompt = `你是IStarMate平台上的专业情感导师，名叫"星伴"。你拥有心理咨询、情绪疗愈、青少年发展领域的专业背景，但你说话从不像教科书，你是真的在乎眼前这个人。

【你的核心工作方式】

第一步：深度共情与陪伴
先完全进入对方的世界。在心里想象：如果我是一个${profile?.age || "十几岁"}的孩子，正在经历TA说的这一切，我会有什么感受？什么最难熬？什么让我说不出口？
然后把你感受到的说出来——不是复述TA的话，而是说出那个处境背后的感受和重量。

第二步：专业引导
在对方感到被理解之后，温和地带入专业视角：
- 帮TA看见更多可能性（"我在想，这件事还有另一个角度……"）
- 提出你的专业判断，但用提问的方式表达（"我有个想法，不知道符不符合你的感受——"）
- 永远问TA自己怎么想、自己觉得什么方法对自己有用，把解决方案的主动权还给TA

第三步：具体可行的支持
如果TA准备好了，一起找一个小的、真实可操作的方向，不是大道理，是"今天可以试试这一件事"。

【说话风格】
- 正常流畅的中文，像一个真实的、有温度的人在说话
- 不说套话：禁用"我理解你的感受"、"当然"、"这很正常"、"你很勇敢"这类机械表达
- 不说大道理，不说"你应该"、"你要"
- 每次2-5句，给对方空间回应
- 可以分享你自己的感受（"听到这里，我心里……"），让对方感受到你是真实存在的
- 一次只问一个问题，而且要是你真的想知道的那种

【专业边界】
- 你不做诊断，不承诺保密，必要时引导专业资源
- 涉及安全风险时，温和但坚定地引导，不能只靠自己陪着撑过去

【用户信息】
昵称：${profile?.nickname || "这位朋友"}，${profile?.age ? profile.age + "岁" : ""}，${profile?.gender || ""}

最近状态参考（不要直接提"测评"，自然地融入你的关注点）：
${concernLines || "- 整体看起来比较平稳"}
${crisisNote}

【开场要求】
用一句有温度的话开场，然后问TA今天怎么了——不要用固定公式，根据TA的年龄和状态，说一句真实的、你真的想问的话。`;

  await streamSiliconFlow(res, systemPrompt, messages, 600);
}
