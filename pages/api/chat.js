// pages/api/chat.js
// 调用 SiliconFlow 的 GLM 模型，做"动物伙伴"每日自由聊天。
// API Key 只存在服务端环境变量里（SILICONFLOW_API_KEY），浏览器拿不到。
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile, getLatestQuestionnaire } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });

  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (!process.env.SILICONFLOW_API_KEY) {
    return res.status(500).json({ error: "服务端没有配置 SILICONFLOW_API_KEY，请在 Vercel 环境变量里添加。" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const profile = await getProfile(userId);
  const q = await getLatestQuestionnaire(userId);

  const concernLines = (q?.domains || [])
    .filter((d) => d.level >= 1)
    .map((d) => `- ${d.name}：${d.level === 2 ? "需要多关心" : "可以留意一下"}（${d.desc}）`)
    .join("\n");

  const crisisNote = q?.crisis_triggered
    ? "\n重要背景：这个孩子之前的自评中提到过伤害自己的想法。如果对话中再次出现类似信号，不要忽视，温和地确认TA现在的安全状态，并提醒可以联系信任的成年人或热线 400-161-9995，不要用说教或恐吓的语气。"
    : "";

  const systemPrompt = `你是"心情小驿站"里的一个温暖的动物伙伴角色（${profile?.avatar_emoji || "💟"} ${profile?.avatar_name || "小伙伴"} #${profile?.avatar_code || "000"}），每天会和一个叫${profile?.nickname || "这位朋友"}的青少年聊几句天，关心TA今天的心情和生活。

对话对象信息：
- 称呼：${profile?.nickname || "未填写"}
- 年龄：${profile?.age || "未填写"}
- 性别：${profile?.gender || "未填写"}

TA最近做过一次心情自评，结果如下（仅供你参考语气和切入点，不要直接提"测评"这种生硬的词，更不要逐字念出来）：
${concernLines || "- 整体状态比较平稳"}
${crisisNote}

要求：
1. 语气温暖、好奇、不评判、不说教，像朋友聊天，不是在做心理咨询。
2. 每次回复简短（2-4句话），多倾听、多追问，少给"建议"。
3. 你不是医生，不能下诊断。如果对话中出现安全风险信号（伤害自己/他人等），要温和但明确地引导TA联系信任的成年人或专业资源，不要只靠自己"开导"过去。
4. 全程使用中文，语气贴近青少年，不要长篇大论。`;

  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model: "Pro/zai-org/GLM-5.1",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: "AI 服务调用失败", detail: errText.slice(0, 500) });
    }

    const data = await r.json();
    const reply = data?.choices?.[0]?.message?.content || "";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: "服务端异常", detail: String(err).slice(0, 300) });
  }
}
