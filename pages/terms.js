import { useRouter } from "next/router";

export default function Terms() {
  const router = useRouter();
  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.back(); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>用户协议</h2>
      </div>

      <div className="card" style={{ padding: "24px 22px", lineHeight: 1.8, fontSize: 14 }}>
        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 0 }}>最近更新：2026年7月</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>1. 关于 IStarMate</h3>
        <p>IStarMate（以下简称"本服务"）是一个面向青少年的情绪陪伴与 AI 素养学习平台。本服务提供情绪自评、AI 对话陪伴、情景练习和编程学习等功能。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>2. 本服务不是医疗服务</h3>
        <p>本服务提供的所有内容，包括情绪评估结果和 AI 对话，仅供参考和自我了解，<strong>不构成医学诊断、心理治疗或专业医疗建议</strong>。如果你正在经历严重的情绪困扰、心理危机或有伤害自己的念头，请立即联系信任的成年人、专业心理咨询师，或拨打心理援助热线 400-161-9995。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>3. 未成年人使用</h3>
        <p>本服务主要面向青少年。如果你未满 18 岁，你需要在监护人知情并同意的情况下使用本服务。监护人有权了解、管理未成年人在本服务上的使用情况和数据。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>4. 你的责任</h3>
        <p>你应对自己账号下的活动负责，妥善保管密码。你同意不会滥用本服务、不上传违法或伤害他人的内容、不试图破坏系统安全。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>5. AI 生成内容</h3>
        <p>本服务的对话和练习内容由人工智能生成。AI 可能会产生不准确或不恰当的回应。我们已尽力优化，但无法保证 AI 回应完全正确。请理性看待 AI 的建议。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>6. 服务变更</h3>
        <p>我们可能会更新、调整或暂停部分功能。重大变更会尽量提前告知。</p>

        <h3 style={{ fontSize: 15.5, marginTop: 20, marginBottom: 8 }}>7. 联系我们</h3>
        <p>如对本协议有任何疑问，可通过应用内的反馈渠道联系我们。</p>

        <p style={{ color: "var(--ink-soft)", fontSize: 12.5, marginTop: 24, marginBottom: 0 }}>
          本协议为学生项目的基础版本，实际投入使用前建议由法律专业人士审核完善。
        </p>
      </div>
    </div>
  );
}
