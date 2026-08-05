// pages/chat.js （超级升级替换版）
// 串联：三角色切换 + 模型人格切换 + 思考过程流式 + 多模态上传 + 语音输入输出 + CBT 卡片触发 + 代码操作条 + 学习路径
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import ModelSwitcher from "../components/ModelSwitcher";
import ReasoningStream, { splitReasoning } from "../components/ReasoningStream";
import MultimodalUpload from "../components/MultimodalUpload";
import VoiceBar from "../components/VoiceBar";
import CbtMicroCard, { CBT_PRESETS } from "../components/CbtMicroCard";
import CodeApplyBar from "../components/CodeApplyBar";
import LearningPathWizard from "../components/LearningPathWizard";
import { getCharacter } from "../lib/characters";
import { enforceForbidden } from "../lib/istarmateConstitution";
import { detectSilence } from "../lib/silenceMode";
import {
  classifyTopic, HOST_DUTY, shouldInvite, pickAskScript, pickGreetingScript,
  exitScript, declineScript, roundtableRoles, supportInstruction, relayInstruction,
} from "../lib/roundtable";
import SessionSummaryCard from "../components/SessionSummaryCard";
import RoundtableEntrance from "../components/RoundtableEntrance";

const SCENARIOS = [
  { id: "general", name: "找许安和聊聊", icon: "🌙", char: "anhe", desc: "心里的事，说给她听" },
  { id: "code", name: "找余生做东西", icon: "💻", char: "yusheng", desc: "余生学长带你写代码" },
  { id: "vent", name: "情绪垃圾桶", icon: "🗑️", char: "anhe", desc: "只管倒，不用回我" },
  { id: "rescue", name: "紧急救场", icon: "🚨", char: "yusheng", desc: "明天要交！先让它跑起来" },
];

// 特殊模式的锁死指令
const MODE_INSTRUCTION = {
  vent: `\n\n【情绪垃圾桶模式·锁死】接下来用户只是想倾倒情绪，不需要你分析、不需要建议、不需要追问。你的回复只能是这几种之一：「🤍」「抱抱」「我在呢」「嗯，我听着」「说吧，我都接着」。绝对不要给任何建议、不要分析、不要追问原因。就当一个安全的容器，让TA尽情倒。`,
  rescue: `\n\n【紧急救场模式·锁死】用户在赶deadline（作业/比赛明天要交），只想让东西先跑起来。你的输出必须严格按这个顺序，不许变：1) 3行以内的大白话紧急方案（先干什么）；2) 一个可以直接复制粘贴的完整代码块（要能跑，别省略）；3) 最后才用一行讲原理。先跑通，再讲为什么。不要长篇大论讲理论。`,
};

function detectCbtPreset(text) {
  if (!text) return null;
  const t = String(text);
  if (/(考试|期末|期中|测验|考砸|紧张的要吐|考前|复习不完)/i.test(t)) return "exam_anxiety";
  if (/(妈妈|爸爸|爸妈|吵架|骂我|又说我|冷战|代沟|和.*吵)/i.test(t)) return "parent_conflict";
  if (/(崩溃|要死|撑不住|顶不住|活不下去|窒息|胸口闷|特别难受)/i.test(t)) return "general_crash";
  return null;
}

// 从 AI markdown 代码块里提取 {file="xxx"} 的代码，返回 [{file,code}]
function extractCodeBlocks(answer) {
  const arr = [];
  const re = /```(\w+)(?:\s*\{\s*file\s*=\s*["']?([^"'}\s]+)["']?\s*\})?\s*\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(answer || "")) !== null) {
    arr.push({ lang: m[1], file: m[2] || null, code: m[3] });
  }
  return arr;
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { scenario = "general" } = router.query;

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);
  const [sending, setSending] = useState(false);
  const [charId, setCharId] = useState("anhe"); // 当前主持人
  // ===== 圆桌模式状态 =====
  const [roundtable, setRoundtable] = useState(false);        // 是否圆桌模式（两人在场）
  const [recentTopics, setRecentTopics] = useState([]);       // 最近几轮话题分类
  const [inviteAsk, setInviteAsk] = useState(null);           // 主持人问的话术气泡 {host, line}
  const [invitedJoining, setInvitedJoining] = useState(false); // 另一个人进场动画中
  const [roundtableStartedAt, setRoundtableStartedAt] = useState(0); // 圆桌开始时间（算时长）
  const [showHostPicker, setShowHostPicker] = useState(false); // 每天首次进入的主持人选择浮层
  const [showQuiet, setShowQuiet] = useState(false); // 我要静静确认弹层
  const [isMuted, setIsMuted] = useState(false); // 用户让闭嘴的静音态
  const wait60Ref = useRef(null); // 哭泣后60秒等待
  const silenceRef = useRef({});                              // 24h静默 {code:ts, emotion:ts}
  const [sessionCard, setSessionCard] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardShownAt, setCardShownAt] = useState(0); // 防止20条触发后反复弹
  const idleTimerRef = useRef(null);
  const [personaId, setPersonaId] = useState("auto");
  const [modelId, setModelId] = useState("auto");
  const [attachments, setAttachments] = useState([]);
  const [cbtCard, setCbtCard] = useState(null);
  const [readText, setReadText] = useState("");
  const [showPath, setShowPath] = useState(false);
  const [activeMeta, setActiveMeta] = useState(null); // 模型信息

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  // 8️⃣ 深色双配色：根据当前主持人切换夜间配色
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-host", roundtable ? "anhe" : charId);
    return () => { document.documentElement.removeAttribute("data-host"); };
  }, [charId, roundtable]);

  useEffect(() => {
    const s = SCENARIOS.find(x => x.id === scenario);
    if (s) setCharId(s.char);
  }, [scenario]);

  // 语音朗读请求监听
  useEffect(() => {
    function onReq() {
      // 朗读最后一条 AI
      setMessages(ms => {
        const ai = [...ms].reverse().find(m => m.role === "assistant");
        if (ai) {
          const { answer } = splitReasoning(ai.content);
          setReadText(answer + "　");
        }
        return ms;
      });
    }
    window.addEventListener("istarmate-request-read", onReq);
    return () => window.removeEventListener("istarmate-request-read", onReq);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  // 每天首次进聊天页：弹一次"今天想让谁陪你"
  useEffect(() => {
    if (!session?.user?.email) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      if (localStorage.getItem("istarmate_host_picked") !== today) {
        setShowHostPicker(true);
      }
    } catch {}
  }, [session?.user?.email]);

  function pickHost(id) {
    setCharId(id);
    setShowHostPicker(false);
    try { localStorage.setItem("istarmate_host_picked", new Date().toISOString().slice(0, 10)); } catch {}
  }

  // 场景切换时：第一个 AI 发一条欢迎语
  useEffect(() => {
    if (!session?.user?.email) return;
    const s = SCENARIOS.find(x => x.id === scenario) || SCENARIOS[0];
    const ch = getCharacter(charId);
    const greet = buildGreeting(s, ch);
    setMessages([{ role: "assistant", character: ch.id, content: greet, ts: Date.now() }]);
  }, [scenario, charId, session?.user?.email]);

  // ===== 会话小结卡：生成 =====
  async function generateSessionCard() {
    if (cardLoading || sessionCard) return;
    const realMsgs = messages.filter(m => m.role === "user" || m.role === "assistant");
    if (realMsgs.length < 4) return; // 太短不出卡
    setCardLoading(true);
    try {
      const roleKind = (scenario === "code" || charId === "yusheng") ? "code" : "companion";
      const r = await fetch("/api/session-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: realMsgs, roleKind }),
      });
      const d = await r.json();
      if (d.card) { setSessionCard(d.card); setCardShownAt(realMsgs.length); }
    } catch {}
    setCardLoading(false);
  }

  // 触发①：10分钟没说话
  useEffect(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    const realCount = messages.filter(m => m.role === "user" || m.role === "assistant").length;
    if (realCount >= 4 && !sessionCard) {
      idleTimerRef.current = setTimeout(() => { generateSessionCard(); }, 10 * 60 * 1000);
    }
    return () => { if (idleTimerRef.current) clearTimeout(idleTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // 触发③：超过20条（每新增一轮判断一次，且距上次弹卡至少间隔）
  useEffect(() => {
    const realCount = messages.filter(m => m.role === "user" || m.role === "assistant").length;
    if (realCount >= 20 && realCount - cardShownAt >= 20 && !sessionCard && !loading) {
      generateSessionCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, loading]);

  // 存进记忆墙
  async function saveCardToMemory(card) {
    try {
      await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: card.roleKind === "code" ? "work" : "heart",
          key: (card.summary || "").slice(0, 20),
          detail: card.summary,
          importance: 2,
        }),
      });
    } catch {}
    setSessionCard(null);
  }

  // 流式请求一个角色的回复。whoChar=角色id, extra=额外指令, convMsgs=发给API的历史
  // 埋点：圆桌事件
  function trackEvent(event, detail) {
    fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event, detail }) }).catch(() => {});
  }

  async function streamReply(whoChar, extra, convMsgs) {
    // 1️⃣ 打字速度模拟：回复前先"思考"一下，不秒回。
    // 按最后一条用户消息长度估算：1.2s 固定 + 长消息多想一点，封顶 3.5s（比规格8s短，避免用户干等太久流失）
    const lastUserLen = (convMsgs.filter(m => m.role === "user").slice(-1)[0]?.content || "").length;
    const thinkDelay = Math.min(1200 + lastUserLen * 20, 3500);
    await new Promise(r => setTimeout(r, thinkDelay));

    const resp = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: convMsgs.map(({ role, content, attachments: a }) => ({ role, content, attachments: a })),
        scenario, charId: whoChar, personaId, modelId,
        attachments: whoChar === charId ? attachments : [],
        extraInstruction: extra || "",
      }),
    });
    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = "", answer = "", metaDone = false;
    // 先占一个空气泡
    setMessages(ms => [...ms, { role: "assistant", character: whoChar, persona: personaId, content: "", ts: Date.now(), support: extra?.includes("旁听者") }]);
    const pushAi = () => setMessages(ms => {
      const n = [...ms];
      // 更新最后一条属于whoChar的空/进行中气泡
      for (let i = n.length - 1; i >= 0; i--) {
        if (n[i].role === "assistant" && n[i].character === whoChar) { n[i] = { ...n[i], content: answer }; break; }
      }
      return n;
    });
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        const s = line.trim();
        if (!s || s.startsWith("event:") || !s.startsWith("data:")) continue;
        const payload = s.slice(5).trim();
        if (!payload) continue;
        if (payload === "[DONE]") {
          if (answer) {
            const { answer: pure } = splitReasoning(answer);
            if (activeMeta?.tier !== "free") setReadText(pure + " ");
          }
          continue;
        }
        if (!metaDone) {
          try { const j = JSON.parse(payload); if (j.model || j.character) { setActiveMeta(j); metaDone = true; continue; } } catch {}
        }
        try {
          const j = JSON.parse(payload);
          if (j.error) { alert("出错啦：" + j.error); continue; }
          const delta = j?.choices?.[0]?.delta || {};
          if (typeof delta.reasoning_content === "string") answer += `<think>${delta.reasoning_content}</think>`;
          if (typeof delta.content === "string") answer += delta.content;
          pushAi();
        } catch {}
      }
    }
    return answer;
  }

  async function send(overrideText) {
    if (busy || sending) return;
    const text = (typeof overrideText === "string" ? overrideText : input).trim();
    if (!text && attachments.length === 0) return;
    const userMsg = { role: "user", content: text, ts: Date.now(), attachments: [...attachments] };
    if (isMuted) setIsMuted(false); // 用户又说话了，解除静音
    const baseMsgs = messages.concat(userMsg);
    setMessages(ms => [...ms, userMsg]);
    setInput("");
    setAttachments([]);

    // CBT 触发
    const preset = detectCbtPreset(text);
    if (preset) setCbtCard(CBT_PRESETS[preset]);

    // 沉默模式检测（仅许安和场景）：命中则不调AI，安静接住
    if (charId === "anhe") {
      const prevUsers = messages.filter(m => m.role === "user").map(m => typeof m.content === "string" ? m.content : "");
      const silence = detectSilence(text, prevUsers);
      if (silence) {
        if (silence.mute) {
          setIsMuted(true);
          return; // 静音，不发任何文字
        }
        if (silence.reply) {
          setMessages(ms => [...ms, { role: "assistant", character: "anhe", content: silence.reply, ts: Date.now() }]);
        }
        if (silence.quiet24h) {
          try { localStorage.setItem("istarmate_quiet_until", String(Date.now() + 24 * 3600 * 1000)); } catch {}
        }
        if (silence.wait60s) {
          // 60秒后如果用户没说话，再发一条陪伴语
          if (wait60Ref.current) clearTimeout(wait60Ref.current);
          const msgCountAtWait = messages.length + 2;
          wait60Ref.current = setTimeout(() => {
            setMessages(ms => {
              if (ms.length === msgCountAtWait) {
                return [...ms, { role: "assistant", character: "anhe", content: "我一直在这儿陪着你，不着急，你想说的时候再说 🤍", ts: Date.now() }];
              }
              return ms;
            });
          }, 60000);
        }
        return; // 沉默模式命中，不走正常AI流程
      }
    }

    // 话题分类 + 记录最近话题
    const topic = classifyTopic(text);
    const newTopics = [...recentTopics, topic].slice(-5);
    setRecentTopics(newTopics);

    setSending(true); setBusy(true);
    try {
      if (roundtable) {
        // ===== 圆桌模式：按话题分工双答 =====
        const roles = roundtableRoles(topic);
        if (topic === "mixed") {
          // 许安和先处理情绪，再余生接力技术
          await streamReply("anhe", "", baseMsgs);
          await new Promise(r => setTimeout(r, 300));
          await streamReply("yusheng", relayInstruction(), baseMsgs);
        } else if (roles.main) {
          // 主说的人长回复
          await streamReply(roles.main, "", baseMsgs);
          // 补一句的人短回复
          if (roles.supportSpeaks) {
            await new Promise(r => setTimeout(r, 300));
            await streamReply(roles.support, supportInstruction(roles.support), baseMsgs);
          }
        } else {
          // pure话题：只当前主持人说
          await streamReply(charId, "", baseMsgs);
        }
      } else {
        // ===== 单人模式：主持人回复 =====
        const modeExtra = MODE_INSTRUCTION[scenario] || "";
        await streamReply(charId, modeExtra, baseMsgs);
        // vent/rescue 特殊模式不触发跨界邀请
        if (!modeExtra) {
          // 跨界检测：该不该问"要不要叫另一个过来"
          const duty = HOST_DUTY[charId];
          const opposite = duty === "emotion" ? "code" : "emotion";
          const silenceUntil = silenceRef.current[opposite] || 0;
          if (Date.now() > silenceUntil && shouldInvite(newTopics, charId)) {
            setInviteAsk({ host: charId, line: pickAskScript(charId) });
            trackEvent("host_asked_invite", { host: charId, detected: topic, round: newTopics.length });
          }
        }
      }

      // 任务飘字
      fetch("/api/gamification/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", payload: { taskCode: "chat5", inc: 1 } }) })
        .then(r => r.json()).then(d => { if (d?.justAwarded) window.dispatchEvent(new CustomEvent("istarmate-award", { detail: { justAwarded: d.justAwarded } })); }).catch(() => {});
    } catch (e) {
      console.error(e);
      setMessages(ms => [...ms, { role: "assistant", character: charId, content: "呜呜刚才网络卡住了，你再说一遍呀🥺" + (e?.message ? "（" + e.message + "）" : ""), ts: Date.now() }]);
    } finally {
      setSending(false); setBusy(false);
    }
  }

  // 圆桌配额检查：免费版每天1次，付费版无限
  function canEnterRoundtable() {
    const tier = activeMeta?.tier || "free";
    if (tier !== "free") return true; // 付费无限
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rec = JSON.parse(localStorage.getItem("istarmate_roundtable_quota") || "{}");
      return !(rec.date === today && rec.count >= 1);
    } catch { return true; }
  }

  function consumeRoundtableQuota() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const rec = JSON.parse(localStorage.getItem("istarmate_roundtable_quota") || "{}");
      const count = (rec.date === today ? rec.count : 0) + 1;
      localStorage.setItem("istarmate_roundtable_quota", JSON.stringify({ date: today, count }));
    } catch {}
  }

  // 接受邀请：叫另一个人进场
  async function acceptInvite() {
    // 配额检查
    if (!canEnterRoundtable()) {
      setInviteAsk(null);
      trackEvent("invite_quota_hit", { host: inviteAsk.host });
      setMessages(ms => [...ms, { role: "assistant", character: inviteAsk.host, content: "今天的双人圆桌次数用完啦～升级少年启航版就能无限次让我俩一起陪你哦 🤍💙", ts: Date.now(), upsell: true }]);
      return;
    }
    consumeRoundtableQuota();
    const host = inviteAsk.host;
    const joining = host === "anhe" ? "yusheng" : "anhe";
    trackEvent("invite_accepted", { host });
    setInviteAsk(null);
    setInvitedJoining(true);
    setRoundtable(true);
    setRoundtableStartedAt(Date.now());
    // 进场打招呼（卡死话术）
    await new Promise(r => setTimeout(r, 1200)); // 进场动画留白
    setMessages(ms => [...ms, { role: "assistant", character: joining, content: pickGreetingScript(joining), ts: Date.now(), greeting: true }]);
    setInvitedJoining(false);
  }

  // 拒绝邀请：24h静默同话题
  function declineInvite() {
    const host = inviteAsk.host;
    const duty = HOST_DUTY[host];
    const opposite = duty === "emotion" ? "code" : "emotion";
    silenceRef.current[opposite] = Date.now() + 24 * 3600 * 1000;
    trackEvent("invite_declined", { host, silence_hours: 24 });
    setMessages(ms => [...ms, { role: "assistant", character: host, content: declineScript(host), ts: Date.now() }]);
    setInviteAsk(null);
  }

  // 退出圆桌
  function exitRoundtable() {
    // 谁退出：非当前主持人的那个
    const leaving = charId === "anhe" ? "yusheng" : "anhe";
    const durationMin = roundtableStartedAt ? Math.round((Date.now() - roundtableStartedAt) / 60000) : 0;
    const msgCount = messages.filter(m => m.role === "user").length;
    trackEvent("roundtable_exited", { duration_minutes: durationMin, messages_count: msgCount });
    setMessages(ms => [...ms, { role: "assistant", character: leaving, content: exitScript(leaving), ts: Date.now() }]);
    setRoundtable(false);
  }


  const character = useMemo(() => getCharacter(charId), [charId]);
  const currentScenario = SCENARIOS.find(x => x.id === scenario) || SCENARIOS[0];

  // 代码应用：把指定内容写到 Sandpack（如果页面上有 SandpackStudio 就通过自定义事件传）
  function applyCode({ file, code, runAfter }) {
    window.dispatchEvent(new CustomEvent("istarmate-apply-code", { detail: { file, code, runAfter } }));
    // 如果是纯网页场景：也可以把代码内容复制到剪贴板兜底
    if (!window.__hasSandpack) {
      try { navigator.clipboard.writeText(code); alert(file ? `已帮你复制 ${file} 的代码到剪贴板，粘贴到对应文件就行` : "已复制到剪贴板"); } catch {}
    }
  }

  if (status === "loading") {
    return <div style={{ display: "grid", placeItems: "center", minHeight: "60vh", color: "#888" }}>加载中...</div>;
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", minHeight: 600, background: "var(--bg, #fafbff)" }}>
      {/* 左侧场景导航 */}
      <aside style={{ width: 240, borderRight: "1px solid var(--line, #eee)", background: "rgba(255,255,255,0.6)", padding: 14, overflowY: "auto" }}>
        <Link href="/" style={{ textDecoration: "none", display: "block", marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>✦ istarmate</div>
          <div style={{ fontSize: 11.5, color: "#888" }}>青少年 AI 成长伙伴</div>
        </Link>
        <div style={{ fontSize: 12, color: "#888", margin: "14px 4px 6px", fontWeight: 600 }}>我想…</div>
        <div style={{ display: "grid", gap: 4 }}>
          {SCENARIOS.map(s => (
            <Link key={s.id} href={`/chat?scenario=${s.id}`} shallow style={{
              padding: "8px 10px", borderRadius: 10, textDecoration: "none",
              background: scenario === s.id ? "linear-gradient(135deg,#f3efff,#fbe9f4)" : "transparent",
              color: scenario === s.id ? "#4b42b4" : "var(--ink,#222)",
              fontWeight: scenario === s.id ? 700 : 500,
              border: scenario === s.id ? "1.5px solid rgba(124,111,224,0.35)" : "1.5px solid transparent",
              fontSize: 13.5,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>{s.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#888", fontWeight: 400, lineHeight: 1.4 }}>{s.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: 14, padding: 10, borderRadius: 12, background: "linear-gradient(135deg,#fff4e0,#fffaf0)", color: "#8a5a10", fontSize: 11.5, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>📞 紧急情况请拨打</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#c93a28" }}>12355 青少年热线</div>
          <div style={{ fontSize: 10.5, marginTop: 3 }}>24 小时 · 全国免费</div>
        </div>
        <Link href="/pricing" style={{
          display: "block", marginTop: 12, padding: "8px 10px", borderRadius: 10, textAlign: "center",
          background: "linear-gradient(135deg,#7c6fe0,#ff6fb3)", color: "#fff", fontWeight: 700, textDecoration: "none",
          fontSize: 12.5,
        }}>✨ 升级成长版 / 价格</Link>
      </aside>

      {/* 主聊天区 */}
      <section style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* 顶部：场景 + 人物 + 模型 */}
        <header style={{
          padding: "10px 18px", borderBottom: "1px solid var(--line, #eee)",
          display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", background: "rgba(255,255,255,0.8)",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{currentScenario.icon}</span>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{currentScenario.name}</div>
            </div>
            <div style={{ fontSize: 11, color: "#888" }}>{currentScenario.desc}</div>
          </div>
          <div style={{ flex: 1 }} />
          {/* 今日主持人 / 圆桌模式横条 */}
          {roundtable ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: "linear-gradient(135deg,#fff0f5,#eef7ff)", border: "1px solid rgba(124,111,224,0.25)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#7c6fe0" }}>🤍 许安和 + 💙 余生 · 圆桌</span>
              <button onClick={exitRoundtable} style={{ fontSize: 11, padding: "3px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "#fff", color: "#888", cursor: "pointer" }}>退出圆桌</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setCharId("anhe")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                  background: charId === "anhe" ? "#fff0f5" : "transparent",
                  color: charId === "anhe" ? "#c46b82" : "#999",
                  border: charId === "anhe" ? "1px solid rgba(196,107,130,0.4)" : "1px solid transparent",
                  borderBottom: charId === "anhe" ? "2px solid #e097b0" : "1px solid transparent" }}>
                🤍 许安和
              </button>
              <button onClick={() => setCharId("yusheng")}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 999, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
                  background: charId === "yusheng" ? "#eef7ff" : "transparent",
                  color: charId === "yusheng" ? "#2f7cae" : "#999",
                  border: charId === "yusheng" ? "1px solid rgba(47,124,174,0.4)" : "1px solid transparent",
                  borderBottom: charId === "yusheng" ? "2px solid #5aa0d0" : "1px solid transparent" }}>
                💙 余生
              </button>
            </div>
          )}
          <ModelSwitcher active={personaId} onChange={setPersonaId} compact />
          <button onClick={() => setShowQuiet(true)} title="接下来24小时不推送打扰你"
            style={{ padding: "5px 10px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.1)", background: "transparent", color: "#999", fontSize: 11.5, cursor: "pointer" }}>
            🌙 我要静静
          </button>
          {activeMeta?.model && (
            <div title={`当前模型：${activeMeta.model.displayName}（${activeMeta.model.id}）`} style={{
              padding: "4px 10px", borderRadius: 999, background: "rgba(124,111,224,0.08)",
              fontSize: 11.5, color: "#4b42b4", fontWeight: 600, border: "1px dashed rgba(124,111,224,0.3)",
            }}>{activeMeta.model.emoji} {activeMeta.model.displayName}</div>
          )}
        </header>

        {/* 消息区 */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px 22px 8px" }}>
          <div style={{ maxWidth: 780, margin: "0 auto", display: "grid", gap: 12 }}>
            {/* 学习路径入口 */}
            {scenario === "learning_path" && !showPath && (
              <button onClick={() => setShowPath(true)} style={{
                padding: "12px 16px", borderRadius: 14,
                background: "linear-gradient(135deg,#faf7ff,#fff4fa)",
                border: "1.5px dashed rgba(124,111,224,0.45)",
                color: "#4b42b4", fontWeight: 700, fontSize: 13.5, cursor: "pointer", textAlign: "left",
              }}>🪜 点这里，让余生帮你拆一份 12 周的专属学习路径</button>
            )}
            {showPath && scenario === "learning_path" && (
              <LearningPathWizard onClose={() => setShowPath(false)} onConfirm={({ goal, milestones }) => {
                setShowPath(false);
                setMessages(ms => [...ms, { role: "assistant", character: "anhe", content: `太棒啦！我们就从「${goal.title}」开始。第一步：今天做最小的一件事——${milestones[0]?.detail || "把目标写在本子上"}，完成了就回来跟我说一声～`, ts: Date.now() }]);
              }} />
            )}
            {messages.map((m, i) => <Bubble key={i} m={m} character={getCharacter(m.character || charId)} onApplyCode={applyCode} />)}

            {/* 主持人询问：要不要叫另一个过来 */}
            {inviteAsk && !sending && (
              <div style={{ background: inviteAsk.host === "anhe" ? "#fff8fb" : "#f2f9ff", border: `1.5px solid ${inviteAsk.host === "anhe" ? "rgba(224,150,176,0.5)" : "rgba(90,160,208,0.5)"}`, borderRadius: 16, padding: "14px 16px" }}>
                <div style={{ fontSize: 13.5, marginBottom: 12, lineHeight: 1.6, color: "#333" }}>
                  <b style={{ color: inviteAsk.host === "anhe" ? "#c46b82" : "#2f7cae" }}>{inviteAsk.host === "anhe" ? "🤍 许安和" : "💙 余生"}：</b>
                  {inviteAsk.line}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={acceptInvite} style={{ padding: "7px 16px", borderRadius: 10, border: "none", background: "linear-gradient(135deg,#7c6fe0,#9b8ff0)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>✅ 叫他过来</button>
                  <button onClick={declineInvite} style={{ padding: "7px 16px", borderRadius: 10, border: "1px solid rgba(0,0,0,0.12)", background: "#fff", color: "#888", fontSize: 13, cursor: "pointer" }}>❌ 不用啦，就我们俩聊就行</button>
                </div>
              </div>
            )}

            {/* 进场动画 */}
            {invitedJoining && (
              <RoundtableEntrance joining={charId === "anhe" ? "yusheng" : "anhe"} />
            )}
            {isMuted && <div style={{ textAlign: "center", padding: "8px", color: "#aaa", fontSize: 12.5 }}>🔇 已静音 · 说点什么就会回来</div>}
            {sending && <div style={{ padding: "4px 2px", color: "#888", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ display: "inline-flex", gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#bbb", animation: "typingDot 1.2s infinite", animationDelay: "0s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#bbb", animation: "typingDot 1.2s infinite", animationDelay: "0.2s" }} />
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#bbb", animation: "typingDot 1.2s infinite", animationDelay: "0.4s" }} />
              </span>
              <span>{getCharacter(charId).displayName}正在输入…</span>
              <style>{`@keyframes typingDot { 0%,60%,100%{opacity:.3;transform:translateY(0)} 30%{opacity:1;transform:translateY(-2px)} }`}</style>
            </div>}
            {/* CBT 卡片（自动触发/也可手动开） */}
            {cbtCard && (
              <CbtMicroCard initial={cbtCard} onClose={() => setCbtCard(null)} />
            )}
          </div>
        </div>

        {/* 输入区 */}
        <div style={{
          borderTop: "1px solid var(--line, #eee)", padding: "10px 22px 16px",
          background: "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(250,247,255,0.8))",
        }}>
          <div style={{ maxWidth: 780, margin: "0 auto" }}>
            <MultimodalUpload
              onAttach={setAttachments}
              maxFiles={3}
              maxMB={2}
            />
            {/* 快捷回复6颗（手机端显示） */}
            <div className="quick-replies" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(charId === "anhe"
                ? ["嗯嗯", "🤗 抱抱我", "我也不知道", "你说呢", "我想换个话题", "今天先到这"]
                : ["再讲一遍", "你先跑一遍试试", "我看不懂报错", "我放弃了", "换个方法", "今天先到这"]
              ).map(q => (
                <button key={q} onClick={() => send(q)}
                  disabled={busy}
                  style={{ padding: "6px 12px", borderRadius: 999, border: `1px solid ${charId === "anhe" ? "rgba(224,150,176,0.4)" : "rgba(90,160,208,0.4)"}`, background: charId === "anhe" ? "#fff8fb" : "#f2f9ff", color: charId === "anhe" ? "#c46b82" : "#2f7cae", fontSize: 12.5, cursor: busy ? "default" : "pointer", opacity: busy ? 0.5 : 1 }}>
                  {q}
                </button>
              ))}
            </div>
            <div style={{
              marginTop: 8,
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#fff", border: "1.5px solid rgba(124,111,224,0.25)",
              borderRadius: 16, padding: "8px 8px 8px 14px",
              boxShadow: busy ? "0 0 0 3px rgba(124,111,224,0.12)" : "none",
            }}>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                rows={1}
                placeholder={`和 ${getCharacter(charId).displayName} 说点什么…（Enter 发送 / Shift+Enter 换行）`}
                style={{
                  flex: 1, resize: "none", border: "none", outline: "none", fontSize: 14.5,
                  lineHeight: 1.55, padding: "6px 2px", background: "transparent", color: "var(--ink,#222)",
                  fontFamily: "inherit", maxHeight: 160,
                }}
              />
              <VoiceBar
                onText={(txt) => setInput((v) => (v ? v + "\n" + txt : txt))}
                readText={readText}
              />
              <button onClick={send} disabled={busy || !input.trim() && attachments.length===0} style={{
                height: 40, padding: "0 18px", borderRadius: 12, border: "none", cursor: busy ? "not-allowed" : "pointer",
                background: busy ? "rgba(124,111,224,0.35)" : "linear-gradient(135deg,#7c6fe0,#ff6fb3)",
                color: "#fff", fontWeight: 700,
              }}>{busy ? "发…" : "发送"}</button>
            </div>
            {messages.filter(m => m.role === "user" || m.role === "assistant").length >= 4 && !sessionCard && (
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <button onClick={generateSessionCard} disabled={cardLoading}
                  style={{ background: "transparent", border: "1px solid var(--line, #e5e0f0)", color: "#888", fontSize: 12, padding: "5px 14px", borderRadius: 14, cursor: cardLoading ? "default" : "pointer" }}>
                  {cardLoading ? "正在为你小结…" : "☕ 今天先聊到这"}
                </button>
              </div>
            )}
            <div style={{ fontSize: 11, color: "#888", marginTop: 6, textAlign: "center" }}>
              istarmate 是 AI 辅助成长伙伴，不提供心理诊疗服务。内容由 AI 生成，仅供参考，不代表专业建议。
              {activeMeta?.tier === "free" && " · 今日陪伴值有限，升级成长版可无限畅聊。"}
            </div>
          </div>
        </div>
      </section>

      {sessionCard && (
        <SessionSummaryCard
          card={sessionCard}
          onClose={() => setSessionCard(null)}
          onSaveToMemory={saveCardToMemory}
        />
      )}

      {/* 每天首次：今天想让谁陪你 */}
      {showHostPicker && (
        <div onClick={() => { setShowHostPicker(false); try { localStorage.setItem("istarmate_host_picked", new Date().toISOString().slice(0, 10)); } catch {} }}
          style={{ position: "fixed", inset: 0, background: "rgba(20,18,31,0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-solid, #fff)", borderRadius: 24, padding: "28px 24px", maxWidth: 360, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative" }}>
            <button onClick={() => { setShowHostPicker(false); try { localStorage.setItem("istarmate_host_picked", new Date().toISOString().slice(0, 10)); } catch {} }}
              style={{ position: "absolute", top: 14, right: 16, background: "transparent", border: "none", fontSize: 20, color: "#bbb", cursor: "pointer" }}>×</button>
            <p style={{ fontSize: 19, fontWeight: 700, margin: "0 0 6px" }}>今天想让谁陪你？</p>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 22px" }}>随时可以在上面切换，聊到一半也能喊另一个来</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => pickHost("anhe")}
                style={{ padding: "20px 12px", borderRadius: 18, border: "1.5px solid rgba(224,150,176,0.4)", background: "linear-gradient(135deg,#fff8fb,#fff0f5)", cursor: "pointer" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>🤍</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#c46b82" }}>许安和</div>
                <div style={{ fontSize: 11.5, color: "#999", marginTop: 3 }}>温柔姐姐 · 听你说心事</div>
              </button>
              <button onClick={() => pickHost("yusheng")}
                style={{ padding: "20px 12px", borderRadius: 18, border: "1.5px solid rgba(90,160,208,0.4)", background: "linear-gradient(135deg,#f2f9ff,#eef7ff)", cursor: "pointer" }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>💙</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2f7cae" }}>余生</div>
                <div style={{ fontSize: 11.5, color: "#999", marginTop: 3 }}>编程学长 · 带你做东西</div>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 我要静静确认弹层 */}
      {showQuiet && (
        <div onClick={() => setShowQuiet(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,18,31,0.5)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--card-solid,#fff)", borderRadius: 22, padding: "26px 24px", maxWidth: 340, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
            <p style={{ fontSize: 17, fontWeight: 700, margin: "0 0 8px" }}>给你一点安静</p>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", margin: "0 0 22px", lineHeight: 1.7 }}>
              接下来 24 小时，{charId === "anhe" ? "许安和" : "余生"}不会主动发任何推送或提醒给你。你想回来时，随时打开就好。
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => {
                try { localStorage.setItem("istarmate_quiet_until", String(Date.now() + 24 * 3600 * 1000)); } catch {}
                setShowQuiet(false);
                setMessages(ms => [...ms, { role: "assistant", character: charId, content: charId === "anhe" ? "好，接下来这段时间我不打扰你，你想我了随时来找我 🤍" : "行，那我先不吵你，随时回来喊我 💙", ts: Date.now() }]);
              }} className="btn primary" style={{ flex: 1 }}>好，安静24小时</button>
              <button onClick={() => setShowQuiet(false)}
                style={{ padding: "0 18px", borderRadius: 12, border: "1px solid var(--line)", background: "transparent", color: "var(--ink-soft)", cursor: "pointer", fontSize: 14 }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 单个气泡
function Bubble({ m, character, onApplyCode }) {
  const isUser = m.role === "user";
  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <div style={{ maxWidth: "78%", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
          {m.attachments && m.attachments.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {m.attachments.map((a, i) => a.dataUrl.startsWith("data:image")
                ? <img key={i} src={a.dataUrl} style={{ maxWidth: 140, borderRadius: 10, border: "1px solid #eee" }} />
                : <div key={i} style={{ padding: "4px 8px", borderRadius: 8, background: "#f3efff", fontSize: 12 }}>📄 {a.name}</div>
              )}
            </div>
          )}
          <div style={{
            background: "linear-gradient(135deg,#7c6fe0,#ff6fb3)", color: "#fff",
            borderRadius: 16, padding: "10px 14px", fontSize: 14.5, lineHeight: 1.65,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>{m.content}</div>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#eee", display: "grid", placeItems: "center", fontWeight: 700, color: "#666", flexShrink: 0 }}>我</div>
      </div>
    );
  }
  const { reasoning, answer: rawAnswer } = splitReasoning(m.content);
  // 宪法：禁令句扫描替换（兜底，防止模型漏说）
  const answer = m.role === "assistant" ? enforceForbidden(rawAnswer) : rawAnswer;
  const codeBlocks = extractCodeBlocks(answer);
  const bubbleColor = character?.bubbleColor || "linear-gradient(135deg, #fff9ff, #f5f0ff)";
  const isSupport = m.support; // 圆桌里"补一句"的旁听者，尺寸小一圈
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, opacity: isSupport ? 0.92 : 1, paddingLeft: isSupport ? 24 : 0 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        background: character?.color || "#B8AEFF", color: "#fff",
        display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0,
        fontWeight: 700,
      }}>{character?.emoji || "🤖"}</div>
      <div style={{ maxWidth: "80%" }}>
        <div style={{ fontSize: 11.5, color: "#888", marginBottom: 3, fontWeight: 600 }}>
          {character?.displayName || "AI"} {character?.title && <span style={{ marginLeft: 6, fontWeight: 400 }}>· {character.title}</span>}
        </div>
        {reasoning && <ReasoningStream content={m.content} character={character} />}
        <div style={{
          background: bubbleColor, color: "#22212c",
          borderRadius: 16, padding: "10px 14px", fontSize: 14.5, lineHeight: 1.7,
          whiteSpace: "pre-wrap", wordBreak: "break-word",
          border: "1px solid rgba(124,111,224,0.08)",
        }}>
          <MarkdownLite text={answer} />
        </div>
        {codeBlocks.map((b, i) => (
          <CodeApplyBar
            key={i}
            file={b.file}
            code={b.code}
            onApply={() => onApplyCode?.({ file: b.file, code: b.code, runAfter: false })}
            onApplyAndRun={() => onApplyCode?.({ file: b.file, code: b.code, runAfter: true })}
            onFix={b.file ? () => onApplyCode?.({ file: b.file, code: b.code, runAfter: true }) : null}
          />
        ))}

        {/* 危机/情绪类追加免责（许安和） */}
        {m.character === "anhe" && /(难过|崩溃|自杀|自残|想死|活不下去|撑不下去)/.test(answer) && (
          <div style={{ fontSize: 11.5, color: "#c07a2b", marginTop: 8, lineHeight: 1.6, background: "rgba(240,184,74,0.08)", padding: "8px 10px", borderRadius: 8 }}>
            💡 以上是 AI 陪伴建议，如果你持续 2 周以上睡不好吃不下，一定要找学校心理老师或拨打 12355（8:30–22:30）。
          </div>
        )}
        {/* 代码类追加免责（余生） */}
        {m.character === "yusheng" && codeBlocks.length > 0 && (
          <div style={{ fontSize: 11.5, color: "#888", marginTop: 8, lineHeight: 1.6 }}>
            💡 以上代码由 AI 生成，上线到真实项目前请务必自行测试。
          </div>
        )}
        {/* 每条 AI 消息底部水印 */}
        <div style={{ fontSize: 10.5, color: "#bbb", marginTop: 6 }}>
          由 istarmate AI 生成 · 不代表真人建议 · 紧急请打 12355
        </div>
      </div>
    </div>
  );
}

// 极简 markdown：只做粗体/斜体/代码块/链接（避免引入新依赖）
function MarkdownLite({ text }) {
  if (!text) return null;
  const lines = String(text).split("\n");
  const out = [];
  let i = 0, inCode = false, codeBuf = "", codeLang = "";
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line)) {
      if (!inCode) { inCode = true; codeLang = line.replace(/^```/, "").trim(); codeBuf = ""; }
      else {
        out.push(
          <pre key={`c${out.length}`} style={{
            background: "#0f172a", color: "#e2e8f0",
            padding: 12, borderRadius: 10, overflow: "auto", marginTop: 8, fontSize: 12.5,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          }}>
            <code>{codeBuf}</code>
            {codeLang && <div style={{ fontSize: 10.5, opacity: 0.7, marginTop: 6 }}>{codeLang}</div>}
          </pre>
        );
        inCode = false; codeBuf = ""; codeLang = "";
      }
      i++;
      continue;
    }
    if (inCode) { codeBuf += line + "\n"; i++; continue; }
    // 标题
    if (/^#{1,6}\s+/.test(line)) {
      const lv = line.match(/^#+/)[0].length;
      const inner = inline(line.replace(/^#+\s+/, ""));
      out.push(ReactCreateElement(`h${Math.min(lv,4)}`, { key: `h${out.length}`, style: { fontSize: 13 + (6 - lv), marginTop: 10, marginBottom: 6, fontWeight: 700 } }, inner));
      i++; continue;
    }
    // 列表
    if (/^[-*]\s+/.test(line)) {
      const inner = inline(line.replace(/^[-*]\s+/, ""));
      out.push(<li key={`l${out.length}`} style={{ marginLeft: 16, lineHeight: 1.7 }}>{inner}</li>);
      i++; continue;
    }
    // 普通段落
    const inner = inline(line);
    out.push(<div key={`p${out.length}`} style={{ lineHeight: 1.75 }}>{inner}</div>);
    i++;
  }
  if (inCode) out.push(<pre key={`tail`} style={{ background:"#0f172a", color:"#e2e8f0", padding:12, borderRadius:10, overflow:"auto", marginTop:8, fontSize:12.5, fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace" }}><code>{codeBuf}</code></pre>);
  return <div>{out}</div>;
}
function ReactCreateElement(tag, props, children) {
  const React = require("react");
  return React.createElement(tag, props, children);
}
function inline(s) {
  // **粗体**、*斜体*、`代码`、[链接](url)
  const nodes = [];
  let i = 0, buf = "";
  const pushBuf = () => { if (buf) { nodes.push(buf); buf = ""; } };
  while (i < s.length) {
    const rest = s.slice(i);
    if (rest.startsWith("**")) {
      pushBuf(); const end = s.indexOf("**", i + 2);
      if (end < 0) { buf += "**"; i += 2; continue; }
      nodes.push(<b key={`b${nodes.length}`} style={{ fontWeight: 700 }}>{s.slice(i + 2, end)}</b>);
      i = end + 2; continue;
    }
    if (rest.startsWith("`")) {
      pushBuf(); const end = s.indexOf("`", i + 1);
      if (end < 0) { buf += "`"; i += 1; continue; }
      nodes.push(<code key={`c${nodes.length}`} style={{
        background: "rgba(124,111,224,0.1)", padding: "1px 6px", borderRadius: 6,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12.5, color: "#4b42b4",
      }}>{s.slice(i + 1, end)}</code>);
      i = end + 1; continue;
    }
    if (rest.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)/.exec(rest);
      if (m) {
        pushBuf();
        nodes.push(<a key={`a${nodes.length}`} href={m[2]} target="_blank" rel="noreferrer" style={{ color: "#4b42b4", textDecoration: "underline" }}>{m[1]}</a>);
        i += m[0].length; continue;
      }
    }
    if (rest.startsWith("*")) {
      const end = s.indexOf("*", i + 1);
      if (end > i + 1 && !/\s/.test(s[i + 1])) {
        pushBuf();
        nodes.push(<em key={`i${nodes.length}`} style={{ fontStyle: "italic" }}>{s.slice(i + 1, end)}</em>);
        i = end + 1; continue;
      }
    }
    buf += s[i]; i++;
  }
  pushBuf();
  return nodes;
}

function buildGreeting(s, ch) {
  switch (s.id) {
    case "general": return `嗨～我是${ch.emoji}${ch.displayName}。今天过得怎么样呀？想聊什么都可以，我陪着你。`;
    case "emotional_support": return `${ch.emoji} 我在这里，不急，慢慢说。不管是委屈、生气、还是说不出的堵，先告诉我现在最让你难受的那一件事是什么？`;
    case "self_checkin": return `${ch.emoji} 又见面啦。我们用一分钟，今天心情如果 0-10 分，你给它打几分？随便说，没有对错。`;
    case "cbt_therapy": return `${ch.emoji} 我们今天不聊大道理，只做一个很小的练习。先告诉我你最近最常在脑子里转的那句话是什么？`;
    case "code": return `${ch.emoji} 要做什么 App？或者现在写代码卡在哪一步了？报错直接贴给我，我们当侦探一起破案 🕵️`;
    case "learning_path": return `${ch.emoji} 我们一起定一个你真正想做到的目标，我帮你拆成每周最小的一步。先选一个你最想开始的？`;
    default: return `嗨～我是${ch.emoji}${ch.displayName}，有什么想聊的？`;
  }
}
