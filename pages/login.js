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
    setError("");
    setLoading(true);
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
    } catch (err) {
      setLoading(false);
      setError("网络异常，请稍后重试");
    }
  }

  return (
    <div className="wrap">
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <h1 style={{ fontSize: 22 }}>IStarMate</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 6 }}>
          {mode === "login" ? "欢迎回来" : "创建一个新账号"}
        </p>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit}>
          <input className="input" type="email" placeholder="邮箱" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
          <input className="input" type="password"
            placeholder={mode === "register" ? "设置密码（至少6位）" : "密码"}
            value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          {error && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{error}</p>}
          <button className="btn primary" type="submit" disabled={loading}>
            {loading ? "处理中..." : mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", marginTop: 14 }}>
          {mode === "login" ? "还没有账号？" : "已经有账号？"}
          <a href="#" onClick={(e) => { e.preventDefault(); setError(""); setMode(mode === "login" ? "register" : "login"); }}
            style={{ color: "var(--purple-deep)", marginLeft: 6 }}>
            {mode === "login" ? "立即注册" : "直接登录"}
          </a>
        </p>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, color: "var(--ink-soft)", marginTop: 18 }}>
        注册即表示同意《用户协议》与《隐私政策》。未成年用户需在监护人同意下使用本服务。
      </p>
    </div>
  );
}
