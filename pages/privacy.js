import { useRouter } from "next/router";

export default function Privacy() {
  const router = useRouter();
  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.back(); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>隐私政策</h2>
      </div>

      <div className="card" style={{ padding: "24px 22px", lineHeight: 1.8, fontSize: 14 }}>
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 0 }}>最近更新：2026年7月</p>

        <p>我们非常重视你的隐私，尤其因为本服务面向青少年、涉及情绪相关的敏感信息。这份政策说明我们收集什么、怎么用、怎么保护。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>1. 我们收集的信息</h3>
        <p>为了提供服务，我们会收集：你的邮箱（用于登录）；你填写的昵称、年龄、性别；情绪自评的答案与结果；每日心情打卡记录；你和 AI 的对话内容；你在编程课里保存的代码。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>2. 我们如何使用这些信息</h3>
        <p>这些信息仅用于：为你提供个性化的陪伴和练习；生成你的情绪趋势图和成长报告；改进 AI 的回应质量。<strong>我们不会将你的个人信息出售给任何第三方，也不会用于广告。</strong></p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>3. AI 对话的处理</h3>
        <p>你和 AI 的对话会发送给我们使用的第三方大模型服务商（用于生成回应）。我们只发送必要的对话内容，不会附带你的真实姓名等身份信息。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>4. 关于安全信号</h3>
        <p>如果对话中出现可能表示自我伤害风险的内容，系统会记录相关信息，目的是在必要时能够提供帮助与支持资源。这是出于对你安全的关心。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>5. 你的权利</h3>
        <p>你可以随时查看、导出或删除你的数据。在"账号设置"里，你可以修改邮箱和密码，或删除整个账号——删除后所有关联数据会一并清除，且不可恢复。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>6. 数据存储与安全</h3>
        <p>你的密码经过加密存储，我们无法看到明文。数据存储在云数据库中，并采取合理的安全措施保护。但请理解，没有任何系统能保证绝对安全。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>7. 监护人权利</h3>
        <p>未成年用户的监护人有权了解和管理孩子的数据，包括协助导出或删除。</p>

        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 24, marginBottom: 0 }}>
          本政策为学生项目的基础版本，实际投入使用前建议由法律专业人士审核完善。
        </p>
      </div>
    </div>
  );
}
