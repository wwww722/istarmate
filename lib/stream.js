// lib/stream.js
import { detectUnsafeOutput, SAFE_FALLBACK } from "./contentSafety";

// 检测消息里是否包含图片（多模态格式）
import { MODELS } from "./models";

function hasImage(messages) {
  return messages.some(m =>
    Array.isArray(m.content) &&
    m.content.some(part => part?.type === "image_url")
  );
}
// 流式调用SiliconFlow，修复了SSE数据块跨chunk被截断的问题。

export async function streamSiliconFlow(res, systemPrompt, messages, maxTokens = 600, model = null, temperature = 0.7) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  let r;
  try {
    r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        // 含图片时自动切到视觉模型；否则用调用方指定的模型，没指定则用兜底模型
        model: hasImage(messages) ? MODELS.vision : (model || MODELS.utility),
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
    });
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "连接AI服务失败：" + String(err).slice(0, 100) })}\n\n`);
    res.end();
    return;
  }

  if (!r.ok) {
    const errText = await r.text();
    res.write(`data: ${JSON.stringify({ error: "AI服务返回错误", detail: errText.slice(0, 200) })}\n\n`);
    res.end();
    return;
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";   // 累积的输出，用于安全检测
  let blocked = false;
  // 关键修复：用buffer积累跨chunk的不完整行
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 按换行符分割，保留最后一个不完整的行在buffer里
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // 最后一行可能不完整，留着等下一个chunk

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") {
          res.write("data: [DONE]\n\n");
          continue;
        }
        try {
          const json = JSON.parse(data);
          if (json.error) {
            res.write(`data: ${JSON.stringify({ error: json.error.message || "AI服务异常" })}\n\n`);
            continue;
          }
          const token = json?.choices?.[0]?.delta?.content;
          if (token != null && token !== "") {
            // 输出侧安全兜底：累积检测，发现红线内容立刻中断并替换
            accumulated += token;
            if (!blocked && detectUnsafeOutput(accumulated)) {
              blocked = true;
              res.write(`data: ${JSON.stringify({ blocked: true, token: SAFE_FALLBACK })}\n\n`);
              res.write("data: [DONE]\n\n");
              res.end();
              try { await reader.cancel(); } catch {}
              return;
            }
            if (!blocked) {
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          }
        } catch {
          // JSON解析失败，跳过这一行
        }
      }
    }
    // 处理buffer里剩余的内容
    if (buffer.trim().startsWith("data:")) {
      const data = buffer.trim().slice(5).trim();
      if (data === "[DONE]") {
        res.write("data: [DONE]\n\n");
      } else {
        try {
          const json = JSON.parse(data);
          const token = json?.choices?.[0]?.delta?.content;
          if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
        } catch {}
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "流读取中断：" + String(err).slice(0, 100) })}\n\n`);
  }

  res.end();
}
