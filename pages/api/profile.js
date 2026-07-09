// pages/api/profile.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { saveProfile, getProfile } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  if (req.method === "GET") {
    const profile = await getProfile(userId);
    return res.status(200).json({ profile });
  }

  if (req.method === "POST") {
    const { nickname, age, gender, avatarName, avatarEmoji, avatarCode } = req.body || {};
    if (nickname || age || gender) {
      if (!nickname || !age || !gender) return res.status(400).json({ error: "请填完称呼、年龄、性别" });
    }
    const existing = await getProfile(userId);
    await saveProfile(userId, {
      nickname: nickname || existing?.nickname,
      age: age ? Number(age) : existing?.age,
      gender: gender || existing?.gender,
      avatarName, avatarEmoji, avatarCode,
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: "不支持的方法" });
}
