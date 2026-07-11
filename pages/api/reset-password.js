// pages/api/reset-password.js - 通过安全问题重置密码
import bcrypt from "bcryptjs";
import { getSecurityQuestion, verifySecurityAnswer, resetPasswordByEmail } from "../../lib/db";

export default async function handler(req, res) {
  const { action, email, answer, newPassword } = req.body || {};

  if (req.method !== "POST") return res.status(405).end();
  if (!email) return res.status(400).json({ error: "缺少邮箱" });

  const normalized = email.trim().toLowerCase();

  // 第一步：获取该邮箱的安全问题
  if (action === "get-question") {
    const question = await getSecurityQuestion(normalized);
    if (!question) {
      return res.status(404).json({ error: "该邮箱没有设置安全问题，无法自助找回。请联系管理员。" });
    }
    return res.status(200).json({ question });
  }

  // 第二步：验证答案并重置密码
  if (action === "reset") {
    if (!answer || !newPassword) return res.status(400).json({ error: "缺少答案或新密码" });
    if (newPassword.length < 6) return res.status(400).json({ error: "新密码至少6位" });

    const user = await verifySecurityAnswer(normalized);
    if (!user || !user.security_answer_hash) {
      return res.status(404).json({ error: "无法验证，请联系管理员" });
    }

    const ok = await bcrypt.compare(answer.trim().toLowerCase(), user.security_answer_hash);
    if (!ok) return res.status(403).json({ error: "答案不正确" });

    const hash = await bcrypt.hash(newPassword, 10);
    await resetPasswordByEmail(normalized, hash);
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: "未知操作" });
}
