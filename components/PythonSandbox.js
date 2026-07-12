// components/PythonSandbox.js
// 浏览器内跑真实 Python，用 Pyodide（CPython 编译成 WebAssembly）
// 从 CDN 加载，不增加打包体积
import { useEffect, useRef, useState } from "react";

const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js";

export default function PythonSandbox({ code, onCodeChange, onError }) {
  const [pyodide, setPyodide] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | running | error
  const [output, setOutput] = useState("");
  const [localCode, setLocalCode] = useState(code || "");
  const outRef = useRef("");

  // 加载 Pyodide
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        if (!window.loadPyodide) {
          await new Promise((resolve, reject) => {
            const s = document.createElement("script");
            s.src = PYODIDE_URL;
            s.onload = resolve;
            s.onerror = () => reject(new Error("Pyodide 加载失败"));
            document.head.appendChild(s);
          });
        }
        const py = await window.loadPyodide({
          stdout: (t) => { outRef.current += t + "\n"; setOutput(outRef.current); },
          stderr: (t) => { outRef.current += t + "\n"; setOutput(outRef.current); },
        });
        if (cancelled) return;
        setPyodide(py);
        setStatus("ready");
      } catch (e) {
        if (!cancelled) { setStatus("error"); setOutput("Python 环境加载失败：" + e.message); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // 外部代码变化时同步
  useEffect(() => {
    if (code !== undefined && code !== localCode) setLocalCode(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function run() {
    if (!pyodide || status === "running") return;
    setStatus("running");
    outRef.current = "";
    setOutput("");
    onError?.(null);
    try {
      await pyodide.runPythonAsync(localCode);
      setStatus("ready");
    } catch (e) {
      const msg = String(e.message || e).split("\n").slice(-4).join("\n");
      outRef.current += "\n❌ " + msg;
      setOutput(outRef.current);
      setStatus("ready");
      onError?.(msg);
    }
  }

  function handleEdit(v) {
    setLocalCode(v);
    onCodeChange?.(v);
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#1e1e2e" }}>
      {/* 工具栏 */}
      <div style={{ padding: "8px 12px", borderBottom: "1px solid #2a2a3e", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12, color: "#9399b2", fontWeight: 500 }}>🐍 main.py</span>
        <span style={{ fontSize: 11, color: status === "ready" ? "#a6e3a1" : status === "error" ? "#f38ba8" : "#f9e2af" }}>
          {status === "loading" ? "正在加载 Python 环境..." : status === "running" ? "运行中..." : status === "error" ? "环境加载失败" : "就绪"}
        </span>
        <button onClick={run} disabled={status !== "ready"}
          style={{ marginLeft: "auto", background: status === "ready" ? "#a6e3a1" : "#45475a", color: status === "ready" ? "#1e1e2e" : "#6c7086", border: "none", padding: "5px 14px", borderRadius: 8, cursor: status === "ready" ? "pointer" : "default", fontSize: 12, fontWeight: 600 }}>
          ▶ 运行
        </button>
      </div>

      {/* 代码编辑 */}
      <textarea
        value={localCode}
        onChange={e => handleEdit(e.target.value)}
        spellCheck={false}
        style={{
          flex: 1, background: "#1e1e2e", color: "#cdd6f4", border: "none", outline: "none",
          padding: "14px 16px", fontSize: 13.5, lineHeight: 1.65, resize: "none",
          fontFamily: "'SF Mono', Menlo, Consolas, monospace", minHeight: 0,
        }}
      />

      {/* 输出 */}
      <div style={{ height: 180, borderTop: "1px solid #2a2a3e", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "6px 12px", borderBottom: "1px solid #2a2a3e", fontSize: 11, color: "#9399b2" }}>输出</div>
        <pre style={{ flex: 1, margin: 0, padding: "10px 14px", overflow: "auto", fontSize: 12.5, lineHeight: 1.6, color: "#cdd6f4", fontFamily: "'SF Mono', Menlo, Consolas, monospace", whiteSpace: "pre-wrap" }}>
          {output || <span style={{ color: "#6c7086" }}>点击「运行」看结果</span>}
        </pre>
      </div>
    </div>
  );
}
