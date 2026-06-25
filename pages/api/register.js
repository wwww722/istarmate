// pages/api/register.js
import bcrypt from "bcryptjs";
import { createUser, getUserByEmail } from "../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "邮箱和密码不能为空" });
  if (password.length < 6) return res.status(400).json({ error: "密码至少6位" });

  const normalized = email.trim().toLowerCase();
  const existing = await getUserByEmail(normalized);
  if (existing) return res.status(409).json({ error: "这个邮箱已经注册过了，请直接登录" });

  const hash = await bcrypt.hash(password, 10);
  const user = await createUser(normalized, hash);
  return res.status(200).json({ ok: true, email: user.email });
}
