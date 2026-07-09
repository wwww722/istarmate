// lib/renderMarkdown.js
// 简单的Markdown渲染器，处理AI回复里常见的格式：
// **粗体**, `行内代码`, ```代码块```, # 标题, - 列表, 换行

export function renderMarkdown(text) {
  // 先按代码块分割
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, i) => {
    if (part.startsWith("```")) {
      const lines = part.split("\n");
      const lang = lines[0].replace("```", "").trim() || "code";
      const code = lines.slice(1, -1).join("\n");
      return (
        <div key={i} style={{ margin: "10px 0" }}>
          <div style={{
            background: "#1e1e2e", borderRadius: "10px 10px 0 0",
            padding: "6px 14px", fontSize: 11.5, color: "#8888aa",
            display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>{lang}</span>
            <button
              onClick={() => navigator.clipboard?.writeText(code)}
              style={{ background: "transparent", border: "none", color: "#8888aa", cursor: "pointer", fontSize: 11.5 }}
            >
              复制代码
            </button>
          </div>
          <pre style={{
            background: "#1e1e2e", color: "#cdd6f4", margin: 0,
            padding: "14px", borderRadius: "0 0 10px 10px",
            overflowX: "auto", fontSize: 13, lineHeight: 1.6,
            whiteSpace: "pre-wrap", wordBreak: "break-all"
          }}>
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // 处理普通文本里的内联格式
    const lines = part.split("\n");
    return (
      <span key={i}>
        {lines.map((line, li) => {
          const isHeading = line.startsWith("# ");
          const isSubHeading = line.startsWith("## ");
          const isListItem = line.match(/^[\-\*] /);
          const cleanLine = line
            .replace(/^#{1,3} /, "")
            .replace(/^[\-\*] /, "");

          const rendered = inlineFormat(cleanLine);

          if (isHeading || isSubHeading) {
            return (
              <span key={li}>
                <strong style={{ fontSize: isHeading ? 16 : 15 }}>{rendered}</strong>
                {li < lines.length - 1 && <br />}
              </span>
            );
          }
          if (isListItem) {
            return (
              <span key={li}>
                {"• "}{rendered}
                {li < lines.length - 1 && <br />}
              </span>
            );
          }
          return (
            <span key={li}>
              {rendered}
              {li < lines.length - 1 && <br />}
            </span>
          );
        })}
      </span>
    );
  });
}

// 处理行内格式：**粗体**, *斜体*, `代码`
function inlineFormat(text) {
  const tokens = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
  return tokens.map((t, i) => {
    if (t.startsWith("**") && t.endsWith("**")) {
      return <strong key={i}>{t.slice(2, -2)}</strong>;
    }
    if (t.startsWith("*") && t.endsWith("*") && t.length > 2) {
      return <em key={i}>{t.slice(1, -1)}</em>;
    }
    if (t.startsWith("`") && t.endsWith("`") && t.length > 2) {
      return (
        <code key={i} style={{
          background: "#f0eef8", color: "#6E61C2",
          padding: "1px 5px", borderRadius: 4, fontSize: "0.9em"
        }}>
          {t.slice(1, -1)}
        </code>
      );
    }
    return t;
  });
}
