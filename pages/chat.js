// pages/chat.js （超级升级替换版）
// 串联：三角色切换 + 模型人格切换 + 思考过程流式 + 多模态上传 + 语音输入输出 + CBT 卡片触发 + 代码操作条 + 学习路径
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/router";
import CharacterSwitcher from "../components/CharacterSwitcher";
import ModelSwitcher from "../components/ModelSwitcher";
import ReasoningStream, { splitReasoning } from "../components/ReasoningStream";
import MultimodalUpload from "../components/MultimodalUpload";
import VoiceBar from "../components/VoiceBar";
import CbtMicroCard, { CBT_PRESETS } from "../components/CbtMicroCard";
import CodeApplyBar from "../components/CodeApplyBar";
import LearningPathWizard from "../components/LearningPathWizard";
import { getCharacter } from "../lib/characters";

const SCENARIOS = [
  { id: "general", name: "找许安和聊聊", icon: "🌙", char: "anhe", desc: "心里的事，说给她听" },
  { id: "code", name: "找余生做东西", icon: "💻", char: "yusheng", desc: "余生学长带你写代码" },
];

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
  const [charId, setCharId] = useState("anhe");
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

  // 场景切换时：第一个 AI 发一条欢迎语
  useEffect(() => {
    if (!session?.user?.email) return;
    const s = SCENARIOS.find(x => x.id === scenario) || SCENARIOS[0];
    const ch = getCharacter(charId);
    const greet = buildGreeting(s, ch);
    setMessages([{ role: "assistant", character: ch.id, content: greet, ts: Date.now() }]);
  }, [scenario, charId, session?.user?.email]);

  async function send() {
    if (busy || sending) return;
    const text = input.trim();
    if (!text && attachments.length === 0) return;
    const userMsg = { role: "user", content: text, ts: Date.now(), attachments: [...attachments] };
    setMessages(ms => [...ms, userMsg]);
    setInput("");
    setAttachments([]);

    // CBT 触发
    const preset = detectCbtPreset(text);
    if (preset) setCbtCard(CBT_PRESETS[preset]);

    setSending(true); setBusy(true);
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.concat(userMsg).map(({ role, content, attachments: a }) => ({ role, content, attachments: a })),
          scenario, charId, personaId, modelId, attachments,
        }),
      });
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "", answer = "", metaDone = false;
      const pushAi = () => setMessages(ms => {
        const last = ms[ms.length - 1];
        const newAi = { role: "assistant", character: charId, persona: personaId, content: answer, ts: Date.now() };
        if (last?.role === "assistant") { const n = [...ms]; n[n.length - 1] = { ...last, ...newAi }; return n; }
        return [...ms, newAi];
      });
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const line of lines) {
          const s = line.trim();
          if (!s) continue;
          if (s.startsWith("event:")) continue;
          if (!s.startsWith("data:")) continue;
          const payload = s.slice(5).trim();
          if (!payload) continue;
          if (payload === "[DONE]") {
            // 完成后自动朗读一下成长版的话
            if (answer) {
              const { answer: pure } = splitReasoning(answer);
              if (activeMeta?.tier !== "free") setReadText(pure + " ");
            }
            continue;
          }
          if (!metaDone) {
            try {
              // meta 是第一个 event: meta + data:{json}。这里如果 payload 里能解析到 model 字段就收
              const j = JSON.parse(payload);
              if (j.model || j.character) { setActiveMeta(j); metaDone = true; continue; }
            } catch {}
          }
          try {
            const j = JSON.parse(payload);
            if (j.error) { alert("出错啦：" + j.error); continue; }
            const delta = j?.choices?.[0]?.delta || {};
            if (typeof delta.reasoning_content === "string") {
              answer += `<think>${delta.reasoning_content}</think>`;
            }
            if (typeof delta.content === "string") answer += delta.content;
            pushAi();
          } catch {}
        }
      }
      // 发完了触发任务完成飘字（chat5达标会触发）
      fetch("/api/gamification/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "progress", payload: { taskCode: "chat5", inc: 1 } }) })
        .then(r => r.json()).then(d => {
          if (d?.justAwarded) window.dispatchEvent(new CustomEvent("istarmate-award", { detail: { justAwarded: d.justAwarded } }));
        }).catch(() => {});
    } catch (e) {
      console.error(e);
      setMessages(ms => [...ms, { role: "assistant", character: charId, content: "呜呜刚才网络卡住了，你再说一遍呀🥺" + (e?.message ? "（" + e.message + "）" : ""), ts: Date.now() }]);
    } finally {
      setSending(false); setBusy(false);
    }
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
          <CharacterSwitcher active={charId} onChange={setCharId} />
          <ModelSwitcher active={personaId} onChange={setPersonaId} compact />
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
              <LearningPathWizard onConfirm={({ goal, milestones }) => {
                setShowPath(false);
                setMessages(ms => [...ms, { role: "assistant", character: "anhe", content: `太棒啦！我们就从「${goal.title}」开始。第一步：今天做最小的一件事——${milestones[0]?.detail || "把目标写在本子上"}，完成了就回来跟我说一声～`, ts: Date.now() }]);
              }} />
            )}
            {messages.map((m, i) => <Bubble key={i} m={m} character={getCharacter(m.character || charId)} onApplyCode={applyCode} />)}
            {sending && <div style={{ padding: "4px 2px", color: "#888", fontSize: 12 }}>
              <span style={{ display: "inline-block", animation: "pulse 1.2s infinite" }}>●</span>
              <span style={{ marginLeft: 6 }}>{getCharacter(charId).displayName}正在回复…</span>
              <style>{`@keyframes pulse { 0%,100%{opacity:.3} 50%{opacity:1} }`}</style>
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
            <div style={{ fontSize: 11, color: "#888", marginTop: 6, textAlign: "center" }}>
              istarmate 是 AI 辅助成长伙伴，不提供心理诊疗服务。内容由 AI 生成，仅供参考，不代表专业建议。
              {activeMeta?.tier === "free" && " · 今日陪伴值有限，升级成长版可无限畅聊。"}
            </div>
          </div>
        </div>
      </section>
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
  const { reasoning, answer } = splitReasoning(m.content);
  const codeBlocks = extractCodeBlocks(answer);
  const bubbleColor = character?.bubbleColor || "linear-gradient(135deg, #fff9ff, #f5f0ff)";
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", gap: 8 }}>
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
    case "code": return `${ch.emoji} 我是川～要做什么 App？或者现在写代码卡在哪一步了？报错直接贴给我，我们当侦探一起破案 🕵️`;
    case "learning_path": return `${ch.emoji} 我们一起定一个你真正想做到的目标，我帮你拆成每周最小的一步。先选一个你最想开始的？`;
    default: return `嗨～我是${ch.emoji}${ch.displayName}，有什么想聊的？`;
  }
}
