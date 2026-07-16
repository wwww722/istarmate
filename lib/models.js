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
