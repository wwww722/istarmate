// pages/api/send-verification.js
// 用户填完邮箱后调用这个接口，生成6位验证码并通过Resend发送邮件。
import { createEmailVerification, getUserByEmail } from "../../lib/db";
import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "只支持 POST" });

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: "请填写邮箱" });

  const normalized = email.trim().toLowerCase();

  // 检查邮箱是否已注册
  const existing = await getUserByEmail(normalized);
  if (existing?.email_verified) {
    return res.status(409).json({ error: "这个邮箱已经注册过了，请直接登录" });
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json({ error: "服务端没有配置 RESEND_API_KEY" });
  }

  // 生成6位数字验证码，10分钟有效
  const token = String(Math.floor(100000 + crypto.randomInt(900000)));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await createEmailVerification(normalized, token, expiresAt);

  // 通过Resend发邮件
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "心情小驿站 <noreply@resend.dev>",
      to: normalized,
      subject: "心情小驿站 — 注册验证码",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="color:#2B2740;margin-bottom:8px;">你好！</h2>
          <p style="color:#6E6C8A;">欢迎注册心情小驿站，你的验证码是：</p>
          <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#8B7FD9;margin:24px 0;">
            ${token}
          </div>
          <p style="color:#6E6C8A;font-size:14px;">验证码10分钟内有效。如果不是你本人操作，请忽略这封邮件。</p>
        </div>
      `,
    }),
  });

  if (!r.ok) {
    const errText = await r.text();
    return res.status(502).json({ error: "发送邮件失败，请稍后重试", detail: errText.slice(0, 200) });
  }

  return res.status(200).json({ ok: true });
}
