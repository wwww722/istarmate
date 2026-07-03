// lib/stream.js
// 统一的流式调用SiliconFlow的工具函数。
// 调用方式：在API路由里用 streamSiliconFlow(res, systemPrompt, messages)
// 前端用 fetch + ReadableStream 读取，边收边渲染。

export async function streamSiliconFlow(res, systemPrompt, messages, maxTokens = 600) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    },
    body: JSON.stringify({
      model: "Pro/zai-org/GLM-5.1",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: maxTokens,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!r.ok) {
    const errText = await r.text();
    res.write(`data: ${JSON.stringify({ error: "AI服务调用失败", detail: errText.slice(0, 200) })}\n\n`);
    res.end();
    return;
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n").filter(l => l.startsWith("data:"));
    for (const line of lines) {
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        res.write("data: [DONE]\n\n");
        continue;
      }
      try {
        const json = JSON.parse(data);
        const token = json?.choices?.[0]?.delta?.content;
        if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
      } catch { /* 跳过解析失败的行 */ }
    }
  }
  res.end();
}
