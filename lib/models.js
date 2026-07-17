// lib/models.js
// 所有 AI 模型名集中管理。换模型只改这里一处。
//
// ⚠️ 模型名必须和 SiliconFlow 后台完全一致（含前缀），否则调用会报错。
// 后台模型列表：https://cloud.siliconflow.cn/models

export const MODELS = {
  // 星伴心理陪伴 —— 要中文好、有温度、够聪明
  companion: "zai-org/GLM-5",

  // 代码星编程导师 —— 擅长写网页和代码
  code: "zai-org/GLM-4.7",

  // 视觉理解（看图片）—— 暂不升级，够用
  vision: "zai-org/GLM-4.5V",

  // 后台辅助任务（摘要、报告等）—— 用便宜够用的即可
  utility: "Pro/zai-org/GLM-5.1",
};

// 备用模型：主模型超时/报错时自动切换，保证用户不会白等或看到报错。
// 用更稳定、更便宜的模型兜底——回复质量略降，但至少能用。
export const FALLBACK_MODELS = {
  "zai-org/GLM-5": "Pro/zai-org/GLM-5.1",
  "zai-org/GLM-4.7": "Pro/zai-org/GLM-5.1",
  "zai-org/GLM-4.5V": "Pro/zai-org/GLM-5.1",
  "Pro/zai-org/GLM-5.1": "deepseek-ai/DeepSeek-V3",
};

export function getFallback(model) {
  return FALLBACK_MODELS[model] || "Pro/zai-org/GLM-5.1";
}
