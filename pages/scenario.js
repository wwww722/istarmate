import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export default function Scenario() {
  const router = useRouter();
  const { status } = useSession();
  const [scenario, setScenario] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [choices, setChoices] = useState([]);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
    if (status === "authenticated") load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function load() {
    setLoading(true);
    const r = await fetch("/api/scenario");
    const data = await r.json();
    if (!r.ok) {
      setError(data.error || "加载失败");
      setLoading(false);
      if (data.error === "请先完成问卷") router.push("/questionnaire");
      return;
    }
    setScenario(data.scenario);
    setStepIndex(data.progress.stepIndex || 0);
    setChoices(data.progress.choices || []);
    setCompleted(data.progress.completed || false);
    setLoading(false);
  }

  async function pickOption(optionId, optionText) {
    const nextChoices = [...choices, { step: stepIndex, optionId, text: optionText }];
    const nextStep = stepIndex + 1;
    const isCompleted = nextStep >= scenario.steps.length - 1;

    setChoices(nextChoices);
    setStepIndex(nextStep);
    setCompleted(isCompleted);

    await fetch("/api/scenario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenarioId: scenario.id,
        stepIndex: nextStep,
        choices: nextChoices,
        completed: isCompleted,
      }),
    });
  }

  if (status !== "authenticated" || loading) return null;
  if (error) return <div className="wrap"><p>{error}</p></div>;
  if (!scenario) return null;

  // 把已经走过的每一步 AI 台词 + 用户选择，按顺序拼成对话气泡列表
  const bubbles = [];
  for (let i = 0; i <= stepIndex && i < scenario.steps.length; i++) {
    const s = scenario.steps[i];
    bubbles.push({ role: "ai", text: i === stepIndex && !s.options ? s.closing : s.setup });
    const c = choices.find((ch) => ch.step === i);
    if (c) bubbles.push({ role: "me", text: c.text });
  }

  const currentStep = scenario.steps[stepIndex];
  const isClosing = !currentStep.options;

  return (
    <div className="wrap" style={{ paddingBottom: isClosing ? 40 : 140 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <a href="#" onClick={(e) => { e.preventDefault(); router.push("/dashboard"); }} style={{ color: "var(--ink-soft)", fontSize: 18 }}>←</a>
        <div>
          <p style={{ fontSize: 15, fontWeight: 500, margin: 0 }}>{scenario.title}</p>
          <p style={{ fontSize: 12, color: "var(--ink-soft)", margin: 0 }}>{scenario.role} · 对话练习</p>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        {bubbles.map((b, i) => (
          <div key={i} className={`msg-row ${b.role === "me" ? "me" : ""}`}>
            {b.role === "ai" && <span style={{ fontSize: 20, marginRight: 8 }}>💟</span>}
            <div className={`bubble ${b.role === "me" ? "me" : "ai"}`} style={{ whiteSpace: "pre-line" }}>{b.text}</div>
          </div>
        ))}
      </div>

      {!isClosing && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "var(--bg)",
            borderTop: "1px solid var(--line)",
            padding: "14px 16px",
          }}
        >
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            {currentStep.options.map((o) => (
              <div key={o.id} className="choice-card" style={{ padding: "12px 16px", marginBottom: 8 }} onClick={() => pickOption(o.id, o.text)}>
                {o.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {isClosing && (
        <button className="btn primary" style={{ marginTop: 20 }} onClick={() => router.push("/dashboard")}>
          回到今天
        </button>
      )}
    </div>
  );
}
