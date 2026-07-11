// pages/api/account.js
// 账号设置：改邮箱、改密码、删账号、导出数据
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import bcrypt from "bcryptjs";
import {
  getUserById, getUserByEmail, updateUserEmail, updateUserPassword,
  deleteUserAccount, getProfile, getLatestQuestionnaire, getMoodLogs,
  getAchievements, getCodeSnippets,
} from "../../lib/db";

// 需要读取带 password_hash 的完整用户记录来校验旧密码
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);

async function getFullUser(userId) {
  const rows = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
  return rows[0] || null;
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  // 导出数据
  if (req.method === "GET" && req.query.action === "export") {
    const [profile, questionnaire, moods, achievements, snippets, user] = await Promise.all([
      getProfile(userId),
      getLatestQuestionnaire(userId),
      getMoodLogs(userId, 365),
      getAchievements(userId),
      getCodeSnippets(userId),
      getUserById(userId),
    ]);
    const exportData = {
      导出时间: new Date().toISOString(),
      账号: { 邮箱: user?.email },
      个人资料: profile ? {
        昵称: profile.nickname, 年龄: profile.age, 性别: profile.gender,
        动物代号: `${profile.avatar_name || ""} #${profile.avatar_code || ""}`,
      } : null,
      最近一次情绪自评: questionnaire ? {
        时间: questionnaire.created_at,
        各维度: questionnaire.domains,
      } : null,
      心情打卡记录: moods.map(m => ({ 日期: m.log_date, 心情: m.mood })),
      已解锁成就: achievements.map(a => a.achievement_id),
      我的代码项目: snippets.map(s => ({ 标题: s.title, 时间: s.created_at })),
    };
    return res.status(200).json(exportData);
  }

  // 改邮箱
  if (req.method === "POST" && req.body?.action === "change-email") {
    const { newEmail, password } = req.body;
    if (!newEmail || !password) return res.status(400).json({ error: "请填写完整" });
    const normalized = newEmail.trim().toLowerCase();
    const user = await getFullUser(userId);
    if (!user) return res.status(404).json({ error: "用户不存在" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "密码不正确" });
    const existing = await getUserByEmail(normalized);
    if (existing && Number(existing.id) !== userId) return res.status(409).json({ error: "这个邮箱已被其他账号使用" });
    await updateUserEmail(userId, normalized);
    return res.status(200).json({ ok: true });
  }

  // 改密码
  if (req.method === "POST" && req.body?.action === "change-password") {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "请填写完整" });
    if (newPassword.length < 6) return res.status(400).json({ error: "新密码至少6位" });
    const user = await getFullUser(userId);
    if (!user) return res.status(404).json({ error: "用户不存在" });
    const ok = await bcrypt.compare(oldPassword, user.password_hash);
    if (!ok) return res.status(400).json({ error: "当前密码不正确" });
    const hash = await bcrypt.hash(newPassword, 10);
    await updateUserPassword(userId, hash);
    return res.status(200).json({ ok: true });
  }

  // 删账号
  if (req.method === "POST" && req.body?.action === "delete-account") {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: "请输入密码确认" });
    const user = await getFullUser(userId);
    if (!user) return res.status(404).json({ error: "用户不存在" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "密码不正确" });
    await deleteUserAccount(userId);
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的操作" });
}
