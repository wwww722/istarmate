// pages/api/chat.js （超级升级替换版）
// 新能力：三角色体系（星野/川/明川）+ 多模型矩阵 + 开源模型路由 + 思考过程流式 + 多模态图片 + 游戏化任务 + 陪伴值
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { sqlQuery as sql } from "../../lib/db";
import { getUserProfile, buildMemoryContext, buildRecentUserContext } from "../../lib/promptHelpers";
import { getRiskNote, buildScenarioContext } from "../../lib/scenarios";
import { buildThreadContext } from "../../lib/memory";
import { buildCharacterSystemPrompt } from "../../lib/characters";
import { buildForbiddenRule } from "../../lib/istarmateConstitution";
import { resolvePersonaAndModel, autoPickPersonaByContent } from "../../lib/modelMatrix";
import { resolveFullModel } from "../../lib/ossModelRoutes";
import { pickSiliconflowModelId, sfApiKey, shouldUseSiliconflow } from "../../lib/models";
import { progressTask, consumeEnergy, addXp } from "../../lib/gamification";

export const config = { runtime: "nodejs", maxDuration: 120 };

async function getCurrentTier(userId) {
  userId = Number(userId);
  const r = (await sql("SELECT tier FROM user_subscriptions WHERE user_id=$1", [userId])).rows[0];
  return r?.tier || "free";
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "未登录" });
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const userId = Number(session.userId);
  const { messages = [], scenario = "general", context: ctxOverride, personaId: personaOverride, modelId: modelOverride, charId: charIdRaw, attachments = [], extraInstruction = "" } = req.body || {};
  const tier = await getCurrentTier(userId);

  // 1. 决定角色
  const defaultChar = (scenario === "code" || /代码|编程|报错|运行|APP|网页/i.test((messages[messages.length-1]?.content) || "")) ? "yusheng" : "anhe";
  const charId = charIdRaw || defaultChar;

  // 2. 用户输入的最后一句话（用于路由和 CBT 触发）
  const lastUserText = messages.slice().reverse().find(m => m.role === "user")?.content || "";

  // 3. 决定人格和底层模型
  let personaId = personaOverride === "auto" || !personaOverride ? autoPickPersonaByContent(lastUserText, charId) : personaOverride;
  const { persona } = resolvePersonaAndModel(charId, personaId);
  const fullModel = resolveFullModel({ charId, userTier: tier, preferredModelId: modelOverride, contentHint: lastUserText });
  const sfModel = fullModel.sfModelId || pickSiliconflowModelId(scenario === "code" ? "code" : "smart");

  // 4. 扣能量（免费版有限量）
  if (scenario !== "self-checkin") {
    const er = await consumeEnergy(userId, 1);
    if (!er.ok) return res.status(402).json({ error: er.reason || "今日陪伴值用完啦" });
  }

  // 5. 上下文拼装
  const [profile, memoryData, recentContext, threadContext] = await Promise.all([
    getUserProfile(userId),
    buildMemoryContext(userId, 25, 180),
    buildRecentUserContext(userId),
    buildThreadContext(ctxOverride?.threadId, userId, 8),
  ]);
  const concernLines = (memoryData?.concernLines || []).join("；");
  const crisisNote = (await getRiskNote(userId, messages)) || "";
  const charSystemPrompt = buildCharacterSystemPrompt(charId, {
    profile, concernLines, crisisNote, memorySection: memoryData?.memorySection,
    memoryFacts: memoryData?.memoryFacts, threadSection: threadContext,
    recentUserText: recentContext?.summary || lastUserText,
    age: profile?.age, familyNote: null,
    errorStack: scenario === "code" ? ctxOverride?.errorStack : null,
  });
  const scenarioSystem = buildScenarioContext(scenario, profile, recentContext);
  const finalSystem = buildForbiddenRule() + "\n\n" + (persona.systemPrefix || "") + "\n\n" + scenarioSystem + "\n" + charSystemPrompt + (extraInstruction ? "\n" + extraInstruction : "");

  // 6. 拼 messages（去掉原来的 system，统一替换；支持多模态 attachments）
  const cleanMessages = messages.filter(m => m.role !== "system");
  // 如果有多模态附件，把最后一条 user 消息改成 multimodal [{type:text,text:..},{type:image,image_url:{url:dataUrl}}]
  if (attachments && attachments.length && cleanMessages.length) {
    const last = cleanMessages[cleanMessages.length - 1];
    if (last.role === "user" && typeof last.content === "string") {
      const mm = [{ type: "text", text: last.content }];
      for (const a of attachments.slice(0, 3)) {
        if (a?.dataUrl?.startsWith("data:image")) mm.push({ type: "image_url", image_url: { url: a.dataUrl } });
      }
      last.content = mm;
    }
  }
  const payloadMessages = [{ role: "system", content: finalSystem }, ...cleanMessages];

  // 7. 流式调用 SiliconFlow
  const apiKey = sfApiKey();
  const useSF = shouldUseSiliconflow();
  const baseUrl = useSF ? "https://api.siliconflow.cn/v1" : (process.env.OPENAI_API_BASE || "https://api.openai.com/v1");
  const key = useSF ? apiKey : (process.env.OPENAI_API_KEY || apiKey);
  const temperature = (fullModel.temperature ?? 0.7) + (persona.temperatureBoost || 0);
  const body = {
    model: sfModel,
    messages: payloadMessages,
    stream: true,
    temperature,
    max_tokens: scenario === "code" ? 4096 : 2048,
  };
  // DeepSeek-R1 推荐把 reasoning_effort 开
  if (fullModel.model.id === "deepseek_r1") body.reasoning_effort = "medium";

  try {
    const proxyResp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
        "Accept": "text/event-stream",
      },
      body: JSON.stringify(body),
    });
    if (!proxyResp.ok) {
      const txt = await proxyResp.text().catch(() => "");
      return res.status(proxyResp.status).json({ error: `模型服务错误: ${proxyResp.status} - ${txt.slice(0, 400)}` });
    }
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("X-Istarmate-Model", fullModel.model.id);
    res.setHeader("X-Istarmate-Character", charId);
    res.setHeader("X-Istarmate-Persona", persona.id);
    res.setHeader("X-Istarmate-Reasoning", fullModel.streamReasoning ? "1" : "0");
    res.setHeader("X-Istarmate-Multimodal", fullModel.multimodal ? "1" : "0");
    // 在 SSE 开头发一个元信息，UI 用
    res.write(`event: meta\ndata: ${JSON.stringify({
      model: { id: fullModel.model.id, displayName: fullModel.model.displayName, emoji: fullModel.model.emoji },
      character: { id: charId, persona: persona.id },
      tier,
    })}\n\n`);
    let fullText = "";
    await new Promise((resolve, reject) => {
      let buf = "";
      proxyResp.body.on("data", (chunk) => {
        buf += chunk.toString("utf8");
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const l of lines) {
          if (!l) { res.write("\n"); continue; }
          const s = l.trim();
          if (s.startsWith("data:")) {
            const payload = s.slice(5).trim();
            if (payload === "[DONE]") { res.write("data: [DONE]\n\n"); resolve(); continue; }
            try {
              const obj = JSON.parse(payload);
              const delta = obj?.choices?.[0]?.delta || {};
              // R1: reasoning_content 或 content 都要透传
              if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length) {
                fullText += `<think>${delta.reasoning_content}</think>`;
              }
              if (typeof delta.content === "string" && delta.content.length) {
                fullText += delta.content;
              }
            } catch {}
          }
          res.write(l + "\n");
        }
      });
      proxyResp.body.on("end", () => resolve());
      proxyResp.body.on("error", (e) => reject(e));
    });
    // 写库：chat_history + memory 提取 + 游戏化进度
    const latest = (messages[messages.length - 1]?.content) || lastUserText;
    try {
      await sql(
        "INSERT INTO chat_history (user_id, role, content, scenario) VALUES ($1,'user',$2,$3),($1,'assistant',$4,$3)",
        [userId, String(latest).slice(0, 8000), scenario, fullText.slice(0, 8000)]
      );
      progressTask(userId, "chat5", 1).catch(() => {});
      if (scenario !== "code") addXp(userId, 2, "chat_received", "聊天互动").catch(() => {});
    } catch {}
    res.end();
  } catch (e) {
    console.error("[chat] stream error:", e);
    // Phase Ⅰ·21：永远不给前端红色报错，改用兜底话术
    const ANHE_FALLBACK = [
      "我的网络今天有点卡，你再说一遍好不好 🤍",
      "刚才那下我没听清，能再说一次吗？",
      "抱歉哦我刚刚走神了，可以重新发我一下吗？",
      "我在呢，刚才那条没收到，能再发一遍吗 🤍",
      "啊我卡了一下，你再说一次我这次一定好好听～",
    ];
    const YUSHENG_FALLBACK = [
      "哦我网炸了，你重新发一次 💙",
      "刚才沙盒引擎卡了一下，你那 bug 再贴我一次？",
      "抱歉刚才那条丢了，重新发我一下马上帮你改！",
      "我刚刚重启了一下环境，你再发一次？",
      "收到一半卡住了，重发我一下 💪",
    ];
    const pool = (typeof charId !== "undefined" && charId === "yusheng") ? YUSHENG_FALLBACK : ANHE_FALLBACK;
    const line = pool[Math.floor(Math.random() * pool.length)];
    try {
      if (!res.headersSent) {
        res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform" });
      }
      // 以正常内容形式发出，前端当普通回复渲染，不显示错误
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: line } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
    } catch {}
    res.end();
  }
}
