// lib/useStreamChat.js
// 前端流式读取hook，让AI回复像打字机一样逐字出现。
// 用法：const { sendMessage, loading } = useStreamChat(apiPath, messages, setMessages)

export async function streamFetch(apiPath, messages, onToken, onDone, onError) {
  try {
    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok || !res.body) {
      const data = await res.json().catch(() => ({}));
      onError(data.error || `请求失败（${res.status}）`);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop(); // 保留不完整的最后一行
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") { onDone(); return; }
        try {
          const json = JSON.parse(data);
          if (json.error) { onError(json.error); return; }
          if (json.token) onToken(json.token);
        } catch { /* 忽略 */ }
      }
    }
    onDone();
  } catch (err) {
    onError("网络异常，请稍后重试");
  }
}
