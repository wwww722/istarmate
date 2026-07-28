// pages/pricing.js
// 对标：知见光伙伴 7 天不绑卡试用 + 家庭版 / 专业版分层
// 4 个版本：免费版 / 成长版 / 家庭联动版 / 校园机构版
import Link from "next/link";
import { CHARACTER_LIST } from "../lib/characters";
import { getModelListForUI } from "../lib/ossModelRoutes";

export default function PricingPage() {
  const ui = getModelListForUI("growth");
  return (
    <div style={{ background: "linear-gradient(180deg,#faf7ff 0%,#f0faff 100%)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "40px 24px 60px" }}>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ display: "inline-block", padding: "6px 16px", background: "rgba(255,200,140,0.2)", color: "#8a5a10", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            🪷 所有版本：7 天免费试用，不需要绑卡，到期前手动确认续费
          </div>
          <h1 style={{ fontSize: 40, lineHeight: 1.25, margin: "0 0 12px", color: "#22212c", letterSpacing: "-0.5px" }}>
            陪伴你，而不是 <span style={{ background: "linear-gradient(135deg,#7c6fe0,#ff6fb3)", WebkitBackgroundClip: "text", color: "transparent" }}>被产品绑架</span>
          </h1>
          <div style={{ color: "#666", fontSize: 16, maxWidth: 560, margin: "0 auto" }}>
            星野、川、明川老师，还有成长版起解锁的顶级大模型，都是你的专属伙伴。
            <br />
            家长买知见光伙伴 · <b>家庭联动版直接赠送孩子成长版</b>（内测）。
          </div>
        </div>

        {/* 版本卡片 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 16 }}>
          {[
            {
              code: "free", name: "免费版", priceLabel: "¥0 永久",
              cta: "免费开始使用",
              desc: "先体验，不急着付钱",
              features: [
                "每天 20 点陪伴值（聊 20 条）",
                "开源模型：Qwen2.5-72B / DeepSeek-V3 / Llama3.1-70B / Mistral Large 3",
                "3 位 AI 伙伴：星野 / 川 / 明川老师",
                "每日 4 任务 + 连胜 + XP + 星光币",
                "Sandpack 代码沙盒无限次运行",
                "12355 紧急安全声明",
              ],
              disabled: false,
              recommend: false,
            },
            {
              code: "growth", name: "成长版", priceLabel: "¥29.9 / 月　¥299 / 年",
              cta: "开始 7 天免费试用（不绑卡）",
              desc: "认真想改变的青少年，这就够了",
              features: [
                "无限陪伴值（聊天不限量）",
                "解锁 6 个高阶模型：豆包 Pro / DeepSeek-R1 推理王 / Llama 3.1 405B / Qwen3 235B / GPT-4o mini",
                "💭 思考过程流式展示（R1/GPT-4o mini 原生推理路径）",
                "📷 图片/代码文件上传多模态",
                "🎙️ 语音输入 + AI 朗读（像打电话一样聊）",
                "🪜 AI 生成专属学习路径（12 周里程碑）",
                "📮 每周成长报告邮件",
              ],
              disabled: false,
              recommend: true,
            },
            {
              code: "family", name: "家庭联动版", priceLabel: "购买知见光伙伴自动赠送",
              cta: "前往知见光伙伴了解 ↗",
              desc: "一家两代，一起成长",
              features: [
                "孩子端：成长版全部功能",
                "家长端：知见光伙伴 成长版/专业版",
                "🔒 匿名家庭仪表盘：孩子情绪趋势 + XP/作品变化",
                "看不到对话原文，保护孩子隐私边界",
                "解锁天花板：GPT-4o（综合创意王）/ Claude 3.5 Sonnet（代码严谨王）",
                "📞 7x12 小时家庭专属客服",
              ],
              disabled: false,
              recommend: false,
              highlight: true,
            },
            {
              code: "campus", name: "校园/机构版", priceLabel: "联系定制",
              cta: "预约 1 对 1 演示",
              desc: "学校、青少年中心、心理咨询机构",
              features: [
                "成长版全部功能",
                "班级仪表盘 + 心理老师邀请码",
                "🆘 高危预警：严重自伤/欺凌关键词 → 自动推送心理老师",
                "自定义角色（学校自己的辅导员人格）",
                "数据本地化部署可选",
                "培训 + 实施 + 研究报告支持",
              ],
              disabled: false,
            },
          ].map((t) => (
            <div key={t.code} style={{
              position: "relative",
              borderRadius: 20, padding: 22,
              background: t.recommend ? "linear-gradient(180deg,#fff 0%,#fff4fa 100%)" : "#fff",
              border: t.recommend
                ? "2px solid transparent"
                : t.highlight
                  ? "2px solid #ffd59e"
                  : "1.5px solid rgba(124,111,224,0.18)",
              boxShadow: t.recommend
                ? "0 18px 60px rgba(124,111,224,0.22)"
                : "0 6px 20px rgba(20,10,60,0.06)",
              display: "flex", flexDirection: "column",
            }}>
              {t.recommend && (
                <div style={{
                  position: "absolute", top: -14, left: 22, padding: "4px 14px",
                  background: "linear-gradient(135deg,#7c6fe0,#ff6fb3)", color: "#fff",
                  borderRadius: 999, fontSize: 12, fontWeight: 700,
                  boxShadow: "0 8px 20px rgba(124,111,224,0.28)",
                }}>⭐ 最推荐</div>
              )}
              <div style={{ fontSize: 13, color: "#777", marginBottom: 6 }}>{t.desc}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#222", marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 15, color: "#333", fontWeight: 600, marginBottom: 16, minHeight: 44 }}>{t.priceLabel}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "grid", gap: 8 }}>
                {t.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: "#333", lineHeight: 1.55, display: "flex", gap: 8 }}>
                    <span style={{ color: "#3cb478", fontWeight: 700 }}>✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "auto" }}>
                {t.code === "family" ? (
                  <a href="https://www.ilightmate.cn" target="_blank" rel="noreferrer" style={{
                    display: "block", textAlign: "center", padding: "10px 12px", borderRadius: 12,
                    background: "linear-gradient(135deg,#ffd59e,#ffb870)", color: "#6b3a00",
                    fontWeight: 700, textDecoration: "none",
                  }}>{t.cta}</a>
                ) : t.code === "campus" ? (
                  <a href="mailto:hello@istarmate.com" style={{
                    display: "block", textAlign: "center", padding: "10px 12px", borderRadius: 12,
                    background: "transparent", color: "#4b42b4",
                    fontWeight: 700, textDecoration: "none", border: "1.5px solid rgba(124,111,224,0.4)",
                  }}>{t.cta}</a>
                ) : (
                  <Link href={t.code === "free" ? "/register" : "/pricing/start-trial"} style={{
                    display: "block", textAlign: "center", padding: "10px 12px", borderRadius: 12,
                    background: t.recommend ? "linear-gradient(135deg,#7c6fe0,#ff6fb3)" : "rgba(124,111,224,0.1)",
                    color: t.recommend ? "#fff" : "#4b42b4",
                    fontWeight: 700, textDecoration: "none",
                  }}>{t.cta}</Link>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 三重人格介绍 */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: 26 }}>你的三位专属伙伴</h2>
          <div style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>每一位都是精心训练的独立人格，只做自己最擅长的事</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
            {CHARACTER_LIST.map((c, idx) => {
              const bubble = ["#fff5ff","#f0ffff","#fffaf0"][idx];
              const color = ["#7c6fe0","#0a959a","#a56a1f"][idx];
              return (
                <div key={c.id} style={{
                  padding: 18, borderRadius: 18, background: bubble,
                  border: `1.5px solid rgba(124,111,224,0.18)`,
                }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>{c.emoji}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color }}>{c.displayName}</div>
                  <div style={{ fontSize: 13, color: "#333", marginTop: 6, lineHeight: 1.7 }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 模型天梯图（简化版） */}
        <div style={{ marginTop: 56 }}>
          <h2 style={{ textAlign: "center", fontSize: 26, margin: "0 0 8px" }}>一图看懂：我们接入的 AI 模型</h2>
          <div style={{ textAlign: "center", color: "#666", marginBottom: 22 }}>2026 年最新榜单，开源优先，性价比拉满，全部通过 SiliconFlow 统一接入</div>
          <div style={{ display: "grid", gap: 10, maxWidth: 820, margin: "0 auto" }}>
            {ui.map(g => (
              <div key={g.group}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: "#222", margin: "4px 0 8px" }}>{g.group}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8 }}>
                  {g.items.map(m => (
                    <div key={m.id} style={{
                      padding: "10px 12px", borderRadius: 12,
                      background: "#fff", border: `1.5px solid ${m._locked ? "rgba(200,200,200,0.35)" : "rgba(124,111,224,0.2)"}`,
                      opacity: m._locked ? 0.78 : 1,
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <span style={{ fontSize: 18 }}>{m.emoji}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#222", display: "flex", alignItems: "center", gap: 6 }}>
                          {m.displayName}
                          {m._locked && <span style={{ fontSize: 11, color: "#a00" }}>🔒</span>}
                        </div>
                        <div style={{ fontSize: 11, color: "#777" }}>{m._tierLabel} · {m.vendor}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 56, maxWidth: 820, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: 26, margin: "0 0 18px" }}>几个常见问题</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { q: "7 天试用真的不要绑卡吗？", a: "真的。和知见光伙伴一样：不需要填任何支付信息，到期前邮件提醒你，手动确认才续费，不会扣一分钱。" },
              { q: "家庭版为什么看不到孩子的聊天原文？", a: "因为孩子需要自己的心理边界。家庭仪表盘只显示匿名统计趋势（情绪、XP、作品），看不到任何一句话。家长越尊重边界，孩子越愿意自己打开成长。" },
              { q: "校园版的高危预警怎么工作？", a: "本地关键词匹配 + 大模型独立判断（双保险）。严重自伤/欺凌/虐待相关，立即推送给绑定的心理老师，同时界面内引导孩子打 12355。" },
              { q: "模型会不会越用越贵？", a: "不会。所有套餐都是包月/包年，孩子怎么聊都不会额外扣费。开源模型在 SiliconFlow 上的价格只有闭源的 1/10-1/20，我们已经帮你把成本锁住了。" },
            ].map((f, i) => (
              <details key={i} style={{
                background: "#fff", padding: "12px 16px", borderRadius: 14,
                border: "1.5px solid rgba(124,111,224,0.15)",
              }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, color: "#222", fontSize: 14 }}>{f.q}</summary>
                <div style={{ marginTop: 8, fontSize: 13.5, color: "#444", lineHeight: 1.8 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA 底部 */}
        <div style={{
          marginTop: 72, textAlign: "center", padding: "36px 24px",
          background: "linear-gradient(135deg,#7c6fe0,#ff6fb3)", color: "#fff", borderRadius: 24,
          boxShadow: "0 24px 60px rgba(124,111,224,0.3)",
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>今天就开始。孩子的成长，不会等你准备好。</div>
          <div style={{ opacity: 0.88, marginBottom: 20 }}>不绑卡、不扣费、7 天内不喜欢就不用管它。</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
            <Link href="/register" style={{
              padding: "10px 20px", borderRadius: 999, background: "#fff", color: "#4b42b4",
              fontWeight: 700, textDecoration: "none", display: "inline-block",
            }}>免费开始注册</Link>
            <a href="https://www.ilightmate.cn" target="_blank" rel="noreferrer" style={{
              padding: "10px 20px", borderRadius: 999,
              background: "rgba(255,255,255,0.15)", color: "#fff",
              border: "1.5px solid rgba(255,255,255,0.35)",
              fontWeight: 700, textDecoration: "none", display: "inline-block",
            }}>我是家长 · 了解知见光伙伴 ↗</a>
          </div>
        </div>
      </div>
    </div>
  );
}
