// lib/scenarios.js
// 每日小剧场：固定文本内容，分多步推进（场景 -> 用户选择 -> 下一步场景 -> ... -> 结尾）。
// 不接AI，纯内容驱动。后续接AI聊天时，可以把当天的 scenario 当作"今日话题背景"传给AI。
//
// 数据结构：
// steps[i] = { setup: "这一步的情境/台词", options: [{id, text, leadsTo}] }
// 最后一步没有 options，只有 closing 文本，作为剧场结束语。

export const SCENARIOS = {
  mood: [
    {
      id: "lost_interest",
      title: "好朋友不想出门",
      role: "同班同学 · 小白",
      steps: [
        {
          setup: "小白最近放学也不爱去操场了，社团活动也请假。今天TA主动找你聊天，欲言又止地说：\n“最近好像啥都没意思……”",
          options: [
            { id: "a", text: "“我也有过这种感觉，想聊聊吗？”" },
            { id: "b", text: "“别想太多啦，出去走走就好了！”" },
            { id: "c", text: "安静地陪TA坐一会儿，不说话。" },
          ],
        },
        {
          setup: "小白沉默了几秒，低声说：\n“其实……我最近老是睡不好，白天也没精神，连喜欢的游戏都不想打开了。”",
          options: [
            { id: "a", text: "“这种状态持续多久了？”" },
            { id: "b", text: "“要不要找老师或家人聊聊？”" },
            { id: "c", text: "“我陪你一起想办法，别一个人扛着。”" },
          ],
        },
        {
          setup: null,
          closing:
            "小白看着你，慢慢说：\n“谢谢你愿意听我说这些，我感觉好一点了。”\n\n（今天的小剧场结束。提不起兴趣、睡不好持续超过两周，是值得认真关注的信号——无论是别人还是自己出现这种情况，都可以找信任的大人聊聊。）",
        },
      ],
    },
  ],
  stress: [
    {
      id: "exam_pressure",
      title: "考试前一晚",
      role: "同桌 · 阿杰",
      steps: [
        {
          setup: "阿杰也很紧张，他说自己心跳很快、手有点抖：\n“你平时是怎么应付这种感觉的？”",
          options: [
            { id: "a", text: "“我会做几个深呼吸，吸4秒呼6秒。”" },
            { id: "b", text: "“我也很紧张，咱俩一起紧张吧。”" },
          ],
        },
        {
          setup: "阿杰试着跟你一起呼吸了几次，看起来平静了一点，又问：\n“那如果明天真的考砸了怎么办？我光想这个就更慌了。”",
          options: [
            { id: "a", text: "“一次考试不能定义我们，尽力就好。”" },
            { id: "b", text: "“那我们现在就别想明天，先把今晚过好。”" },
          ],
        },
        {
          setup: null,
          closing:
            "阿杰长舒一口气：\n“说完这些，好像没那么喘不过气了，谢谢你。”\n\n（今天的小剧场结束。考前紧张很常见，找一个能说出来的人，本身就是在给自己减压。）",
        },
      ],
    },
  ],
  energy: [
    {
      id: "sleep_talk",
      title: "熄灯后的心事",
      role: "床头的小夜灯（拟人化）",
      steps: [
        {
          setup: "小夜灯说：\n“我每晚都开到很晚才被关掉，你最近是不是也很晚才睡着？”",
          options: [
            { id: "a", text: "“嗯，脑子里事情太多，静不下来。”" },
            { id: "b", text: "“还好，就是有点累。”" },
          ],
        },
        {
          setup: "小夜灯轻轻闪了一下：\n“那白天会不会也觉得特别没精神，提不起劲做事？”",
          options: [
            { id: "a", text: "“是的，上课都容易犯困。”" },
            { id: "b", text: "“偶尔吧，还能撑住。”" },
          ],
        },
        {
          setup: null,
          closing:
            "小夜灯说：\n“今晚试着早一点把我关掉吧，把没做完的事留给明天。”\n\n（今天的小剧场结束。如果睡不好、没精神持续了挺久，记得跟家人或校医提一下，身体的信号值得被认真对待。）",
        },
      ],
    },
  ],
  social: [
    {
      id: "left_out",
      title: "没被叫上的聚会",
      role: "朋友 · 小满",
      steps: [
        {
          setup: "小满有点不好意思地说：\n“听说昨天大家约着出去玩没叫你，你心里有没有不舒服？”",
          options: [
            { id: "a", text: "“说实话，有一点点。”" },
            { id: "b", text: "“没事没事，不重要。”" },
          ],
        },
        {
          setup: "小满认真地看着你：\n“那如果以后这种事再发生，你希望我们怎么做？”",
          options: [
            { id: "a", text: "“提前问我一下就好，哪怕我去不了。”" },
            { id: "b", text: "“其实我也说不清，但谢谢你问我。”" },
          ],
        },
        {
          setup: null,
          closing:
            "小满笑了笑：\n“好，我记下了。下次一定提前问你。”\n\n（今天的小剧场结束。被忽略的感觉值得被说出来，说出来本身就是在维护一段关系。）",
        },
      ],
    },
  ],
  default: [
    {
      id: "checkin",
      title: "普通的一天",
      role: "IStarMate站长",
      steps: [
        {
          setup: "站长今天没有特别的安排，只是想问问：\n“今天过得怎么样？”",
          options: [
            { id: "a", text: "“挺好的，没什么特别的事。”" },
            { id: "b", text: "“一般，有点小烦躁。”" },
          ],
        },
        {
          setup: "站长点点头：\n“那有没有什么事，是今天让你印象比较深的，不管好的还是不好的？”",
          options: [
            { id: "a", text: "说一件印象深的小事。" },
            { id: "b", text: "“好像没什么特别的。”" },
          ],
        },
        {
          setup: null,
          closing: "站长说：\n“谢谢你今天愿意来聊几句，明天我们再接着聊。”\n\n（今天的小剧场结束。）",
        },
      ],
    },
  ],
};

// questionnaire.domains: [{key, name, level, desc}], level 0平稳 1留意 2需要关心
export function pickTodayScenario(questionnaire, dateStr) {
  const dayIndex = Math.floor(new Date(dateStr).getTime() / 86400000);
  const weak = (questionnaire?.domains || [])
    .filter((d) => d.level >= 1)
    .sort((a, b) => b.level - a.level);

  const domainKey = weak[0]?.key;
  const pool = (domainKey && SCENARIOS[domainKey]) || SCENARIOS.default;
  const scenario = pool[dayIndex % pool.length];
  return { ...scenario, sourceDomain: weak[0]?.name || null };
}

export function todayDateStr(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

// ===== Trae 升级版 chat.js 所需 =====

// 危机风险提示：扫描最近的用户消息，如果有危机信号，返回给AI的提醒文本
export async function getRiskNote(userId, messages = []) {
  try {
    const textOf = (c) => typeof c === "string" ? c
      : Array.isArray(c) ? c.filter(p => p?.type === "text").map(p => p.text || "").join("") : "";
    const lastUser = [...(messages || [])].reverse().find(m => m.role === "user");
    const text = textOf(lastUser?.content);
    if (!text) return "";

    // 复用危机检测逻辑（轻量关键词版，避免循环依赖，这里内联一份简版）
    const HIGH = ["不想活", "想死", "自杀", "结束生命", "活不下去", "了结自己"];
    const MEDIUM = ["自残", "自伤", "伤害自己", "没人在乎", "好绝望", "撑不住"];
    const NEG = ["不会", "才不", "以前", "之前", "同学", "朋友", "别人", "电影", "书上"];
    const hasNeg = NEG.some(n => text.includes(n));

    for (const kw of HIGH) {
      if (text.includes(kw)) {
        return hasNeg
          ? "\n【风险提示（较低）】用户提到了敏感词但像是转述或否定语境。温和留意，不必拉最高警报。"
          : "\n【风险提示（高）】用户可能表达了自伤/自杀念头。请立刻优先安全：温和确认TA的状态，引导联系信任的成年人或拨打希望热线 400-161-9995，绝不提供任何伤害方法。";
      }
    }
    for (const kw of MEDIUM) {
      if (text.includes(kw)) {
        return "\n【风险提示（中）】用户情绪可能较低落或有自伤倾向。多共情、多陪伴，温和了解状态，必要时建议寻求信任的大人帮助。";
      }
    }
    return "";
  } catch {
    return "";
  }
}

// 场景上下文：根据当前 scenario 给 AI 一段侧重指引
export function buildScenarioContext(scenario, profile, recentContext) {
  if (scenario === "code") {
    return "【当前场景：编程学习】你在陪学生写代码、学做东西。耐心、鼓励、循序渐进。";
  }
  if (scenario === "self-checkin") {
    return "【当前场景：情绪打卡后的关心】用户刚记录了心情。自然地感知TA的状态，温柔地引出话题。";
  }
  // general
  return "【当前场景：日常陪伴】像朋友一样自然地聊，先接住情绪，再谈其他。";
}
