// pages/api/register.js
// 验证邮箱验证码后，创建账号（密码加密存储）。
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail, getEmailVerification, markVerificationUsed, markUserVerified } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });

  const { email, password, token } = req.body || {};
  if (!email || !password || !token) return res.status(400).json({ error: "邮箱、验证码、密码不能为空" });
  if (password.length < 6) return res.status(400).json({ error: "密码至少6位" });

  const normalized = email.trim().toLowerCase();

  // 验证验证码
  const verification = await getEmailVerification(normalized, token);
  if (!verification) {
    return res.status(400).json({ error: "验证码错误或已过期，请重新获取" });
  }

  // 检查邮箱是否已注册（已验证的）
  const existing = await getUserByEmail(normalized);
  if (existing?.email_verified) {
    return res.status(409).json({ error: "这个邮箱已经注册过了，请直接登录" });
  }

  // 标记验证码已使用
  await markVerificationUsed(verification.id);

  // 创建账号（或更新已存在但未验证的账号）
  const hash = await bcrypt.hash(password, 10);
  let user;
  if (existing) {
    // 账号存在但未验证，更新密码和验证状态
    await markUserVerified(normalized);
    user = existing;
  } else {
    user = await createUser(normalized, hash);
    await markUserVerified(normalized);
  }

  return res.status(200).json({ ok: true, email: user.email });
}
