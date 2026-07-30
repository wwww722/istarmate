// pages/pricing.js
// IStarMate 三档：免费版 / 成长版 / 高级版
import Link from "next/link";
import { CHARACTER_LIST } from "../lib/characters";

const TIERS = [
  {
    code: "free", name: "免费版", priceLabel: "¥0 永久",
    cta: "免费开始使用", desc: "先体验，不急着付钱",
    recommend: false,
    features: [
      "每天 20 条对话额度",
      "两位 AI 伙伴：许安和 + 余生",
      "每日心情打卡 + 情绪追踪",
      "代码沙盒无限次运行",
      "成长里程碑记录",
      "危机安全守护 + 希望热线",
    ],
  },
  {
    code: "growth", name: "成长版", priceLabel: "¥19.9 / 月　¥199 / 年",
    cta: "开始 7 天免费试用", desc: "认真想改变的你，这就够了",
    recommend: true,
    features: [
      "无限对话，聊天不限量",
      "许安和记得你说的每件事（长期记忆）",
      "语音输入 + AI 朗读，像打电话一样聊",
      "图片上传，让 AI 看到你的世界",
      "专属学习路径，余生陪你一步步走",
      "每周成长报告，看见自己的变化",
      "作品可发布到展示墙",
    ],
  },
  {
    code: "premium", name: "高级版", priceLabel: "¥39.9 / 月　¥399 / 年",
    cta: "开始 7 天免费试用", desc: "想把 AI 用到极致的你",
    recommend: false,
    features: [
      "成长版全部功能",
      "更强的 AI 大脑，回答更深更准",
      "优先响应，高峰期不排队",
      "更长的记忆，记得更久以前的事",
      "每月深度成长报告",
      "抢先体验最新功能",
      "专属客服支持",
    ],
  },
];

export default function PricingPage() {
  return (
    <div style={{ background: "linear-gradient(180deg,#faf7ff 0%,#f0faff 100%)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 60px" }}>
        <div style={{ marginBottom: 8 }}>
          <Link href="/dashboard" style={{ color: "#7c6fe0", textDecoration: "none", fontSize: 14, fontWeight: 500 }}>← 返回</Link>
        </div>
        {/* Hero */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-block", padding: "6px 16px", background: "rgba(124,111,224,0.12)", color: "#5a4bb8", borderRadius: 999, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
            付费版 7 天免费试用，不需要绑卡，到期前手动确认才续费
          </div>
          <h1 style={{ fontSize: 38, lineHeight: 1.25, margin: "0 0 12px", color: "#22212c", letterSpacing: "-0.5px" }}>
            陪伴你，而不是 <span style={{ background: "linear-gradient(135deg,#7c6fe0,#5ac8b0)", WebkitBackgroundClip: "text", color: "transparent" }}>被产品绑架</span>
          </h1>
          <div style={{ color: "#666", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>
            许安和听你说心事，余生带你做东西。免费版就能好好用，想要更多陪伴时再升级。
          </div>
        </div>

        {/* 三档卡片 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 16 }}>
          {TIERS.map((t) => (
            <div key={t.code} style={{
              position: "relative", borderRadius: 20, padding: 24,
              background: t.recommend ? "linear-gradient(180deg,#fff 0%,#f7f4ff 100%)" : "#fff",
              border: t.recommend ? "2px solid #7c6fe0" : "1.5px solid rgba(124,111,224,0.18)",
              boxShadow: t.recommend ? "0 18px 50px rgba(124,111,224,0.20)" : "0 6px 20px rgba(20,10,60,0.06)",
              display: "flex", flexDirection: "column",
            }}>
              {t.recommend && (
                <div style={{
                  position: "absolute", top: -14, left: 24, padding: "4px 14px",
                  background: "linear-gradient(135deg,#7c6fe0,#9b8ff0)", color: "#fff",
                  borderRadius: 999, fontSize: 12, fontWeight: 700,
                  boxShadow: "0 8px 20px rgba(124,111,224,0.28)",
                }}>⭐ 最推荐</div>
              )}
              <div style={{ fontSize: 13, color: "#777", marginBottom: 6 }}>{t.desc}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#222", marginBottom: 4 }}>{t.name}</div>
              <div style={{ fontSize: 15, color: "#333", fontWeight: 600, marginBottom: 18, minHeight: 44 }}>{t.priceLabel}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 20px", display: "grid", gap: 9 }}>
                {t.features.map((f, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: "#333", lineHeight: 1.55, display: "flex", gap: 8 }}>
                    <span style={{ color: "#3cb478", fontWeight: 700 }}>✓</span><span>{f}</span>
                  </li>
                ))}
              </ul>
              <div style={{ marginTop: "auto" }}>
                <Link href={"/login"} style={{
                  display: "block", textAlign: "center", padding: "11px 12px", borderRadius: 12,
                  background: t.recommend ? "linear-gradient(135deg,#7c6fe0,#9b8ff0)" : "rgba(124,111,224,0.1)",
                  color: t.recommend ? "#fff" : "#4b42b4",
                  fontWeight: 700, textDecoration: "none",
                }}>{t.cta}</Link>
              </div>
            </div>
          ))}
        </div>

        {/* 两位伙伴介绍 */}
        <div style={{ marginTop: 60 }}>
          <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: 26 }}>你的两位伙伴</h2>
          <div style={{ textAlign: "center", color: "#666", marginBottom: 24 }}>一个陪你的心，一个陪你动手，各有各的温度</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14, maxWidth: 620, margin: "0 auto" }}>
            {CHARACTER_LIST.map((c, idx) => {
              const bubble = ["#f7f4ff", "#f0fff9"][idx] || "#f7f4ff";
              const color = ["#7c6fe0", "#0a9a80"][idx] || "#7c6fe0";
              return (
                <div key={c.id} style={{ padding: 20, borderRadius: 18, background: bubble, border: "1.5px solid rgba(124,111,224,0.15)" }}>
                  <div style={{ fontSize: 30, marginBottom: 6 }}>{c.emoji}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color }}>{c.displayName}</div>
                  <div style={{ fontSize: 13.5, color: "#333", marginTop: 6, lineHeight: 1.7 }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 56, maxWidth: 720, margin: "56px auto 0" }}>
          <h2 style={{ textAlign: "center", fontSize: 26, margin: "0 0 18px" }}>几个常见问题</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {[
              { q: "7 天试用真的不要绑卡吗？", a: "真的。不需要填任何支付信息，到期前提醒你，手动确认才续费，不会扣一分钱。" },
              { q: "免费版够用吗？", a: "够用。每天 20 条对话、两位伙伴、心情打卡、代码沙盒都能用。想要无限聊天、语音、记忆这些，再升级也不迟。" },
              { q: "会不会越用越贵？", a: "不会。都是包月/包年，怎么聊都不会额外扣费。" },
              { q: "我的聊天内容安全吗？", a: "许安和聊的都是心里话，我们非常重视隐私。你可以随时在设置里查看、删除她记住的事。" },
            ].map((f, i) => (
              <details key={i} style={{ background: "#fff", padding: "12px 16px", borderRadius: 14, border: "1.5px solid rgba(124,111,224,0.15)" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, color: "#222", fontSize: 14 }}>{f.q}</summary>
                <div style={{ marginTop: 8, fontSize: 13.5, color: "#444", lineHeight: 1.8 }}>{f.a}</div>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ marginTop: 60, textAlign: "center", padding: "36px 24px", background: "linear-gradient(135deg,#7c6fe0,#5ac8b0)", color: "#fff", borderRadius: 24, boxShadow: "0 24px 60px rgba(124,111,224,0.3)" }}>
          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>今天就开始</div>
          <div style={{ opacity: 0.9, marginBottom: 20 }}>免费版就能好好用，许安和和余生在这里等你。</div>
          <Link href="/login" style={{ padding: "11px 24px", borderRadius: 999, background: "#fff", color: "#4b42b4", fontWeight: 700, textDecoration: "none", display: "inline-block" }}>免费开始</Link>
        </div>
      </div>
    </div>
  );
}
