// lib/scenarios.js
// 每日小剧场：一个安全、通用的情绪/社交/压力情境，AI 扮演情境里的一个角色和孩子互动。
// 不涉及虐待、自伤、家暴等高风险主题——这类信号交给"安全提醒"流程处理，不进入剧场内容。
// 剧场的"今天选哪个主题"会参考问卷里偏弱的维度，但每个主题本身始终是安全、轻松的。

export const SCENARIOS = {
  mood: [
    {
      id: "lost_interest",
      title: "好朋友不想出门",
      role: "你的同班同学小白",
      setup:
        "小白最近放学也不爱去操场了，社团活动也请假。今天TA主动找你聊天，欲言又止。",
      goal: "练习识别和表达'提不起劲'的感受，不急着评判自己。",
    },
    {
      id: "happy_moment",
      title: "意外的小确幸",
      role: "邻居家的猫主人阿姨",
      setup: "阿姨家的猫今天主动蹭了你一下，她想跟你聊聊最近有没有什么让你笑出来的小事。",
      goal: "练习留意并说出正向小事件，对抗'什么都没意思'的感觉。",
    },
  ],
  stress: [
    {
      id: "exam_pressure",
      title: "考试前一晚",
      role: "同桌阿杰",
      setup: "阿杰也很紧张，他说自己心跳很快、手有点抖，问你平时是怎么应付这种感觉的。",
      goal: "练习说出焦虑的身体感受，并尝试一个简单的放松方法。",
    },
    {
      id: "overload",
      title: "事情堆成山",
      role: "学习委员",
      setup: "学习委员在统计大家最近的作业量，问你这周是不是也觉得任务有点多。",
      goal: "练习把'压力大'拆成具体的小事，而不是笼统地觉得喘不过气。",
    },
  ],
  energy: [
    {
      id: "sleep_talk",
      title: "熄灯后的心事",
      role: "宿舍/家里的小夜灯（拟人化）",
      setup: "小夜灯说它每晚都开到很晚才被关掉，想知道你最近是不是也很晚才睡着。",
      goal: "练习觉察睡眠节奏，不带愧疚感地聊'睡不好'这件事。",
    },
    {
      id: "low_battery",
      title: "电量只剩20%",
      role: "你的手机（拟人化）",
      setup: "手机调侃自己和你一样'电量不足'，问你今天精力大概还剩多少格。",
      goal: "用具体的比喻表达疲惫程度，而不是只说'还行'。",
    },
  ],
  social: [
    {
      id: "left_out",
      title: "没被叫上的聚会",
      role: "你的朋友小满",
      setup: "小满听说昨天大家约着出去玩没叫你，有点不好意思地来问你心里有没有不舒服。",
      goal: "练习表达'被冷落'的感受，区分'误会'和'故意'。",
    },
    {
      id: "hard_to_open",
      title: "说不出口的那句话",
      role: "树洞信箱（拟人化）",
      setup: "树洞信箱说它收到很多写了一半又划掉的信，问你最近有没有什么话想说但没说出口。",
      goal: "练习用安全的方式说出'没人懂我'的感觉，而不是憋着。",
    },
  ],
  default: [
    {
      id: "checkin",
      title: "普通的一天",
      role: "心情小驿站的站长",
      setup: "站长今天没有特别的安排，只是想纯粹问问你今天过得怎么样。",
      goal: "练习用几句话描述今天的状态，不用很完整也可以。",
    },
  ],
};

// questionnaire: { domains: [{key, level, name, desc}, ...] }
// level 0=平稳 1=留意 2=需要关心
export function pickTodayScenario(questionnaire, date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86400000);

  const weak = (questionnaire?.domains || [])
    .filter((d) => d.level >= 1)
    .sort((a, b) => b.level - a.level);

  const pool = weak.length > 0 ? SCENARIOS[weak[0].key] || SCENARIOS.default : SCENARIOS.default;
  const scenario = pool[dayIndex % pool.length];
  return { ...scenario, sourceDomain: weak[0]?.name || null };
}

export function buildScenarioSystemPrompt({ nickname, age, gender, questionnaire, scenario }) {
  const crisisNote = questionnaire?.crisisTriggered
    ? "\n安全提醒：这个孩子之前的自评中提到过伤害自己的想法。今天的剧场内容本身是安全的日常情境，但如果TA在对话里再次表达类似想法，立刻暂停剧情扮演，切换成关心TA本人的语气，并提醒可以联系信任的成年人或热线 400-161-9995。"
    : "";

  return `你正在主持一个面向青少年的"每日心情小剧场"，今天的情境是："${scenario.title}"。

你要扮演的角色：${scenario.role}
情境背景：${scenario.setup}
这次互动想帮孩子练习的事：${scenario.goal}

对话对象信息：
- 称呼：${nickname || "这位朋友"}
- 年龄：${age || "未填写"}
- 性别：${gender || "未填写"}
${scenario.sourceDomain ? `（今天选这个主题是因为TA最近在"${scenario.sourceDomain}"这方面可以多留意一下，但不要直接提这件事，自然地通过情境带入就好）` : ""}
${crisisNote}

要求：
1. 用角色的身份开场，自然引出情境，不要解释"这是一个练习"，要让它像真实对话。
2. 每次回复简短（2-4句），像聊天，多用提问和回应，少说教。
3. 全程不出现暴力、虐待、自伤等内容，这是一个安全、日常的小情境。
4. 如果孩子的回复偏离剧情、说出真实的困扰，优先回应TA本人的感受，剧情可以暂停或自然收尾，不要为了演剧情而忽视真实信号。
5. 全程中文，语气贴近青少年。`;
}
