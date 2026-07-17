// lib/stream.js
import { detectUnsafeOutput, SAFE_FALLBACK } from "./contentSafety";
import { MODELS, getFallback } from "./models";

// 检测消息里是否包含图片（多模态格式）
function hasImage(messages) {
  return messages.some(m =>
    Array.isArray(m.content) &&
    m.content.some(part => part?.type === "image_url")
  );
}

// 发起一次流式请求。带超时（首字节15秒内没响应就放弃）。
async function openStream(model, systemPrompt, messages, maxTokens, temperature) {
  const controller = new AbortController();
  // 15秒还没建立连接/返回响应头，就中断，触发备用模型
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        max_tokens: maxTokens,
        temperature,
        stream: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return r;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

// 流式调用SiliconFlow。主模型失败/超时时自动切换备用模型。
export async function streamSiliconFlow(res, systemPrompt, messages, maxTokens = 600, model = null, temperature = 0.7) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const primaryModel = hasImage(messages) ? MODELS.vision : (model || MODELS.utility);

  // 尝试主模型；失败或超时则切备用模型。只在还没开始流式输出前才能切换。
  let r;
  let usedModel = primaryModel;
  try {
    r = await openStream(primaryModel, systemPrompt, messages, maxTokens, temperature);
    if (!r.ok) throw new Error("主模型返回 " + r.status);
  } catch (primaryErr) {
    // 主模型不行，切备用
    const fallback = getFallback(primaryModel);
    try {
      r = await openStream(fallback, systemPrompt, messages, maxTokens, temperature);
      usedModel = fallback;
      if (!r.ok) throw new Error("备用模型返回 " + r.status);
    } catch (fallbackErr) {
      res.write(`data: ${JSON.stringify({ error: "AI 服务暂时不可用，请稍后再试。" })}\n\n`);
      res.end();
      return;
    }
  }

  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let blocked = false;
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
          // JSON解析失败，跳过
        }
      }
    }
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
    res.write(`data: ${JSON.stringify({ error: "网络中断，请重试。" })}\n\n`);
  }

  res.end();
}
