// lib/useStreamChat.js
// 前端流式读取，支持额外的body参数（比如传场景信息）

export async function streamFetch(apiPath, messages, onToken, onDone, onError, extraBody = {}) {
  let res;
  try {
    res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, ...extraBody }),
    });
  } catch (err) {
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
        } catch { }
      }
    }
    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice(5).trim();
      if (data !== "[DONE]") {
        try {
          const json = JSON.parse(data);
          if (json.token) onToken(json.token);
        } catch {}
      }
    }
    onDone();
  } catch (err) {
    onError("读取数据时中断，请重试");
  }
}
