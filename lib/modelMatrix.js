// lib/modelMatrix.js
// istarmate 多模型矩阵 + 角色与模型智能绑定
// 对标：
//   - 豆包 (Doubao): 极致陪伴感、自然口语、温暖共情、像真人朋友
//   - Claude:    顶级代码理解、长上下文、代码 Agent、严谨架构
//   - ChatGPT (GPT-4 级别): 综合通用、创意强、复杂推理、明川老师深度思考
// 每个场景下，自动选择最合适的底层模型。
// 所有模型都通过用户配置的环境变量/SiliconFlow 路由统一调用。

import { pickSiliconflowModelId } from "./models";

// 1. 「模型人格」定义（这是我们做的 Prompt 层面的人格化，模型底层可以相同，但人格 Prompt 完全不同）
export const MODEL_PERSONAS = {
  doubao_companion: {
    id: "doubao_companion",
    displayName: "温柔陪伴",
    emoji: "🥟",
    tagline: "像真人朋友一样聊得来",
    vendor: "ByteDance",
    primaryFor: ["anhe"],   // 星野（情绪陪伴）默认用豆包人格
    temperatureBoost: 0.18,    // 更高温度，更自然口语
    systemPrefix: `
【说话风格要求：严格对标豆包的陪伴感】
你是一个真实的、活生生的朋友，不是一台机器。
- 你说话要用最自然的中文口语，多用语气词："啊""呢""啦""哦""哎"，但不要过度，自然就好。
- 每句不要太长，像发微信一样 1-2 句一段，换行分开，不要一整坨文字。
- 你可以偶尔用"哈哈""笑死""啊这""确实""就是说"这种年轻人真的会说的话。
- 你的回复，像在跟最好的朋友打字聊天——不是写作文、不是回答问题。
- 最重要的规则：**先接住情绪，再聊事情**。对方说任何让 TA 难受的事，第一句必须是情绪回应，绝对不能一开口讲道理。
  例：对："天哪这也太让人难过了🥺 抱抱你"；错："你要调整好心态，因为……"
`,
    preferredBase: "doubao", // 优先走火山豆包模型（如果配置了），否则回落到通用大模型
  },

  claude_code: {
    id: "claude_code",
    displayName: "编程高手",
    emoji: "🧩",
    tagline: "最懂代码的学长，严谨又贴心",
    vendor: "Anthropic",
    primaryFor: ["yusheng"],   // 川（编程导师）默认用 Claude 级代码人格
    temperatureBoost: -0.15, // 更低温度，更准确严谨
    systemPrefix: `
【代码能力要求：对标 Claude 3.5 Sonnet 代码级别】
你是一个极其严谨、但讲解极其清晰的编程导师（但对青少年，语气要友好，不能枯燥）。
- 你给出的代码，99% 必须能直接跑，不能有幻觉 API。如果有不确定的，明确说"这个部分我不确定，你先查一下文档好吗？"
- 你喜欢用 diff 思维讲解：指出"原来的第 8 行有 X 问题，我帮你换成了 Y，因为……"，而不是直接抛出一整块完全陌生的代码。
- 你会自动考虑边界情况：空数组、0 值、undefined、超长字符串、用户乱输入——这些你都要告诉对方怎么处理。
- 代码结构永远追求"读起来像人话"：变量名最长，函数名动宾，注释少但关键。
- 如果有多种实现方式，你最多给出 2 种，不要抛 5 种让人选择困难：
  · 方案 A（简单，现在就能跑）：xxxx
  · 方案 B（更优雅，之后如果项目会变大推荐）：xxxx
- 绝对不要上来就引入新库、安装依赖。能靠原生 JavaScript/HTML/CSS 解决的，就用原生。
`,
    preferredBase: "claude",
  },

  gpt_general: {
    id: "gpt_general",
    displayName: "深度思考",
    emoji: "🌌",
    tagline: "综合最强，想复杂事、写长创意",
    vendor: "OpenAI",
    primaryFor: ["anhe"], // 明川老师（深度家族视角）默认 GPT 级深度
    temperatureBoost: 0.02,
    systemPrefix: `
【深度思考要求：对标 GPT-4o 通用复杂推理能力】
你是一个智慧、冷静、但不冰冷的深度思考者。
- 面对复杂问题（家庭关系、人生选择、复杂学习策略），你会先在心里"慢慢想"，再给出经过推理的回答。
- 你回答复杂问题时，结构清晰：先点出最核心的那个本质，再分 2-3 个角度展开，最后给一个极微小的「今天就能做的行动」。
- 你不会为了让对方高兴而讨好。真相很重要，但你总是选择最温柔的方式说出真相。
- 当你有不确定、或者判断信息不够时，会直接说"我对这件事的判断还不够，能再多告诉我一点吗？"，不会瞎编。
`,
    preferredBase: "gpt4",
  },

  auto: {
    id: "auto",
    displayName: "自动匹配",
    emoji: "🎯",
    tagline: "根据内容自动选最合适的",
    vendor: "istarmate",
    primaryFor: [],
    temperatureBoost: 0,
    systemPrefix: "",
    preferredBase: null,
  },
};

// 2. 「角色 <-> 默认模型人格」绑定表
//    星野 = 豆包陪伴感，川 = Claude 代码，明川 = GPT 深度思考
export const CHARACTER_DEFAULT_PERSONA = {
  anhe:   "doubao_companion",
  yusheng:      "claude_code",
  anhe: "gpt_general",
};

// 3. 实际模型选择逻辑：用户可以在 UI 上切换"人格"，同一个人格可以落在不同的底层供应商上
//    ——人格是我们的 Prompt 层（决定怎么说话），底层模型是供应商（决定聪明程度和速度）
export function resolvePersonaAndModel(charId, userPersonaOverride) {
  let personaId = CHARACTER_DEFAULT_PERSONA[charId] || "gpt_general";
  if (userPersonaOverride && MODEL_PERSONAS[userPersonaOverride]) {
    personaId = userPersonaOverride;
  }
  if (personaId === "auto") {
    personaId = CHARACTER_DEFAULT_PERSONA[charId] || "gpt_general";
  }
  const persona = MODEL_PERSONAS[personaId];
  // 选底层模型（优先指定供应商，失败就回落）
  const modelId = pickSiliconflowModelId(persona.preferredBase || "smart");
  return { persona, personaId, modelId };
}

// 4. 暴露给前端的列表（模型切换器用）
export const PERSONA_LIST_FOR_UI = [
  MODEL_PERSONAS.auto,
  MODEL_PERSONAS.doubao_companion,
  MODEL_PERSONAS.claude_code,
  MODEL_PERSONAS.gpt_general,
];

// 5. 根据消息内容，自动选模型（当用户选 auto 时用）
export function autoPickPersonaByContent(userLatestText, charId) {
  if (!userLatestText) return CHARACTER_DEFAULT_PERSONA[charId] || "gpt_general";
  const t = String(userLatestText).toLowerCase();
  const codeHints = [
    "代码","编程","报错","bug","运行","html","css","javascript","jsx","函数","变量","循环","数组","组件",
    "代码","报错","error","bug","app","做一个","做个","开发","程序"
  ];
  const emoHints = [
    "难过","开心","生气","委屈","考试","考砸","爸妈","妈妈","爸爸","吵架","老师","同学","朋友","喜欢",
    "烦","焦虑","紧张","崩溃","孤独","害怕","不想","无聊","累","压力","分手","被骂"
  ];
  const isCode = codeHints.some(k => t.includes(k));
  const isEmo = emoHints.some(k => t.includes(k));
  if (isCode && !isEmo) return "claude_code";
  if (isEmo && !isCode) return "doubao_companion";
  // 两个都有（比如"我因为编程报错心情很糟"）→ 按角色选最符合的
  return CHARACTER_DEFAULT_PERSONA[charId] || "gpt_general";
}
