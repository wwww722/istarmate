import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/router";

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleCredentials(e) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("登录失败，请检查邮箱或密码");
    } else {
      router.push("/home");
    }
  }

  return (
    <div className="wrap">
      <div style={{ textAlign: "center", marginBottom: 26 }}>
        <h1 style={{ fontSize: 22 }}>心情小驿站</h1>
        <p style={{ color: "var(--ink-soft)", fontSize: 14, marginTop: 6 }}>
          {mode === "login" ? "欢迎回来" : "创建一个新账号"}
        </p>
      </div>

      <div className="card">
        <button className="btn" onClick={() => signIn("google", { callbackUrl: "/home" })}>
          使用谷歌账号{mode === "login" ? "登录" : "注册"}
        </button>
        <button className="btn" onClick={() => signIn("apple", { callbackUrl: "/home" })}>
          使用苹果账号{mode === "login" ? "登录" : "注册"}
        </button>
        <button className="btn" onClick={() => signIn("wechat", { callbackUrl: "/home" })}>
          使用微信{mode === "login" ? "登录" : "注册"}
        </button>

        <div className="divider">或使用邮箱</div>

        <form onSubmit={handleCredentials}>
          <input
            className="input"
            type="email"
            placeholder="邮箱"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="input"
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{error}</p>}
          <button className="btn primary" type="submit">
            {mode === "login" ? "登录" : "注册并登录"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 13.5, color: "var(--ink-soft)", marginTop: 14 }}>
          {mode === "login" ? "还没有账号？" : "已经有账号？"}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setMode(mode === "login" ? "register" : "login");
            }}
            style={{ color: "var(--coral-deep)", marginLeft: 6 }}
          >
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
