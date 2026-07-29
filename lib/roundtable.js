// lib/roundtable.js
// B 方案：主持人机制圆桌。默认一个主持人陪聊，聊到跨界了，主持人才主动问
// "要不要叫另一个过来"。合并 A 方案的严格分工规则。
// 分类用前端关键词粗判——不调模型，快、省、免费。

const CODE_WORDS = [
  "代码", "报错", "bug", "error", "运行", "函数", "变量", "组件", "react", "python",
  "html", "css", "js", "javascript", "编程", "项目", "app", "网页", "程序", "调试",
  "debug", "编译", "语法", "循环", "数组", "对象", "接口", "api", "部署", "写个", "做个网站",
  "typeerror", "报错了", "跑不起来", "怎么写", "实现", "键盘", "写代码",
];

const EMOTION_WORDS = [
  "妈妈", "爸爸", "父母", "家里", "同学", "朋友", "老师", "吵架", "冷战", "难过", "难受",
  "烦", "累", "压力", "焦虑", "害怕", "孤独", "委屈", "崩溃", "想哭", "哭", "生气", "讨厌",
  "不开心", "心情", "情绪", "考试", "考砸", "成绩", "没人懂", "撑不住", "放弃", "自己",
  "喜欢", "暗恋", "失落", "迷茫", "睡不好", "不想", "为什么我", "心态", "崩了",
];

// 单条消息分类：'emotion' | 'code' | 'mixed' | 'pure'
export function classifyTopic(text) {
  if (!text) return "pure";
  const t = String(text).toLowerCase();
  const hasCode = CODE_WORDS.some(w => t.includes(w));
  const hasEmotion = EMOTION_WORDS.some(w => t.includes(w));
  if (hasCode && hasEmotion) return "mixed";
  if (hasCode) return "code";
  if (hasEmotion) return "emotion";
  return "pure";
}

// 主持人主职责映射
export const HOST_DUTY = { anhe: "emotion", yusheng: "code" };

// ===== 核心规则1：判断主持人是否该开口问"要不要叫另一个过来" =====
// 只有当最近3轮里 ≥2轮 category 和主持人主职责相反时，才问。
// categories: 最近若干轮的分类数组（新的在后），host: 'anhe'|'yusheng'
export function shouldInvite(categories, host) {
  const recent = categories.slice(-3);
  if (recent.length < 3) return false; // 不满3轮不问
  const duty = HOST_DUTY[host];
  const opposite = duty === "emotion" ? "code" : "emotion";
  // mixed 也算"跨界"（含对方职责）
  const crossCount = recent.filter(c => c === opposite || c === "mixed").length;
  return crossCount >= 2;
}

// ===== 核心规则2：主持人询问话术（4句选1，卡死，不许自由发挥）=====
const ASK_SCRIPTS = {
  // 许安和主持，检测到用户连续聊代码 → 问余生
  anhe: [
    "这件事要改代码的部分，我叫余生也过来一起看好不好？他比我懂 🤍",
    "要不我喊余生过来？他改 bug 有绝招，比我讲得清楚",
    "你想不想让余生也加入我们？他对项目这块更专业",
    "需要叫余生过来帮你看代码吗？我帮你喊他",
  ],
  // 余生主持，检测到用户连续聊情绪 → 问许安和
  yusheng: [
    "我看你改了这么多次都有点累了，要不要喊许安和过来陪你聊两分钟再继续？",
    "你心态有点崩我懂，要不让许安和过来跟你说两句话？她特别会聊天 💙",
    "要喊安和过来吗？她比我会安慰人，我先歇会儿",
    "代码先放一放 5 分钟也行，我叫许安和过来陪你一下？",
  ],
};

export function pickAskScript(host) {
  const arr = ASK_SCRIPTS[host] || ASK_SCRIPTS.anhe;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== 核心规则3：被叫过来的人打招呼话术（4句选1，卡死）=====
const GREETING_SCRIPTS = {
  // 余生被许安和叫过来
  yusheng: [
    "嗨我来了！安和刚才说的我都同意，我们现在来看代码 💙",
    "收到收到！安和已经帮你把心态稳住了对吧？那我们直接上手改",
    "来啦来啦～你那个 bug 安和刚才跟我讲了，我有 3 个办法，一个个试",
    "我到了！先夸你一句，遇到卡壳没放弃，真的很棒 💪",
  ],
  // 许安和被余生叫过来
  anhe: [
    "嗨我在这儿，余生说你改了好多次有点累，要不要先深呼吸 3 次？🤍",
    "我来了～先不说代码，我先听你说说，你现在是烦 bug 还是烦自己没改出来？",
    "我来了，余生说你特别有耐心改了 10 次，我听了都觉得你很棒",
    "好呀我来了，要不要先把电脑盖合上 1 分钟？我们说点别的先",
  ],
};

export function pickGreetingScript(joiningChar) {
  const arr = GREETING_SCRIPTS[joiningChar] || GREETING_SCRIPTS.yusheng;
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== 退出圆桌话术 =====
export function exitScript(leavingChar) {
  return leavingChar === "anhe"
    ? "好呀，我先去忙啦，有需要随时喊我～🤍"
    : "好呀，我先去忙啦，有需要随时喊我～💙";
}

// ===== 拒绝邀请后主持人的回应 =====
export function declineScript(host) {
  return host === "anhe" ? "好呀～那我们继续 🤍" : "好呀～那我们继续 💙";
}

// ===== 圆桌分工（合并 A 方案规则）=====
// 圆桌模式下，每条用户消息按话题决定谁主说、谁补一句
export function roundtableRoles(topic) {
  switch (topic) {
    case "emotion":
      return { main: "anhe", support: "yusheng", supportSpeaks: true, mixed: false };
    case "code":
      return { main: "yusheng", support: "anhe", supportSpeaks: true, mixed: false };
    case "mixed":
      return { main: "anhe", support: "yusheng", supportSpeaks: true, mixed: true };
    default: // pure：两人都在，但只主持人主说，另一个不硬插
      return { main: null, support: null, supportSpeaks: false, mixed: false };
  }
}

// "补一句"角色的指令（严格限制，绝不跨界）
export function supportInstruction(supportChar) {
  if (supportChar === "yusheng") {
    return `\n\n【圆桌模式·你是旁听者】用户这次聊的是情绪/心事，主要由许安和来接。你只说1-2句温暖的鼓励，站在TA这边，绝对不提任何代码、技术、项目建议。说完就好，别抢话。`;
  }
  return `\n\n【圆桌模式·你是旁听者】用户这次聊的是代码/学习，主要由余生来带。你只说1-2句温柔的安慰或肯定（比如夸TA有耐心、没放弃），绝对不提任何具体代码、技术建议。说完就好。`;
}

// mixed 话题，余生接许安和的话
export function relayInstruction() {
  return `\n\n【圆桌模式·接力环节】许安和刚才已经帮用户处理了情绪。请先用一句话接住许安和的话（比如"对，安和说得对…"），然后再开始讲代码/技术/具体怎么做。不要重复情绪安慰，把情绪交给许安和，你专注帮TA把事情做出来。`;
}
