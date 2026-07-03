// lib/useStreamChat.js
// 前端流式读取，修复了数据块跨chunk被截断导致JSON解析失败的问题。

export async function streamFetch(apiPath, messages, onToken, onDone, onError) {
  let res;
  try {
    res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
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
  // 关键：buffer积累跨chunk的不完整行
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 保留最后一个可能不完整的行

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          onDone();
          return;
        }
        try {
          const json = JSON.parse(data);
          if (json.error) {
            onError(json.error);
            return;
          }
          if (json.token != null && json.token !== "") {
            onToken(json.token);
          }
        } catch {
          // 跳过无法解析的行
        }
      }
    }
    // 处理最后buffer里残留的内容
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
