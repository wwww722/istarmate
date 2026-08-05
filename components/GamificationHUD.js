import { useEffect, useState } from "react";

export default function GamificationHUD() {
  const [snap, setSnap] = useState(null);
  const [showTasks, setShowTasks] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const r = await fetch("/api/gamification/sync");
      const d = await r.json();
      if (d.ok) setSnap(d.snap);
    } catch {}
  }

  useEffect(() => {
    function onAward(e) {
      const aw = e.detail?.justAwarded || e.detail;
      if (!aw) return;
      const parts = [];
      if (aw.xp) parts.push(`+${aw.xp} XP`);
      if (aw.stardust) parts.push(`+${aw.stardust} ✨`);
      if (!parts.length) return;
      setToast(parts.join("　"));
      setTimeout(() => setToast(null), 2200);
      load();
    }
    window.addEventListener("istarmate-award", onAward);
    return () => window.removeEventListener("istarmate-award", onAward);
  }, []);

  if (!snap) return null;
  // 防御：任一关键子字段缺失就不渲染，避免整站白屏
  if (!snap.league || !snap.nextLeague || typeof snap.xp !== "number") return null;
  const nextMin = Math.max(snap.nextLeague.min, snap.league.min + 1);
  const curIn = Math.max(0, snap.xp - snap.league.min);
  const need = Math.max(1, nextMin - snap.league.min);
  const pct = Math.min(100, Math.floor((curIn / need) * 100));

  return (
    <div style={{
      position: "relative",
      background: "linear-gradient(135deg, rgba(255,255,255,0.88), rgba(245,240,255,0.88))",
      borderBottom: "1px solid rgba(124,111,224,0.16)",
      backdropFilter: "blur(10px)",
      padding: "8px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
      fontSize: 13, zIndex: 50,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: "#E5484D" }}>
        <span style={{ fontSize: 16 }}>🔥</span><span>{snap.streak} 天连胜</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 260px", minWidth: 200 }}>
        <span style={{ fontSize: 18 }}>{snap.league.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#6b6a80", marginBottom: 3 }}>
            <span style={{ fontWeight: 600, color: "#22212c" }}>{snap.league.name}</span>
            <span>{snap.xp} / {nextMin} XP</span>
          </div>
          <div style={{ height: 6, background: "rgba(124,111,224,0.12)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg, #7c6fe0, #ff6fb3)", transition: "width .4s ease" }} />
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 600, color: "#B58900" }}>
        <span style={{ fontSize: 16 }}>✨</span><span>{snap.stardust}</span>
      </div>
      <TierBadge tier={snap.tier} />
      <button onClick={() => setShowTasks(true)} style={{
        background: "#7c6fe0", color: "#fff", border: "none", borderRadius: 999,
        padding: "6px 14px", fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      }}>📋 每日任务</button>

      {toast && (
        <div style={{
          position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)",
          background: "linear-gradient(135deg, #ff6fb3, #7c6fe0)", color: "#fff",
          padding: "8px 18px", borderRadius: 999, fontWeight: 700, fontSize: 14,
          boxShadow: "0 10px 30px rgba(124,111,224,0.35)",
          animation: "istarmateFloater 2.2s ease forwards", zIndex: 9999,
        }}>{toast}</div>
      )}
      {showTasks && <DailyTasksModal onClose={() => setShowTasks(false)} snap={snap} reload={load} />}
      <style>{`@keyframes istarmateFloater { 0%{transform:translate(-50%,20px);opacity:0} 15%{transform:translate(-50%,0);opacity:1} 85%{transform:translate(-50%,0);opacity:1} 100%{transform:translate(-50%,-30px);opacity:0} }`}</style>
    </div>
  );
}

function TierBadge({ tier }) {
  const cfg = {
    free:    { bg: "rgba(124,111,224,0.12)", color: "#4b42b4", label: "免费版" },
    growth:  { bg: "linear-gradient(135deg,#8be9fd,#5ed5e5)", color: "#065a6a", label: "🌱 成长版" },
    premium: { bg: "linear-gradient(135deg,#b8aeff,#9084ff)", color: "#2a1a7a", label: "💎 高级版" },
  }[tier] || { bg: "rgba(0,0,0,0.05)", color: "#333", label: tier };
  return (
    <div style={{
      padding: "3px 10px", borderRadius: 999, fontWeight: 600, fontSize: 12,
      background: cfg.bg, color: cfg.color,
    }}>
      {cfg.label}
    </div>
  );
}

function DailyTasksModal({ onClose, snap }) {
  if (!snap) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,20,60,0.35)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 420, background: "#fff", borderRadius: 20, padding: 22,
        boxShadow: "0 30px 80px rgba(30,20,60,0.2)", border: "1px solid rgba(124,111,224,0.1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#22212c" }}>📋 今日任务</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#888" }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {snap.tasks.map(t => {
            const pct = Math.min(100, Math.floor((t.progress / t.target) * 100));
            return (
              <div key={t.code} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 14,
                background: t.completed ? "linear-gradient(135deg,#f0fff4,#e6fff0)" : "rgba(0,0,0,0.02)",
                border: "1px solid " + (t.completed ? "rgba(60,180,120,0.25)" : "rgba(124,111,224,0.1)"),
              }}>
                <div style={{ fontSize: 24 }}>{t.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: t.completed ? "#1f7a4c" : "#22212c", marginBottom: 4 }}>
                    <span>{t.title}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 500, color: t.completed ? "#1f7a4c" : "#888" }}>+{t.xp} XP　+{t.stardust} ✨</span>
                  </div>
                  <div style={{ height: 5, background: "rgba(124,111,224,0.1)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", background: t.completed ? "linear-gradient(90deg,#3cb478,#5ddca7)" : "linear-gradient(90deg,#7c6fe0,#ff6fb3)" }} />
                  </div>
                  <div style={{ fontSize: 11, marginTop: 3, color: "#888" }}>进度 {t.progress}/{t.target} {t.completed && <span style={{ color: "#1f7a4c", fontWeight: 600 }}>✅ 已完成，奖励已入账</span>}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 16, padding: 12, background: "linear-gradient(135deg,#fff4e0,#fff9f0)", borderRadius: 12, fontSize: 12, color: "#8a5a10" }}>
          💡 和许安和、余生聊天、呼吸练习、运行代码、心情打卡都能完成任务拿 XP 和星光币，连胜 3/7 天还有额外奖励哦！
        </div>
      </div>
    </div>
  );
}
