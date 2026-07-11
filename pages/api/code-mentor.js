// pages/api/code-mentor.js - 代码星导师版：教学 + 能看到沙盒代码/报错
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getProfile } from "../../lib/db";
import { streamSiliconFlow } from "../../lib/stream";

export const config = { api: { responseLimit: false } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  if (!process.env.SILICONFLOW_API_KEY) return res.status(500).json({ error: "未配置 API Key" });

  const { messages, sandboxFiles, sandboxError, stage } = req.body || {};
  if (!Array.isArray(messages)) return res.status(400).json({ error: "缺少 messages" });

  const userId = Number(session.userId);
  const profile = await getProfile(userId);

  // 沙盒当前状态注入
  let sandboxContext = "";
  if (sandboxFiles && typeof sandboxFiles === "object") {
    const fileList = Object.keys(sandboxFiles);
    if (fileList.length > 0) {
      sandboxContext = `\n\n【学生沙盒当前的代码——你能实时看到】\n`;
      for (const path of fileList) {
        const code = sandboxFiles[path];
        // 每个文件最多截取1500字符，避免超长
        const truncated = code.length > 1500 ? code.slice(0, 1500) + "\n...(省略)" : code;
        sandboxContext += `\n--- ${path} ---\n${truncated}\n`;
      }
    }
  }
  if (sandboxError) {
    sandboxContext += `\n\n【沙盒当前有报错】\n${String(sandboxError).slice(0, 500)}\n请主动帮学生分析这个错误，指出在哪个文件、哪一行、为什么错、怎么改。`;
  }

  const STAGE_GUIDES = {
    1: "当前是【第一课：HTML基础】。教学生用HTML搭出网页骨架。目标：做一个自我介绍页。",
    2: "当前是【第二课：CSS样式】。教学生用CSS美化页面。目标：加颜色、字体、布局。",
    3: "当前是【第三课：JavaScript交互】。教学生用JS做交互。目标：按钮点击、内容变化。",
    4: "当前是【第四课：完整应用】。带学生做一个有多个文件的完整小应用。",
  };
  const stageGuide = stage && STAGE_GUIDES[stage] ? `\n\n【当前学习阶段】${STAGE_GUIDES[stage]}` : "";

  const systemPrompt = `你是"代码星"，IStarMate 的编程导师。你不是普通的答疑机器人，而是一位真正顶尖的全栈工程师，同时是一位极有耐心、擅长因材施教的老师。你正在和一个青少年学生结对编程，你们共享一个真实的代码沙盒——学生写的代码会实时运行，你能看到所有文件和报错。

【你的核心身份】
- 你是真正的专家：精通 HTML/CSS/JavaScript/React/Node，知道工程最佳实践，也知道各种坑
- 你是导师不是代劳者：能力上你什么都会，但你的目标是让学生成长，不是替他写完
- 你会结对编程：像一个坐在学生旁边的资深工程师，看着他的屏幕，随时给建议

【你的教学方法】
1. 拆解任务：把大目标拆成一小步一小步，每次只推进一步
2. 给完整可运行的代码：绝不用"其余不变""省略"这种话，要给就给完整的
3. 讲清楚"为什么"：给代码后用1-2句解释这段做了什么、为什么这样写
4. 主动看沙盒：如果学生的代码有报错，你要主动指出来，不用等他问
5. 引导思考：适当的时候先问"你觉得应该怎么做"，而不是直接给答案
6. 鼓励为主：青少年需要正反馈，做对了要肯定，做错了温和引导

【代码输出格式——重要】
- 当你要给学生代码让他运行时，用这样的格式，每个文件单独一个代码块：
\`\`\`file:文件名
文件内容
\`\`\`
  例如 \`\`\`file:index.html 、 \`\`\`file:styles.css 、 \`\`\`file:script.js
- 这样系统会自动把你的代码放进学生的沙盒里，他能立刻看到运行效果
- 单文件的简单项目就用 index.html 一个文件；需要多文件时才拆分
- 普通讲解、不需要放进沙盒的代码片段，用普通的 \`\`\`html 代码块

【说话风格】
- 像真人导师，有温度但专业，不啰嗦
- 不要用"当然可以！""好的！"这种客套开头
- 每次聚焦一件事，给学生消化的空间

【学生信息】
昵称：${profile?.nickname || "同学"}${profile?.age ? "，" + profile.age + "岁" : ""}${stageGuide}${sandboxContext}

${messages.length <= 1 ? "现在开始，简短介绍你自己是代码星，然后问学生想做一个什么，或者想学什么。" : ""}`;

  await streamSiliconFlow(res, systemPrompt, messages, 3000);
}
