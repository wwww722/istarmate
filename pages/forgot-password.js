import { useState } from "react";
import { useRouter } from "next/router";

export default function ForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1=输邮箱 2=答问题 3=成功
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function getQuestion() {
    setError(""); setBusy(true);
    try {
      const r = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "get-question", email }),
      });
      const data = await r.json();
      setBusy(false);
      if (!r.ok) { setError(data.error); return; }
      setQuestion(data.question);
      setStep(2);
    } catch {
      setBusy(false);
      setError("网络异常，请重试");
    }
  }

  async function resetPassword() {
    setError(""); setBusy(true);
    try {
      const r = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", email, answer, newPassword }),
      });
      const data = await r.json();
      setBusy(false);
      if (!r.ok) { setError(data.error); return; }
      setStep(3);
    } catch {
      setBusy(false);
      setError("网络异常，请重试");
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 400, animation: "slideUp 0.4s ease" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>找回密码</h1>
          <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: 0 }}>
            {step === 1 && "输入你注册时的邮箱"}
            {step === 2 && "回答你的安全问题"}
            {step === 3 && "密码已重置成功"}
          </p>
        </div>

        <div className="card" style={{ padding: "26px 24px" }}>
          {step === 1 && (
            <>
              <label style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, display: "block", marginBottom: 6 }}>邮箱</label>
              <input className="input" type="email" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} />
              {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#DC2626", fontSize: 13.5 }}>{error}</div>}
              <button className="btn primary" onClick={getQuestion} disabled={busy || !email}>
                {busy ? "查询中..." : "下一步"}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <div style={{ background: "var(--purple-light)", borderRadius: 12, padding: "12px 14px", marginBottom: 16 }}>
                <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "0 0 4px" }}>你的安全问题</p>
                <p style={{ fontSize: 14.5, fontWeight: 500, margin: 0, color: "var(--purple-deep)" }}>{question}</p>
              </div>
              <label style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, display: "block", marginBottom: 6 }}>你的答案</label>
              <input className="input" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="输入答案" />
              <label style={{ fontSize: 13, color: "var(--ink-soft)", fontWeight: 500, display: "block", marginBottom: 6 }}>设置新密码</label>
              <input className="input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="至少6位" minLength={6} />
              {error && <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", marginBottom: 14, color: "#DC2626", fontSize: 13.5 }}>{error}</div>}
              <button className="btn primary" onClick={resetPassword} disabled={busy || !answer || !newPassword}>
                {busy ? "重置中..." : "重置密码"}
              </button>
            </>
          )}

          {step === 3 && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
              <p style={{ fontSize: 15, color: "var(--ink)", marginBottom: 20, lineHeight: 1.7 }}>
                密码已重置成功！<br />现在可以用新密码登录了。
              </p>
              <button className="btn primary" onClick={() => router.push("/login")}>去登录 →</button>
            </div>
          )}
        </div>

        {step !== 3 && (
          <p style={{ textAlign: "center", fontSize: 13.5, marginTop: 18 }}>
            <a href="#" onClick={e => { e.preventDefault(); router.push("/login"); }} style={{ color: "var(--purple-deep)", textDecoration: "none" }}>← 返回登录</a>
          </p>
        )}
      </div>
    </div>
  );
}
