import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      if (mode === "register") {
        const r = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        let data = {};
        try { data = await r.json(); } catch {}
        if (!r.ok) { setLoading(false); setError(data.error || "注册失败"); return; }
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (res?.error) setError("登录失败，请检查邮箱或密码");
      else router.push("/home");
    } catch {
      setLoading(false);
      setError("网络异常，请稍后重试");
    }
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "24px 20px",
    }}>
      {/* 背景装饰球 */}
      <div style={{ position: "fixed", top: "-10%", right: "-15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,111,224,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", left: "-10%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(63,167,150,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 400, animation: "slideUp 0.4s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #9B8FF0 0%, #7C6FE0 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, boxShadow: "0 8px 32px rgba(124,111,224,0.4)",
          }}>💟</div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px" }}>IStarMate</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: 0 }}>
            {mode === "login" ? "欢迎回来" : "加入我们"}
          </p>
        </div>

        <div className="card" style={{ padding: "28px 24px" }}>
          <form onSubmit={handleSubmit}>
            <label style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, display: "block", marginBottom: 6 }}>邮箱</label>
            <input className="input" type="email" placeholder="your@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />

            <label style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, display: "block", marginBottom: 6 }}>密码</label>
            <input className="input" type="password"
              placeholder={mode === "register" ? "至少6位" : "••••••••"}
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />

            {error && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#DC2626", fontSize: 13.5 }}>
                {error}
              </div>
            )}

            <button className="btn primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}
            </button>
          </form>

          <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", marginTop: 16, marginBottom: 0 }}>
            {mode === "login" ? "还没有账号？" : "已经有账号？"}
            <a href="#" onClick={e => { e.preventDefault(); setError(""); setMode(mode === "login" ? "register" : "login"); }}
              style={{ color: "var(--purple-deep)", marginLeft: 6, fontWeight: 500, textDecoration: "none" }}>
              {mode === "login" ? "立即注册" : "直接登录"}
            </a>
          </p>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-muted)", marginTop: 20, lineHeight: 1.7 }}>
          注册即表示同意《用户协议》与《隐私政策》<br />未成年用户需在监护人同意下使用本服务
        </p>
      </div>
    </div>
  );
}
