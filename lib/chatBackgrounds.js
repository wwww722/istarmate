// lib/chatBackgrounds.js
// 4 套聊天背景壁纸。纯 CSS，localStorage 记住选择。

export const BACKGROUNDS = {
  sakura: {
    id: "sakura", name: "🌸 樱花教室", desc: "浅粉 + 飘落花瓣",
    bg: "linear-gradient(160deg, #fff5f8 0%, #ffeef4 100%)",
    petals: true, petalEmoji: "🌸",
  },
  code: {
    id: "code", name: "💻 代码空间站", desc: "深蓝 + 代码雨",
    bg: "linear-gradient(160deg, #0f1b2d 0%, #16233a 100%)",
    dark: true, codeRain: true,
  },
  starry: {
    id: "starry", name: "🌙 星空露台", desc: "深紫 + 星星闪烁",
    bg: "linear-gradient(160deg, #1a1330 0%, #241640 100%)",
    dark: true, stars: true,
  },
  morning: {
    id: "morning", name: "🍃 清晨操场", desc: "浅绿 + 阳光斑驳",
    bg: "linear-gradient(160deg, #f2fbf0 0%, #e8f6ea 100%)",
  },
};

export function getChatBackground() {
  if (typeof window === "undefined") return "morning";
  try { return localStorage.getItem("istarmate_chat_bg") || "morning"; } catch { return "morning"; }
}
export function setChatBackground(id) {
  try { localStorage.setItem("istarmate_chat_bg", id); } catch {}
}
