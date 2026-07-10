import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { AchievementPopup } from "../components/PageTransition";

export default function InvitePage() {
  const router = useRouter();
  const { status } = useSession();
  const [code, setCode] = useState("");
  const [inviteCount, setInviteCount] = useState(0);
  const [inputCode, setInputCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [newAchievements, setNewAchievements] = useState([]);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const r = await fetch("/api/invite");
    const data = await r.json();
    setCode(data.code || "");
    setInviteCount(data.inviteCount || 0);
  }

  function copyCode() {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function useCode() {
    setError(""); setMessage("");
    if (!inputCode.trim()) return;
    const r = await fetch("/api/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: inputCode.trim() }),
    });
    const data = await r.json();
    if (!r.ok) { setError(data.error || "邀请码无效"); return; }
    setMessage("🎉 邀请码使用成功！双方都获得了专属成就。");
    if (data.newlyUnlocked?.length) setNewAchievements(data.newlyUnlocked);
    setInputCode("");
  }

  if (status !== "authenticated") return null;

  const shareText = `我在用IStarMate，一个帮你了解自己情绪的AI陪伴应用。用我的邀请码 ${code} 注册，咱们一起解锁专属成就！https://istarmate.vercel.app`;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>邀请朋友</h2>
      </div>

      {/* 我的邀请码 */}
      <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: "24px 22px" }}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 8px" }}>你的专属邀请码</p>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.12em", color: "var(--purple)", margin: "0 0 16px" }}>
          {code || "加载中..."}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button className="btn primary" style={{ width: "auto", padding: "9px 20px" }} onClick={copyCode}>
            {copied ? "✓ 已复制" : "📋 复制邀请码"}
          </button>
          <button className="btn" style={{ width: "auto", padding: "9px 20px" }}
            onClick={() => { if (navigator.share) { navigator.share({ title: "IStarMate", text: shareText }); } else { navigator.clipboard?.writeText(shareText); alert("分享文字已复制！"); } }}>
            📤 分享
          </button>
        </div>
        {inviteCount > 0 && (
          <p style={{ fontSize: 13, color: "var(--teal-deep)", marginTop: 14, marginBottom: 0 }}>
            🎉 已有 {inviteCount} 位朋友通过你的邀请码加入
          </p>
        )}
      </div>

      {/* 使用邀请码 */}
      <div className="card" style={{ padding: "20px 22px" }}>
        <p style={{ fontSize: 14.5, fontWeight: 500, margin: "0 0 6px" }}>输入朋友的邀请码</p>
        <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "0 0 14px" }}>
          双方都会解锁专属成就徽章 🏆
        </p>
        <input className="input" placeholder="例如：ISM123ABC" value={inputCode}
          onChange={e => setInputCode(e.target.value.toUpperCase())}
          style={{ letterSpacing: "0.05em", fontWeight: 500 }} />
        {error && <p style={{ color: "var(--coral-deep)", fontSize: 13, margin: "-4px 0 10px" }}>{error}</p>}
        {message && <p style={{ color: "var(--teal-deep)", fontSize: 13, margin: "-4px 0 10px" }}>{message}</p>}
        <button className="btn primary" onClick={useCode} disabled={!inputCode.trim()}>
          使用邀请码
        </button>
      </div>

      {newAchievements.length > 0 && (
        <AchievementPopup achievementIds={newAchievements} onClose={() => setNewAchievements([])} />
      )}
    </div>
  );
}
