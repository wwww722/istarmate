// lib/projectTemplates.js - 项目模板库，降低"不知道做什么"的门槛

export const TEMPLATES = [
  {
    id: "blank", emoji: "📄", title: "空白开始", desc: "从零开始，我自己想",
    mode: "static", prompt: null,
  },
  {
    id: "profile", emoji: "🪪", title: "个人主页", desc: "介绍你自己，放上爱好和作品",
    mode: "static",
    prompt: "我想做一个个人主页，介绍我自己、我的爱好，最好看起来好看有个性。",
  },
  {
    id: "game", emoji: "🎮", title: "小游戏", desc: "猜数字、打地鼠、贪吃蛇…",
    mode: "static",
    prompt: "我想做一个能在网页上玩的小游戏，简单有趣就行，你推荐一个适合新手的。",
  },
  {
    id: "calculator", emoji: "🧮", title: "计算器", desc: "能真正算数的计算器",
    mode: "static",
    prompt: "我想做一个计算器，能做加减乘除，界面要好看。",
  },
  {
    id: "todo", emoji: "✅", title: "待办清单", desc: "记录每天要做的事",
    mode: "static",
    prompt: "我想做一个待办清单，能添加任务、勾选完成、删除任务。",
  },
  {
    id: "quiz", emoji: "❓", title: "趣味测验", desc: "做一套题，出结果",
    mode: "static",
    prompt: "我想做一个趣味小测验，回答几道题后给出结果，像那种性格测试一样。",
  },
  {
    id: "card", emoji: "💌", title: "电子贺卡", desc: "送给朋友的动态贺卡",
    mode: "static",
    prompt: "我想做一张电子贺卡送给朋友，要有动画效果，能写祝福语。",
  },
  {
    id: "py-basics", emoji: "🐍", title: "Python 入门", desc: "编程的第一课",
    mode: "python",
    prompt: "我想学 Python，完全是零基础，从最开始教我吧。",
  },
  {
    id: "py-game", emoji: "🎲", title: "Python 小游戏", desc: "猜数字、剪刀石头布",
    mode: "python",
    prompt: "我想用 Python 写一个小游戏，简单有趣的那种。",
  },
  {
    id: "react-counter", emoji: "⚛️", title: "React 计数器", desc: "学 React 的第一步",
    mode: "react",
    prompt: "我想用 React 做一个计数器，学习 useState 怎么用。",
  },
  {
    id: "react-app", emoji: "🚀", title: "React 小应用", desc: "多组件的完整应用",
    mode: "react",
    prompt: "我想用 React 做一个有多个组件的小应用，你推荐一个适合练手的。",
  },
];
