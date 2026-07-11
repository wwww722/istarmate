// lib/feedback.js
// 轻量音效和触感反馈。音效用 Web Audio API 现场合成，不需要音频文件。

let audioCtx = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

// 播放一个短促柔和的提示音
function playTone(freq, duration = 0.12, type = "sine", volume = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

// 触感震动（仅移动端支持）
function vibrate(pattern) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

// 是否开启（用户可在设置里关闭）
function isEnabled() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem("istarmate_sound") !== "off";
}

export function setSoundEnabled(on) {
  if (typeof window !== "undefined") {
    localStorage.setItem("istarmate_sound", on ? "on" : "off");
  }
}

export function soundEnabled() {
  return isEnabled();
}

// 各种交互反馈
export const feedback = {
  // 打卡：柔和上升音
  checkin() {
    if (!isEnabled()) return;
    playTone(523.25, 0.1); // C5
    setTimeout(() => playTone(659.25, 0.12), 90); // E5
    vibrate(20);
  },
  // 发送消息：轻点
  send() {
    if (!isEnabled()) return;
    playTone(440, 0.06, "sine", 0.05);
    vibrate(10);
  },
  // 解锁成就：欢快三连音
  achievement() {
    if (!isEnabled()) return;
    playTone(523.25, 0.1);
    setTimeout(() => playTone(659.25, 0.1), 100);
    setTimeout(() => playTone(783.99, 0.18), 200);
    vibrate([30, 40, 30]);
  },
  // 轻触反馈
  tap() {
    if (!isEnabled()) return;
    playTone(660, 0.05, "sine", 0.04);
    vibrate(8);
  },
  // 完成/成功
  success() {
    if (!isEnabled()) return;
    playTone(587.33, 0.1);
    setTimeout(() => playTone(880, 0.16), 110);
    vibrate([20, 30, 20]);
  },
};
