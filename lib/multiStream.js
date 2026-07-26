import { PLATFORMS } from "./multiModel";
import { detectUnsafeOutput, SAFE_FALLBACK } from "./contentSafety";

function getApiKey(platform: string): string | null {
  const platformConfig = PLATFORMS[platform];
  if (!platformConfig) return null;
  return process.env[platformConfig.apiKeyEnv] || null;
}

async function openStreamForPlatform(
  platform: string,
  baseUrl: string,
  model: string,
  systemPrompt: string,
  messages: any[],
  maxTokens: number,
  temperature: number
) {
  const apiKey = getApiKey(platform);
  if (!apiKey) throw new Error(`未配置 ${platform} API Key`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
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

export async function streamMultiModel(
  res: any,
  systemPrompt: string,
  messages: any[],
  maxTokens: number,
  platform: string,
  baseUrl: string,
  model: string,
  temperature: number = 0.7
) {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  let r;
  try {
    r = await openStreamForPlatform(
      platform,
      baseUrl,
      model,
      systemPrompt,
      messages,
      maxTokens,
      temperature
    );
    if (!r.ok) throw new Error(`模型返回 ${r.status}`);
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "AI 服务暂时不可用，请稍后再试。" })}\n\n`);
    res.end();
    return;
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