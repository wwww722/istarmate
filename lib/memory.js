// lib/memory.js
// 话题延续：新对话开场时，让 AI 能自然接上上次没聊完的话题。
// buildThreadContext 返回一段可直接放进 system prompt 的文本（threadSection）。

import { getLastConversationThread } from "./db";

export async function buildThreadContext(threadId, userId, _limit = 8) {
  try {
    const last = await getLastConversationThread(userId, threadId || null);
    if (!last || !last.tail || last.tail.length === 0) return "";

    const timeDesc = last.hoursAgo < 24
      ? `${last.hoursAgo}小时前`
      : `${Math.floor(last.hoursAgo / 24)}天前`;

    const dialog = last.tail
      .map(t => `${t.role === "user" ? "TA" : "你"}：${t.text}`)
      .join("\n");

    return `【你们上次（${timeDesc}）聊到的——如果合适，可以自然地接上这个话题，像老朋友惦记着一样，比如"上次你说的那个…后来怎么样了？"。但如果TA这次明显想聊别的，就顺着TA，不要硬拉回去】\n${dialog}`;
  } catch {
    return "";
  }
}
