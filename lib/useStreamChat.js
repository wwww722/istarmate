// lib/useStreamChat.js
// 支持中止的流式读取，传入 abortRef 可以随时停止

export async function streamFetch(apiPath, messages, onToken, onDone, onError, extraBody = {}, abortRef = null) {
  let res;
  const controller = new AbortController();
  if (abortRef) abortRef.current = controller;

  try {
    res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, ...extraBody }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === "AbortError") { onDone(); return; }
    onError("网络异常，请检查网络后重试");
    return;
  }

  if (!res.ok || !res.body) {
    try {
      const data = await res.json();
      onError(data.error || `请求失败（${res.status}）`);
    } catch {
      onError(`请求失败（${res.status}）`);
    }
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") { onDone(); return; }
        try {
          const json = JSON.parse(data);
          if (json.error) { onError(json.error); return; }
          if (json.token != null && json.token !== "") onToken(json.token);
        } catch {}
      }
    }
    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice(5).trim();
      if (data !== "[DONE]") {
        try { const json = JSON.parse(data); if (json.token) onToken(json.token); } catch {}
      }
    }
    onDone();
  } catch (err) {
    if (err.name === "AbortError") { onDone(); return; }
    onError("读取数据时中断，请重试");
  }
}

// 平滑流式输出：把突发到达的token拆成字符，以稳定节奏吐出，看起来像自然打字。
// 用法和 streamFetch 一样，只是 onToken 会收到更平滑的小片段。
// options: { speed: number, pause: () => boolean }
export async function streamFetchSmooth(apiPath, messages, onToken, onDone, onError, extraBody = {}, abortRef = null, options = {}) {
  let queue = "";
  let flushing = false;
  let sourceDone = false;
  let animationFrame = null;
  const speed = options.speed || 1;
  const pauseChecker = options.pause || (() => false);

  function pump() {
    if (flushing) return;
    flushing = true;
    function tick() {
      if (pauseChecker()) {
        animationFrame = requestAnimationFrame(tick);
        return;
      }
      if (queue.length === 0) {
        if (sourceDone) {
          flushing = false;
          realDone();
        } else {
          animationFrame = requestAnimationFrame(tick);
        }
        return;
      }
      const n = Math.min(
        queue.length > 60 ? 5 : queue.length > 30 ? 3 : queue.length > 10 ? 2 : 1,
        Math.ceil(speed * (queue.length > 40 ? 2 : 1))
      );
      const chunk = queue.slice(0, n);
      queue = queue.slice(n);
      onToken(chunk);
      animationFrame = requestAnimationFrame(tick);
    }
    animationFrame = requestAnimationFrame(tick);
  }

  let doneCalled = false;
  function realDone() {
    if (doneCalled) return;
    doneCalled = true;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    onDone();
  }

  await streamFetch(
    apiPath, messages,
    (token) => { queue += token; pump(); },
    () => {
      sourceDone = true;
      if (!flushing) realDone();
    },
    (err) => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      onError(err);
    },
    extraBody, abortRef
  );
}

export function createStreamController() {
  let paused = false;
  const listeners = [];

  function setPause(value) {
    paused = value;
    listeners.forEach(fn => fn(value));
  }

  function toggle() {
    setPause(!paused);
    return !paused;
  }

  function onPauseChange(fn) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }

  return {
    isPaused: () => paused,
    setPause,
    toggle,
    onPauseChange,
  };
}
