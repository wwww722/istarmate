// components/VoiceInput.js
// 语音输入按钮，用浏览器原生 Web Speech API（免费、无需后端）
import { useEffect, useRef, useState } from "react";

export default function VoiceInput({ onTranscript, disabled }) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const recogRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    setSupported(true);

    const r = new SR();
    r.lang = "zh-CN";
    r.continuous = false;
    r.interimResults = true;

    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalText += t;
        else interim += t;
      }
      onTranscript(finalText || interim, !!finalText);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);

    recogRef.current = r;
    return () => { try { r.abort(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle() {
    if (!recogRef.current || disabled) return;
    if (listening) {
      try { recogRef.current.stop(); } catch {}
      setListening(false);
    } else {
      try {
        recogRef.current.start();
        setListening(true);
      } catch {
        setListening(false);
      }
    }
  }

  if (!supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={disabled}
      title={listening ? "停止录音" : "语音输入"}
      style={{
        width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
        background: listening ? "rgba(201,74,74,0.15)" : "transparent",
        color: listening ? "var(--coral-deep)" : "var(--ink-soft)",
        cursor: disabled ? "default" : "pointer", fontSize: 17,
        display: "flex", alignItems: "center", justifyContent: "center",
        animation: listening ? "pulse 1.2s ease-in-out infinite" : "none",
      }}
    >
      {listening ? "⏺" : "🎤"}
    </button>
  );
}
