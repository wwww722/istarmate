// lib/models.js
// 所有 AI 模型名集中管理。换模型只改这里一处。
//
// ⚠️ 模型名必须和 SiliconFlow 后台完全一致（含前缀），否则调用会报错。
// 后台模型列表：https://cloud.siliconflow.cn/models

export const MODELS = {
  // 许安和心理陪伴 —— 中文好、有温度。DeepSeek-V3 官方示例默认模型，最稳
  companion: "deepseek-ai/DeepSeek-V3",

  // 余生编程导师 —— 擅长写网页和代码
  code: "deepseek-ai/DeepSeek-V3",

  // 视觉理解（看图片）
  vision: "Qwen/Qwen2.5-VL-72B-Instruct",

  // 后台辅助任务（摘要、报告等）—— 便宜够用
  utility: "Qwen/Qwen2.5-7B-Instruct",
};

// 备用模型：主模型超时/报错时自动切换。用免费稳定的兜底。
export const FALLBACK_MODELS = {
  "deepseek-ai/DeepSeek-V3": "Qwen/Qwen2.5-7B-Instruct",
  "Qwen/Qwen2.5-VL-72B-Instruct": "Qwen/Qwen2.5-7B-Instruct",
  "Qwen/Qwen2.5-7B-Instruct": "Qwen/Qwen2-7B-Instruct",
};

export function getFallback(model) {
  return FALLBACK_MODELS[model] || "Qwen/Qwen2.5-7B-Instruct";
}

// ===== Trae 升级版所需的辅助函数 =====

// 根据用途提示，挑一个 SiliconFlow 模型 id
// hint: "code"（编程）| "smart"（深度）| "companion"（陪伴）| "fast"（快速）
export function pickSiliconflowModelId(hint = "smart") {
  switch (hint) {
    case "code": return MODELS.code;
    case "companion": return MODELS.companion;
    case "smart": return MODELS.companion;   // 深度对话也用最强的
    case "fast": return MODELS.utility;
    default: return MODELS.companion;
  }
}

// SiliconFlow API Key（从环境变量读）
export function sfApiKey() {
  return process.env.SILICONFLOW_API_KEY || "";
}

// 是否使用 SiliconFlow（有 key 就用）
export function shouldUseSiliconflow() {
  return !!process.env.SILICONFLOW_API_KEY;
}
