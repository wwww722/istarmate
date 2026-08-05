// lib/silenceMode.js
// 许安和沉默模式：5 种场景不立刻长篇说话，而是安静地接住。

// 检测用户消息，返回沉默指令 or null
// 返回 { type, reply, wait, mute } | null
export function detectSilence(text, prevUserMsgs = []) {
  const t = (text || "").trim();
  if (!t) return null;

  // 情况4：叫闭嘴 → 静音，不发任何文字
  if (/(你别说话|你闭嘴|不要说了|别说了)/.test(t)) {
    return { type: "mute", reply: null, mute: true };
  }

  // 情况5：想一个人待会儿 → 一句 + 24h安静
  if (/(我想一个人待一会儿|我想静静|我想独处|想一个人待会)/.test(t)) {
    return { type: "quiet", reply: "好～我就在这儿，你随时回来 🤍", quiet24h: true };
  }

  // 情况1：哭了/很难受 → 先抱抱，等60秒
  if (/(我哭了|我现在很难受|我好难受|好想哭|😭|😢|🥺)/.test(t)) {
    return { type: "hug", reply: "抱抱你，我在呢 🤍", wait60s: true };
  }

  // 情况3：连续脏话发泄（命中≥2）→ 只说"我在听"
  const curseHits = (t.match(/操|草|妈的|傻逼|贱人|去死|滚|fuck|shit|bitch/gi) || []).length;
  if (curseHits >= 2) {
    return { type: "listen", reply: "嗯…我在听呢" };
  }

  // 情况2：连续2次"不知道/随便/都行"
  const isVague = (s) => ["不知道", "随便", "都行", "无所谓"].includes((s || "").trim());
  if (isVague(t) && prevUserMsgs.length >= 1 && isVague(prevUserMsgs[prevUserMsgs.length - 1])) {
    return { type: "gentle", reply: "没关系，不想说就先不说 🤍" };
  }

  return null;
}
