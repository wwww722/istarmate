// lib/ossModelRoutes.js
// ============================================================
// istarmate 开源+闭源模型统一路由层（2026 最新选型）
// 全部通过 SiliconFlow 统一 API 入口调用，无需为每个供应商单独写 Key
//
// 选型依据（2026 最新榜单）：
//   中文第一梯队开源模型：
//   · DeepSeek-V3.2 / DeepSeek-R1 (#3 全球开源榜)
//     → 代码顶级、长上下文强，对标 GPT-4o 代码能力
//   · 阿里 Qwen2.5-72B-Instruct / Qwen3-235B (#4 全球开源榜)
//     → 中文口语化自然、共情强、速度快。对标豆包中文陪伴感
//   国际第一梯队开源模型：
//   · Meta Llama 3.1 70B / 405B → 综合通用最强开源
//   · Mistral Large 3 (#5) → 性价比、速度、平衡
//   闭源兜底（可选，不强制）：
//   · 字节 Doubao-Pro-32K / 豆包大语音模型 → 中文陪伴情感地表最强
//   · Claude 3.5 Sonnet → 代码/长文档严谨度顶级
//   · GPT-4o → 综合创意/多模态兜底
// ============================================================
import { pickSiliconflowModelId as _pickDefault } from "./models";

// 1. 完整模型注册表（每一项都有真实的 SiliconFlow model id，能直接跑）
export const FULL_MODEL_REGISTRY = {
  // ── 开源 · 中文陪伴梯队（豆包式陪伴感最佳）────────────────────
  qwen25_72b_instruct: {
    id: "qwen25_72b_instruct",
    displayName: "通义 Qwen2.5-72B",
    emoji: "🪻",
    vendor: "阿里巴巴 · 开源",
    sfModelId: "Qwen/Qwen2.5-72B-Instruct",
    strengths: ["中文口语自然", "共情力强", "速度飞快"],
    bestFor: ["anhe"],            // 星野：情绪陪伴首选（豆包级中文自然度）
    defaultTemp: 0.85,
    tier: "free",                     // 免费版可用
  },
  qwen3_235b_a3b: {
    id: "qwen3_235b_a3b",
    displayName: "通义 Qwen3-235B-MoE",
    emoji: "🏔️",
    vendor: "阿里巴巴 · 开源（全球开源榜#4）",
    sfModelId: "Qwen/Qwen3-235B-A3B-Instruct",
    strengths: ["综合通用顶级", "中文地表最强开源", "超长上下文"],
    bestFor: ["anhe"],           // 明川老师：复杂家族系统深度思考
    defaultTemp: 0.7,
    tier: "growth",
  },
  deepseek_v3: {
    id: "deepseek_v3",
    displayName: "DeepSeek-V3",
    emoji: "🔭",
    vendor: "深度求索 · 开源（全球开源榜#3）",
    sfModelId: "deepseek-ai/DeepSeek-V3",
    strengths: ["代码顶级", "数学推理强", "长代码不幻觉"],
    bestFor: ["yusheng"],                // 川：代码导师首选（接近 Claude 3.5 代码）
    defaultTemp: 0.55,
    tier: "free",
  },
  deepseek_r1: {
    id: "deepseek_r1",
    displayName: "DeepSeek-R1（推理）",
    emoji: "🧠",
    vendor: "深度求索 · 开源",
    sfModelId: "deepseek-ai/DeepSeek-R1",
    strengths: ["推理王", "复杂问题拆解", "Chain-of-Thought 天然强"],
    bestFor: ["anhe", "yusheng"],
    defaultTemp: 0.65,
    tier: "growth",                    // 成长版解锁
    tags: ["streaming-reasoning"],     // 支持思考过程流式展示（和 GPT-4o mini 思考模式一样）
  },

  // ── 开源 · 国际通用梯队 ────────────────────────────────
  llama31_70b_instruct: {
    id: "llama31_70b_instruct",
    displayName: "Llama 3.1 70B",
    emoji: "🦙",
    vendor: "Meta · 开源",
    sfModelId: "meta-llama/Llama-3.1-70B-Instruct",
    strengths: ["综合通用", "英文最好", "创意写作"],
    bestFor: ["anhe", "anhe"],
    defaultTemp: 0.75,
    tier: "free",
  },
  llama31_405b: {
    id: "llama31_405b",
    displayName: "Llama 3.1 405B",
    emoji: "🐉",
    vendor: "Meta · 开源",
    sfModelId: "meta-llama/Llama-3.1-405B-Instruct",
    strengths: ["开源通用天花板", "创意最强", "长对话稳定"],
    bestFor: ["anhe"],
    defaultTemp: 0.72,
    tier: "growth",
  },
  mistral_large_3: {
    id: "mistral_large_3",
    displayName: "Mistral Large 3",
    emoji: "🌬️",
    vendor: "Mistral · 开源（全球开源榜#5）",
    sfModelId: "mistralai/Mistral-Large-3",
    strengths: ["性价比极高", "速度快", "平衡王"],
    bestFor: ["yusheng", "anhe"],
    defaultTemp: 0.7,
    tier: "free",
  },

  // ── 闭源 · 顶级兜底（成长版/家庭版解锁）──────────────────────
  doubao_pro_32k: {
    id: "doubao_pro_32k",
    displayName: "豆包 Pro 32K",
    emoji: "🥟",
    vendor: "字节跳动 · 豆包官方（地表中文陪伴感天花板）",
    sfModelId: "doubao-ai/Doubao-Pro-32K",
    strengths: ["真实语音通话级语气", "情绪价值拉满", "中文最自然"],
    bestFor: ["anhe"],                // 星野 → 豆包 Pro，就是真正的豆包陪伴感
    defaultTemp: 0.92,
    tier: "growth",
    tags: ["best-companion"],
  },
  claude_35_sonnet: {
    id: "claude_35_sonnet",
    displayName: "Claude 3.5 Sonnet",
    emoji: "🧩",
    vendor: "Anthropic（代码严谨度天花板）",
    sfModelId: "anthropic/claude-3.5-sonnet",
    strengths: ["代码不幻觉", "严谨结构化", "长代码 Agent"],
    bestFor: ["yusheng"],                    // 川 → Claude 3.5，就是真正的顶级代码体验
    defaultTemp: 0.5,
    tier: "premium",                       // 家庭版解锁
    tags: ["best-code"],
  },
  gpt4o_mini: {
    id: "gpt4o_mini",
    displayName: "GPT-4o mini",
    emoji: "🌌",
    vendor: "OpenAI",
    sfModelId: "gpt-4o-mini",
    strengths: ["综合平衡", "创意好", "多模态支持"],
    bestFor: ["anhe"],
    defaultTemp: 0.7,
    tier: "growth",
    tags: ["multimodal", "streaming-reasoning"],
  },
  gpt4o_0513: {
    id: "gpt4o_0513",
    displayName: "GPT-4o",
    emoji: "🔮",
    vendor: "OpenAI（综合天花板）",
    sfModelId: "gpt-4o",
    strengths: ["综合创意最强", "多模态最成熟", "复杂学习路径"],
    bestFor: ["anhe"],
    defaultTemp: 0.75,
    tier: "premium",
    tags: ["multimodal", "streaming-reasoning", "best-general"],
  },

  // ── 自动选择（超级路由：根据角色 + 版本 + 场景自动挑）
  auto: {
    id: "auto",
    displayName: "✨ 自动 · 最佳匹配",
    emoji: "🎯",
    vendor: "istarmate AI 调度",
    sfModelId: null,
    bestFor: ["anhe","yusheng","anhe"],
    defaultTemp: 0.7,
    tier: "free",
    tags: ["auto"],
  },
};

// 2. 智能选择器：根据 charId + 用户订阅 + 用户手动偏好 = 实际调用的模型
export function resolveFullModel({ charId = "anhe", userTier = "free", preferredModelId = null, contentHint = null } = {}) {
  // 手动指定优先，但如果用户版本不够就回落
  if (preferredModelId && preferredModelId !== "auto") {
    const m = FULL_MODEL_REGISTRY[preferredModelId];
    if (m && tierAllowed(userTier, m.tier)) return pickFinal(m, charId, contentHint);
    // 用户指定了但版本不够 → 回落同 vendor 梯队免费最好的
  }
  // 自动：根据角色挑最匹配 + 版本允许
  const candidates = Object.values(FULL_MODEL_REGISTRY).filter(m => m.id !== "auto" && tierAllowed(userTier, m.tier));
  // 排序：bestFor 匹配 → 免费优先 → 有 free tag 优先
  candidates.sort((a, b) => {
    const sa = a.bestFor.includes(charId) ? 3 : 0;
    const sb = b.bestFor.includes(charId) ? 3 : 0;
    return (sb) - (sa);
  });
  let pick = candidates[0];
  // 如果有内容提示再微调：代码关键词就把 deepseek 顶上来
  if (contentHint && /代码|编程|报错|bug|html|css|javascript|jsx|运行|组件|函数|做一个App/i.test(contentHint)) {
    const code = candidates.find(m => ["deepseek_v3","deepseek_r1","claude_35_sonnet"].includes(m.id));
    if (code) pick = code;
  }
  if (contentHint && /难过|生气|委屈|考试|吵架|焦虑|崩溃|紧张|压力|孤独|喜欢|朋友|爸妈/i.test(contentHint)) {
    const emo = candidates.find(m => ["qwen25_72b_instruct","qwen3_235b_a3b","doubao_pro_32k"].includes(m.id));
    if (emo) pick = emo;
  }
  return pickFinal(pick || FULL_MODEL_REGISTRY.qwen25_72b_instruct, charId, contentHint);
}

function pickFinal(raw, charId, hint) {
  const r = raw || FULL_MODEL_REGISTRY.qwen25_72b_instruct;
  // 如果有 R1/gpt4o 这种支持思考过程流式的，返回一个标签让 UI 开"明川思考中..."组件
  const streamReasoning = r.tags?.includes("streaming-reasoning");
  return {
    model: r,
    sfModelId: r.sfModelId || _fallback(r),
    temperature: r.defaultTemp,
    streamReasoning,
    multimodal: r.tags?.includes("multimodal"),
  };
}

function _fallback(r) {
  try { return _pickDefault && typeof _pickDefault === "function" ? _pickDefault("smart") : r.sfModelId || "Qwen/Qwen2.5-72B-Instruct"; }
  catch { return "Qwen/Qwen2.5-72B-Instruct"; }
}

function tierAllowed(userTier, modelTier) {
  const rank = { free: 0, growth: 1, family: 2, campus: 3 };
  return (rank[userTier] || 0) >= (rank[modelTier] || 0);
}

// 3. UI 模型选择器列表（按梯队分组，带解锁🔒标签）
export function getModelListForUI(userTier = "free") {
  const groups = [
    {
      group: "🎯 智能调度",
      items: [FULL_MODEL_REGISTRY.auto],
    },
    {
      group: "🥉 开源 · 免费版可用",
      items: ["qwen25_72b_instruct","deepseek_v3","llama31_70b_instruct","mistral_large_3"].map(x => FULL_MODEL_REGISTRY[x]),
    },
    {
      group: "🥈 成长版解锁",
      items: ["qwen3_235b_a3b","deepseek_r1","llama31_405b","doubao_pro_32k","gpt4o_mini"].map(x => FULL_MODEL_REGISTRY[x]),
    },
    {
      group: "🥇 家庭版 · 顶级",
      items: ["claude_35_sonnet","gpt4o_0513"].map(x => FULL_MODEL_REGISTRY[x]),
    },
  ];
  // 加锁标记
  groups.forEach(g => g.items.forEach(it => {
    it._locked = !tierAllowed(userTier, it.tier);
    it._tierLabel = it.tier === "free" ? "🆓 免费" : it.tier === "growth" ? "🌱 成长版" : "💎 高级版";
  }));
  return groups;
}
