export interface ModelConfig {
  id: string;
  name: string;
  platform: string;
  baseUrl: string;
  model: string;
  description: string;
  capabilities: string[];
  isFree: boolean;
  freeInfo?: string;
  category: "chat" | "code" | "vision" | "reasoning";
}

export const PLATFORMS = {
  siliconflow: {
    name: "硅基流动",
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKeyEnv: "SILICONFLOW_API_KEY",
    logo: "💎",
    color: "#6366f1",
  },
  zhipu: {
    name: "智谱AI",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    logo: "🧠",
    color: "#10b981",
  },
  ali: {
    name: "阿里云百炼",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "ALIYUN_API_KEY",
    logo: "☁️",
    color: "#ff6a00",
  },
  volcengine: {
    name: "火山引擎",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKeyEnv: "VOLCENGINE_API_KEY",
    logo: "🌋",
    color: "#0066ff",
  },
  baidu: {
    name: "百度千帆",
    baseUrl: "https://qianfan.baidubce.com/v2",
    apiKeyEnv: "BAIDU_API_KEY",
    logo: "🔍",
    color: "#2932e1",
  },
  moonshot: {
    name: "月之暗面",
    baseUrl: "https://api.moonshot.cn/v1",
    apiKeyEnv: "MOONSHOT_API_KEY",
    logo: "🌙",
    color: "#7c3aed",
  },
  deepseek: {
    name: "深度求索",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    logo: "🔬",
    color: "#06b6d4",
  },
};

export const MODELS: ModelConfig[] = [
  {
    id: "siliconflow-glm5",
    name: "GLM-5",
    platform: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    description: "智谱最新旗舰模型，中文理解强，适合星伴心理陪伴",
    capabilities: ["中文", "情感理解", "长文本"],
    isFree: true,
    freeInfo: "9B以下永久免费",
    category: "chat",
  },
  {
    id: "siliconflow-qwen25",
    name: "Qwen2.5-7B",
    platform: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-7B-Instruct",
    description: "通义千问开源模型，中文能力强",
    capabilities: ["中文", "代码", "推理"],
    isFree: true,
    freeInfo: "永久免费",
    category: "chat",
  },
  {
    id: "siliconflow-deepseek",
    name: "DeepSeek-R1",
    platform: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-R1-Distill-Llama-8B",
    description: "推理能力极强，数学和逻辑问题首选",
    capabilities: ["推理", "数学", "逻辑"],
    isFree: true,
    freeInfo: "永久免费",
    category: "reasoning",
  },
  {
    id: "siliconflow-glm47",
    name: "GLM-4.7",
    platform: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    description: "擅长编程和代码生成，适合代码星",
    capabilities: ["代码", "编程", "中文"],
    isFree: true,
    freeInfo: "9B以下永久免费",
    category: "code",
  },
  {
    id: "siliconflow-glm45v",
    name: "GLM-4.5V",
    platform: "siliconflow",
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "Qwen/Qwen2.5-VL-72B-Instruct",
    description: "多模态视觉模型，支持图片理解",
    capabilities: ["图片", "多模态", "视觉"],
    isFree: true,
    freeInfo: "9B以下永久免费",
    category: "vision",
  },
  {
    id: "zhipu-glm4flash",
    name: "GLM-4-Flash",
    platform: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-flash",
    description: "智谱永久免费模型，128K超长上下文",
    capabilities: ["中文", "长文本", "代码"],
    isFree: true,
    freeInfo: "永久免费",
    category: "chat",
  },
  {
    id: "zhipu-glm47flash",
    name: "GLM-4.7-Flash",
    platform: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    model: "glm-4-7b-chat",
    description: "编程能力强，200K上下文",
    capabilities: ["代码", "长文本", "推理"],
    isFree: true,
    freeInfo: "永久免费",
    category: "code",
  },
  {
    id: "ali-qwenplus",
    name: "Qwen-Plus",
    platform: "ali",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    description: "通义千问旗舰模型，综合能力强",
    capabilities: ["中文", "代码", "长文本"],
    isFree: false,
    freeInfo: "新用户免费额度",
    category: "chat",
  },
  {
    id: "ali-qwenturbo",
    name: "Qwen-Turbo",
    platform: "ali",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-turbo",
    description: "快速响应模型，性价比高",
    capabilities: ["中文", "快速", "日常对话"],
    isFree: false,
    freeInfo: "100万token/天免费",
    category: "chat",
  },
  {
    id: "volcengine-doubao",
    name: "豆包",
    platform: "volcengine",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    model: "doubao-lite-4k",
    description: "字节跳动豆包模型，每日免费额度高",
    capabilities: ["中文", "多模态", "快速"],
    isFree: true,
    freeInfo: "每天200万token",
    category: "chat",
  },
  {
    id: "baidu-ernie",
    name: "ERNIE-3.5",
    platform: "baidu",
    baseUrl: "https://qianfan.baidubce.com/v2",
    model: "ERNIE-3.5-8K",
    description: "百度文心一言，永久免费不限量",
    capabilities: ["中文", "合规", "知识库"],
    isFree: true,
    freeInfo: "永久免费不限量",
    category: "chat",
  },
  {
    id: "moonshot-kimi",
    name: "Kimi-K2.5",
    platform: "moonshot",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-32k",
    description: "长文档处理王者，256K超长上下文",
    capabilities: ["长文本", "文档", "PDF"],
    isFree: false,
    freeInfo: "新用户500万token",
    category: "chat",
  },
  {
    id: "deepseek-chat",
    name: "DeepSeek-Chat",
    platform: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    description: "深度求索对话模型，推理能力强",
    capabilities: ["推理", "数学", "代码"],
    isFree: false,
    freeInfo: "新用户100万token",
    category: "reasoning",
  },
];

export function getModelById(id: string): ModelConfig | undefined {
  return MODELS.find(m => m.id === id);
}

export function getModelsByCategory(category: ModelConfig["category"]): ModelConfig[] {
  return MODELS.filter(m => m.category === category);
}

export function getModelsByPlatform(platform: string): ModelConfig[] {
  return MODELS.filter(m => m.platform === platform);
}

export function getAvailableModels(): ModelConfig[] {
  return MODELS;
}

export function getDefaultModel(useCase: "companion" | "code"): ModelConfig {
  if (useCase === "code") {
    return MODELS.find(m => m.id === "siliconflow-glm47") || MODELS[3];
  }
  return MODELS.find(m => m.id === "siliconflow-glm5") || MODELS[0];
}