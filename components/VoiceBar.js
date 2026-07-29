// components/VoiceBar.js
// 实时语音输入
// - 语音输入：浏览器 MediaRecorder 录制 WebM → 后端上传 → SiliconFlow 语音识别（Whisper）或浏览器原生 webkitSpeechRecognition
// - 语音输出：浏览器 SpeechSynthesis + 可选 SiliconFlow TTS API
import { useEffect, useRef, useState } from "react";

export default function VoiceBar({ onText, readText }) {
  const [rec, setRec] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const mediaRef = useRef(null);

  // 有新的 AI 消息需要朗读（成长版/家庭版解锁）
  useEffect(() => {
    if (!readText) return;
    if (!("speechSynthesis" in window)) return;
    try {
      const u = new SpeechSynthesisUtterance(readText);
      u.lang = /[\u4e00-\u9fa5]/.test(readText) ? "zh-CN" : "en-US";
      u.rate = 1.02;
      u.pitch = 1.08;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }, [readText]);

  function toggle() {
    if (!rec) start();
    else stop();
  }

  function start() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.lang = "zh-CN";
      r.continuous = false;
      r.interimResults = true;
      let finalTxt = "";
      r.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalTxt += e.results[i][0].transcript;
          else interim += e.results[i][0].transcript;
        }
      };
      r.onend = () => { setRec(false); if (finalTxt.trim()) onText && onText(finalTxt.trim()); };
      r.onerror = () => setRec(false);
      try { r.start(); mediaRef.current = r; setRec(true); } catch { setRec(false); }
      return;
    }
    // 不支持语音识别的浏览器
    alert("你的浏览器不支持语音输入，换 Chrome/Edge 试试呀～");
  }

  function stop() {
    try { mediaRef.current?.stop?.(); } catch {}
    setRec(false);
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button title={rec ? "停止录音" : "按住说话/语音输入"} onClick={toggle} style={{
        width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
        background: rec
          ? "linear-gradient(135deg,#ff6b6b,#ff3b5c)"
          : "rgba(124,111,224,0.1)",
        color: rec ? "#fff" : "#4b42b4",
        fontSize: 16,
        boxShadow: rec ? "0 0 0 4px rgba(255,100,100,0.25)" : "none",
        transition: "all .15s",
      }}>{rec ? "🔴" : "🎙️"}</button>
      <button title={speaking ? "停止朗读" : "AI 朗读最后一条回复"} onClick={() => {
        if (speaking) { window.speechSynthesis?.cancel(); setSpeaking(false); return; }
        // 通过自定义事件让父组件传来最近一条 AI 文本
        window.dispatchEvent(new CustomEvent("istarmate-request-read"));
      }} style={{
        width: 40, height: 40, borderRadius: "50%", border: "none", cursor: "pointer",
        background: speaking ? "linear-gradient(135deg,#7c6fe0,#ff6fb3)" : "rgba(124,111,224,0.1)",
        color: speaking ? "#fff" : "#4b42b4", fontSize: 16,
      }}>🔊</button>
      {rec && (
        <span style={{ color: "#d43a3a", fontSize: 12, fontWeight: 600 }}>
          正在听你说话…
          <span style={{ display:"inline-block", marginLeft:4, animation: "wink 1.2s infinite" }}>●</span>
          <style>{`@keyframes wink { 0%,100% { opacity: 1 } 50% { opacity: .2 } }`}</style>
        </span>
      )}
    </div>
  );
}
