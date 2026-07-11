// pages/api/code-versions.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getCodeVersions, getCodeVersion, updateCodeSnippet, saveCodeVersion } from "../../lib/db";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "请先登录" });
  const userId = Number(session.userId);

  // 列出某项目的版本历史
  if (req.method === "GET") {
    if (req.query.versionId) {
      const version = await getCodeVersion(userId, Number(req.query.versionId));
      if (!version) return res.status(404).json({ error: "版本不存在" });
      return res.status(200).json({ version });
    }
    const { snippetId } = req.query;
    if (!snippetId) return res.status(400).json({ error: "缺少 snippetId" });
    const versions = await getCodeVersions(userId, Number(snippetId));
    return res.status(200).json({ versions });
  }

  // 回滚到某个版本
  if (req.method === "POST") {
    const { snippetId, versionId } = req.body || {};
    if (!snippetId || !versionId) return res.status(400).json({ error: "缺少参数" });
    const version = await getCodeVersion(userId, Number(versionId));
    if (!version) return res.status(404).json({ error: "版本不存在" });
    // 回滚：把该版本的代码写回项目，并作为新版本记录（保留历史链）
    await updateCodeSnippet(userId, Number(snippetId), version.code);
    await saveCodeVersion(userId, Number(snippetId), version.code, "回滚到历史版本");
    return res.status(200).json({ ok: true, code: version.code });
  }

  return res.status(405).end();
}
