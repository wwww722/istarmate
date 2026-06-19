import { useState } from "react";
import { useRouter } from "next/router";

export default function Onboarding() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");

  function next(e) {
    e.preventDefault();
    const profile = { nickname, age, gender };
    localStorage.setItem("istarmate_profile", JSON.stringify(profile));
    router.push("/questionnaire");
  }

  return (
    <div className="wrap">
      <h2 style={{ fontSize: 20, marginBottom: 6 }}>先认识一下你</h2>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, marginBottom: 22 }}>
        这些信息只用来让陪伴更贴心，不会被分享给其他人。
      </p>

      <form className="card" onSubmit={next}>
        <label style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>怎么称呼你？</label>
        <input
          className="input"
          placeholder="昵称都可以"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />

        <label style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>年龄</label>
        <input
          className="input"
          type="number"
          min="8"
          max="20"
          placeholder="例如 14"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          required
        />

        <label style={{ fontSize: 13.5, color: "var(--ink-soft)" }}>性别</label>
        <select className="input" value={gender} onChange={(e) => setGender(e.target.value)} required>
          <option value="">请选择</option>
          <option value="女">女</option>
          <option value="男">男</option>
          <option value="不想说">不想说 / 其他</option>
        </select>

        <button className="btn primary" type="submit">
          下一步：心情自评 →
        </button>
      </form>
    </div>
  );
}
