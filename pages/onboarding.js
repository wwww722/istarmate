import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function Onboarding() {
  const router = useRouter();
  const { status } = useSession();
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  async function next(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nickname, age, gender }),
    });
    setLoading(false);
    if (!r.ok) {
      const data = await r.json();
      setError(data.error || "保存失败，请重试");
      return;
    }
    router.push("/avatar");
  }

  if (status !== "authenticated") return null;

  return (
    <div className="wrap">
      <p style={{ fontSize: 12.5, color: "var(--purple-deep)", letterSpacing: ".04em", marginBottom: 6 }}>第一步</p>
      <h2 style={{ fontSize: 20, marginBottom: 6 }}>先认识一下你</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22 }}>
        这些信息只用来让陪伴更贴心，会安全地存起来，不会被分享给其他人。
      </p>

      <form className="card" onSubmit={next}>
        <label style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>怎么称呼你？</label>
        <input className="input" placeholder="昵称都可以" value={nickname} onChange={(e) => setNickname(e.target.value)} required />

        <label style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>年龄</label>
        <input className="input" type="number" min="8" max="20" placeholder="例如 14" value={age} onChange={(e) => setAge(e.target.value)} required />

        <label style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>性别</label>
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value)} required>
          <option value="">请选择</option>
          <option value="女">女</option>
          <option value="男">男</option>
          <option value="不想说">不想说 / 其他</option>
        </select>

        {error && <p style={{ color: "var(--coral-deep)", fontSize: 13 }}>{error}</p>}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "保存中..." : "下一步：心情自评 →"}
        </button>
      </form>
    </div>
  );
}
