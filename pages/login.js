import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // login | register-email | register-verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (res?.error) setError("登录失败，请检查邮箱或密码，或者邮箱尚未验证");
      else router.push("/home");
    } catch (err) {
      setLoading(false);
      setError("网络异常，请稍后重试");
    }
  }

  async function handleSendCode(e) {
    e.preventDefault();
    setError(""); setInfo(""); setLoading(true);
    try {
      const r = await fetch("/api/send-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      setLoading(false);
      if (!r.ok) { setError(data.error || "发送失败"); return; }
      setInfo(`验证码已发送到 ${email}，10分钟内有效`);
      setMode("register-verify");
    } catch (err) {
      setLoading(false);
      setError("网络异常，请稍后重试");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const r = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token, password }),
      });
      const data = await r.json();
      if (!r.ok) { setLoading(false); setError(data.error || "注册失败"); return; }
      const res = await signIn("credentials", { email, password, redirect: false });
      setLoading(false);
      if (res?.error) setError("注册成功但自动登录失败，请手动登录");
      else router.push("/home");
    } catch (err) {
      setLoading(false);
      setError("网络异常，请稍后重试");
    }
  }

  return (
    <div className="wrap">
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <h1 style={{ fontSize: 22 }}>心情小驿站</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 6 }}>
          {mode === "login" ? "欢迎回来" : mode === "register-email" ? "创建一个新账号" : "验证你的邮箱"}
        </p>
      </div>

      <div className="card">
        {/* 登录 */}
        {mode === "login" && (
          <form onSubmit={handleLogin}>
            <input className="input" type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} required />
            <input className="input" type="password" placeholder="密码" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{error}</p>}
            <button className="btn primary" type="submit" disabled={loading}>{loading ? "登录中..." : "登录"}</button>
          </form>
        )}

        {/* 注册第一步：填邮箱，发验证码 */}
        {mode === "register-email" && (
          <form onSubmit={handleSendCode}>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginBottom: 12 }}>
              我们会向这个邮箱发送一个验证码，确认是你本人在注册。
            </p>
            <input className="input" type="email" placeholder="邮箱" value={email} onChange={e => setEmail(e.target.value)} required />
            {error && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{error}</p>}
            <button className="btn primary" type="submit" disabled={loading}>{loading ? "发送中..." : "发送验证码"}</button>
          </form>
        )}

        {/* 注册第二步：填验证码+密码 */}
        {mode === "register-verify" && (
          <form onSubmit={handleRegister}>
            {info && <p style={{ color: "var(--teal-deep)", fontSize: 13, marginBottom: 12 }}>{info}</p>}
            <input className="input" type="text" placeholder="6位验证码" value={token} onChange={e => setToken(e.target.value)} required maxLength={6} inputMode="numeric" />
            <input className="input" type="password" placeholder="设置密码（至少6位）" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
            {error && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{error}</p>}
            <button className="btn primary" type="submit" disabled={loading}>{loading ? "注册中..." : "完成注册"}</button>
            <button type="button" className="btn" style={{ marginTop: 8 }} onClick={() => { setMode("register-email"); setError(""); setInfo(""); }}>
              重新获取验证码
            </button>
          </form>
        )}

        <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", marginTop: 14 }}>
          {mode === "login" ? "还没有账号？" : "已经有账号？"}
          <a href="#" onClick={e => { e.preventDefault(); setError(""); setInfo(""); setMode(mode === "login" ? "register-email" : "login"); }} style={{ color: "var(--purple-deep)", marginLeft: 6 }}>
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
