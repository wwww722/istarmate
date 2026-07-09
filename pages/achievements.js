import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { ACHIEVEMENTS } from "../lib/achievements";

export default function AchievementsPage() {
  const router = useRouter();
  const { status } = useSession();
  const [unlocked, setUnlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    const r = await fetch("/api/checkin");
    const data = await r.json();
    setUnlocked(data.achievements || []);
    setLoading(false);
  }

  if (status !== "authenticated" || loading) return null;

  return (
    <div className="wrap">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>我的成就</h2>
      </div>

      <p style={{ color: "var(--ink-soft)", fontSize: 13.5, marginBottom: 20 }}>
        已解锁 {unlocked.length} / {ACHIEVEMENTS.length} 个
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {ACHIEVEMENTS.map((a) => {
          const isUnlocked = unlocked.includes(a.id);
          return (
            <div key={a.id} className="card" style={{
              padding: "16px 14px", textAlign: "center",
              opacity: isUnlocked ? 1 : 0.4,
              filter: isUnlocked ? "none" : "grayscale(1)",
              position: "relative",
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{a.emoji}</div>
              <p style={{ fontWeight: 500, fontSize: 13.5, margin: "0 0 4px" }}>{a.title}</p>
              <p style={{ color: "var(--ink-soft)", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{a.desc}</p>
              {!isUnlocked && (
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  fontSize: 12, color: "var(--ink-soft)"
                }}>🔒</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
