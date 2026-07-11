import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";

export default function Account() {
  const router = useRouter();
  const { status } = useSession();
  const [panel, setPanel] = useState(null); // null | 'email' | 'password' | 'delete'
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // 表单字段
  const [newEmail, setNewEmail] = useState("");
  const [pwForEmail, setPwForEmail] = useState("");
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [delPw, setDelPw] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  function reset() {
    setMsg(""); setErr("");
    setNewEmail(""); setPwForEmail(""); setOldPw(""); setNewPw(""); setDelPw("");
  }

  async function changeEmail() {
    setErr(""); setMsg(""); setBusy(true);
    const r = await fetch("/api/account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-email", newEmail, password: pwForEmail }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(data.error || "修改失败"); return; }
    setMsg("邮箱已更新，下次请用新邮箱登录。");
    setNewEmail(""); setPwForEmail("");
  }

  async function changePassword() {
    setErr(""); setMsg(""); setBusy(true);
    const r = await fetch("/api/account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "change-password", oldPassword: oldPw, newPassword: newPw }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(data.error || "修改失败"); return; }
    setMsg("密码已更新。");
    setOldPw(""); setNewPw("");
  }

  async function deleteAccount() {
    if (!confirm("确定要删除账号吗？所有数据将被永久清除，无法恢复。")) return;
    setErr(""); setBusy(true);
    const r = await fetch("/api/account", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete-account", password: delPw }),
    });
    const data = await r.json();
    setBusy(false);
    if (!r.ok) { setErr(data.error || "删除失败"); return; }
    alert("账号已删除。感谢你曾经的陪伴。");
    signOut({ callbackUrl: "/" });
  }

  async function exportData() {
    setBusy(true);
    try {
      const r = await fetch("/api/account?action=export");
      const data = await r.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `istarmate-我的数据-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErr("导出失败，请稍后重试");
    }
    setBusy(false);
  }

  if (status !== "authenticated") return null;

  const menuItems = [
    { key: "email", icon: "📧", label: "修改邮箱" },
    { key: "password", icon: "🔑", label: "修改密码" },
  ];

  return (
    <div className="wrap" style={{ maxWidth: 480 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); panel ? (setPanel(null), reset()) : router.push("/dashboard"); }}
          style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <h2 style={{ fontSize: 19, margin: 0 }}>{panel ? { email: "修改邮箱", password: "修改密码", delete: "删除账号" }[panel] : "账号设置"}</h2>
      </div>

      {/* 主菜单 */}
      {!panel && (
        <>
          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            {menuItems.map((item, i) => (
              <button key={item.key} onClick={() => { reset(); setPanel(item.key); }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "16px 18px", background: "transparent", border: "none",
                  borderTop: i > 0 ? "1px solid var(--line)" : "none",
                  cursor: "pointer", fontSize: 14.5, color: "var(--ink)", textAlign: "left",
                }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ color: "var(--ink-muted)" }}>›</span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
            <button onClick={exportData} disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14.5, color: "var(--ink)", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>📦</span>
              <span style={{ flex: 1 }}>{busy ? "导出中..." : "导出我的数据"}</span>
              <span style={{ color: "var(--ink-muted)" }}>›</span>
            </button>
          </div>

          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <button onClick={() => { reset(); setPanel("delete"); }}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer", fontSize: 14.5, color: "#D85A30", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>🗑️</span>
              <span style={{ flex: 1 }}>删除账号</span>
              <span style={{ color: "var(--ink-muted)" }}>›</span>
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 12.5, color: "var(--ink-muted)", marginTop: 20, lineHeight: 1.7 }}>
            <a href="#" onClick={(e) => { e.preventDefault(); router.push("/terms"); }} style={{ color: "var(--ink-soft)" }}>用户协议</a>
            {" · "}
            <a href="#" onClick={(e) => { e.preventDefault(); router.push("/privacy"); }} style={{ color: "var(--ink-soft)" }}>隐私政策</a>
          </p>
        </>
      )}

      {/* 改邮箱 */}
      {panel === "email" && (
        <div className="card" style={{ padding: "22px 20px" }}>
          <input className="input" type="email" placeholder="新邮箱" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
          <input className="input" type="password" placeholder="当前密码（验证身份）" value={pwForEmail} onChange={e => setPwForEmail(e.target.value)} />
          {err && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{err}</p>}
          {msg && <p style={{ color: "var(--teal-deep)", fontSize: 13 }}>{msg}</p>}
          <button className="btn primary" onClick={changeEmail} disabled={busy || !newEmail || !pwForEmail}>
            {busy ? "处理中..." : "确认修改"}
          </button>
        </div>
      )}

      {/* 改密码 */}
      {panel === "password" && (
        <div className="card" style={{ padding: "22px 20px" }}>
          <input className="input" type="password" placeholder="当前密码" value={oldPw} onChange={e => setOldPw(e.target.value)} />
          <input className="input" type="password" placeholder="新密码（至少6位）" value={newPw} onChange={e => setNewPw(e.target.value)} minLength={6} />
          {err && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{err}</p>}
          {msg && <p style={{ color: "var(--teal-deep)", fontSize: 13 }}>{msg}</p>}
          <button className="btn primary" onClick={changePassword} disabled={busy || !oldPw || !newPw}>
            {busy ? "处理中..." : "确认修改"}
          </button>
        </div>
      )}

      {/* 删账号 */}
      {panel === "delete" && (
        <div className="card" style={{ padding: "22px 20px" }}>
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ color: "#DC2626", fontSize: 13.5, margin: 0, lineHeight: 1.6 }}>
              删除账号后，你的所有数据——包括情绪记录、对话、成就、代码项目——都会被<strong>永久清除，无法恢复</strong>。
            </p>
          </div>
          <input className="input" type="password" placeholder="输入密码确认删除" value={delPw} onChange={e => setDelPw(e.target.value)} />
          {err && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{err}</p>}
          <button className="btn" style={{ background: "#D85A30", color: "#fff", border: "none" }} onClick={deleteAccount} disabled={busy || !delPw}>
            {busy ? "处理中..." : "永久删除我的账号"}
          </button>
        </div>
      )}
    </div>
  );
}
