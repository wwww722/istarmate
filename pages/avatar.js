import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { randomAvatar } from "../lib/avatars";

export default function Avatar() {
  const router = useRouter();
  const { status } = useSession();
  const [avatar, setAvatar] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated" && !avatar) setAvatar(randomAvatar());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function confirm() {
    setSaving(true);
    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarName: avatar.name, avatarEmoji: avatar.emoji, avatarCode: avatar.code }),
    });
    setSaving(false);
    router.push("/questionnaire");
  }

  if (status !== "authenticated" || !avatar) return null;

  return (
    <div className="wrap" style={{ textAlign: "center", paddingTop: 60 }}>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 30 }}>你的代号是…</p>
      <div className="avatar-circle">{avatar.emoji}</div>
      <h2 style={{ fontSize: 24, margin: "20px 0 4px" }}>{avatar.name}</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14 }}>{avatar.name} #{avatar.code}</p>
      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginTop: 18, lineHeight: 1.8 }}>
        这是你在IStarMate的代号。<br />每个代号都是独一无二的。
      </p>
      <button className="btn primary" style={{ marginTop: 32 }} onClick={confirm} disabled={saving}>
        {saving ? "保存中..." : "就是这个！→"}
      </button>
    </div>
  );
}
