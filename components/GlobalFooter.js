export default function GlobalFooter() {
  return (
    <footer style={{
      marginTop: "auto",
      borderTop: "1px solid #eee",
      background: "linear-gradient(180deg, rgba(248,246,255,0) 0%, rgba(248,246,255,0.85) 100%)",
      padding: "22px 28px 30px",
      color: "#666",
      fontSize: 12.5,
      lineHeight: 1.85,
    }}>
      <div style={{ maxWidth: 1060, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 22 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#22212c", fontWeight: 700, marginBottom: 8, fontSize: 14 }}>
            <span style={{ fontSize: 18 }}>✦</span> istarmate · 青少年 AI 成长伙伴
          </div>
          <div>结合 AI 情绪陪伴 + 编程创造，让每一个年轻人在被理解中长大，在创造里找到自己的光。</div>
        </div>

        <div>
          <div style={{ color: "#22212c", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>⚠️ 重要安全声明</div>
          <div style={{ color: "#8b5a2b" }}>
            istarmate 是 AI 辅助的成长伙伴，<b>不提供任何形式的心理治疗、诊断或咨询服务</b>。
            如有心理困扰或紧急情况，请立即拨打：
            <br />
            <b style={{ color: "#c93a28", fontSize: 14 }}>📞 12355 全国青少年服务热线　（24 小时）</b>
            <br />
            或联系信任的成年人 / 学校心理老师 / 专业医疗机构。
          </div>
        </div>

        <div>
          <div style={{ color: "#22212c", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>🪄 我是家长 · 我也想自我成长</div>
          <div>
            同系列产品，面向成年人的 AI 自我探索与家族系统觉察：
            <br />
            <a href="https://www.ilightmate.cn" target="_blank" rel="noreferrer" style={{
              color: "#4b42b4", fontWeight: 700, textDecoration: "none", display: "inline-flex",
              alignItems: "center", gap: 4, marginTop: 4,
            }}>前往知见光伙伴 · ilightmate.cn ↗</a>
            <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
              家长购买知见光专业版/成长版 → 孩子 istarmate 成长版免费（家庭联动，内测中）
            </div>
          </div>
        </div>

        <div>
          <div style={{ color: "#22212c", fontWeight: 700, marginBottom: 8, fontSize: 13 }}>产品 & 法律</div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 4 }}>
            <li><a href="/privacy" style={{ color: "inherit", textDecoration: "none" }}>隐私政策</a></li>
            <li><a href="/terms" style={{ color: "inherit", textDecoration: "none" }}>服务条款</a></li>
            <li><a href="/ai-course/showcase" style={{ color: "inherit", textDecoration: "none" }}>青少年作品墙</a></li>
            <li><a href="/login" style={{ color: "inherit", textDecoration: "none" }}>登录 / 注册</a></li>
          </ul>
          <div style={{ marginTop: 10 }}>
            © {new Date().getFullYear()} istarmate · 心策智能出品
            <br />
            ICP备案信息见 知见光伙伴 ilightmate.cn 底部
          </div>
        </div>
      </div>
    </footer>
  );
}
