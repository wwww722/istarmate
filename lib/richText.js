// lib/richText.js
// 富文本渲染：代码块(带高亮)、表格、引用、有序/无序列表、标题、粗体/斜体/行内代码
import { useState, useMemo } from "react";

// 简单的语法高亮：给常见关键字/字符串/注释上色
function highlightCode(code, lang) {
  // 只对类web语言做轻量高亮，避免过度复杂
  const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = escape(code);
  if (/js|javascript|jsx|ts|typescript|html|css/i.test(lang || "")) {
    // 字符串
    html = html.replace(/(["'`])(?:(?=(\\?))\2.)*?\1/g, '<span style="color:#a6e3a1">$&</span>');
    // 注释
    html = html.replace(/(\/\/[^\n]*)/g, '<span style="color:#6c7086">$1</span>');
    // 关键字
    html = html.replace(/\b(const|let|var|function|return|if|else|for|while|import|export|from|class|new|await|async|true|false|null|undefined)\b/g, '<span style="color:#cba6f7">$1</span>');
    // 标签名（html）
    html = html.replace(/(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)/g, '$1<span style="color:#89b4fa">$2</span>');
  }
  return html;
}

function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ margin: "10px 0", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(124,111,224,0.15)" }}>
      <div style={{ background: "#181825", padding: "8px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11.5, color: "#9399b2", fontWeight: 500, textTransform: "lowercase" }}>{lang || "code"}</span>
        <button onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          style={{ background: "transparent", border: "none", color: copied ? "#a6e3a1" : "#9399b2", cursor: "pointer", fontSize: 11.5, display: "flex", alignItems: "center", gap: 4 }}>
          {copied ? "✓ 已复制" : "复制"}
        </button>
      </div>
      <pre style={{ background: "#1e1e2e", margin: 0, padding: "14px 16px", overflowX: "auto", fontSize: 13, lineHeight: 1.65 }}>
        <code style={{ color: "#cdd6f4", fontFamily: "'SF Mono', Menlo, Consolas, monospace" }}
          dangerouslySetInnerHTML={{ __html: highlightCode(code, lang) }} />
      </pre>
    </div>
  );
}

// 渲染行内格式：**粗体** *斜体* `代码`
function renderInline(text, keyPrefix = "") {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    const key = `${keyPrefix}-${i}`;
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={key}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <em key={key}>{p.slice(1, -1)}</em>;
    if (p.startsWith("`") && p.endsWith("`") && p.length > 2) return <code key={key} style={{ background: "rgba(124,111,224,0.12)", color: "var(--purple-deep)", padding: "1px 6px", borderRadius: 5, fontSize: "0.88em", fontFamily: "monospace" }}>{p.slice(1, -1)}</code>;
    return <span key={key}>{p}</span>;
  });
}

// 解析表格块
function renderTable(lines, key) {
  const rows = lines.filter(l => l.trim().startsWith("|"));
  if (rows.length < 2) return null;
  const parseCells = (row) => row.split("|").slice(1, -1).map(c => c.trim());
  const header = parseCells(rows[0]);
  const body = rows.slice(2).map(parseCells);
  return (
    <div key={key} style={{ overflowX: "auto", margin: "10px 0" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13.5 }}>
        <thead>
          <tr>{header.map((h, i) => <th key={i} style={{ border: "1px solid var(--line)", padding: "8px 12px", background: "var(--purple-light)", textAlign: "left", fontWeight: 600 }}>{renderInline(h, `th${i}`)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ border: "1px solid var(--line)", padding: "8px 12px" }}>{renderInline(c, `td${ri}${ci}`)}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

export function RichText({ text }) {
  const rendered = useMemo(() => {
    if (!text) return null;
    return buildBlocks(text);
  }, [text]);
  return <div>{rendered}</div>;
}

function buildBlocks(text) {
  const blocks = [];
  const segments = text.split(/(```[\s\S]*?```)/g);

  segments.forEach((seg, si) => {
    if (seg.startsWith("```")) {
      const lines = seg.split("\n");
      const lang = lines[0].replace("```", "").trim();
      const code = lines.slice(1, -1).join("\n");
      blocks.push(<CodeBlock key={`code-${si}`} code={code} lang={lang} />);
      return;
    }

    // 逐行处理非代码段
    const lines = seg.split("\n");
    let i = 0;
    let listBuffer = [];
    let listType = null;

    const flushList = () => {
      if (listBuffer.length === 0) return;
      const items = listBuffer.map((it, idx) => <li key={idx} style={{ marginBottom: 4, lineHeight: 1.7 }}>{renderInline(it, `li${si}${idx}`)}</li>);
      if (listType === "ol") blocks.push(<ol key={`ol-${si}-${i}`} style={{ margin: "8px 0", paddingLeft: 22 }}>{items}</ol>);
      else blocks.push(<ul key={`ul-${si}-${i}`} style={{ margin: "8px 0", paddingLeft: 22 }}>{items}</ul>);
      listBuffer = [];
      listType = null;
    };

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // 表格
      if (trimmed.startsWith("|") && i + 1 < lines.length && lines[i + 1].includes("---")) {
        flushList();
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith("|")) { tableLines.push(lines[i]); i++; }
        const t = renderTable(tableLines, `table-${si}-${i}`);
        if (t) blocks.push(t);
        continue;
      }

      // 标题
      const h = trimmed.match(/^(#{1,3})\s+(.*)/);
      if (h) {
        flushList();
        const level = h[1].length;
        const size = level === 1 ? 19 : level === 2 ? 16.5 : 15;
        blocks.push(<div key={`h-${si}-${i}`} style={{ fontSize: size, fontWeight: 700, margin: "12px 0 6px" }}>{renderInline(h[2], `h${si}${i}`)}</div>);
        i++; continue;
      }

      // 引用
      if (trimmed.startsWith(">")) {
        flushList();
        blocks.push(<blockquote key={`q-${si}-${i}`} style={{ borderLeft: "3px solid var(--purple)", paddingLeft: 12, margin: "8px 0", color: "var(--ink-soft)", fontStyle: "italic" }}>{renderInline(trimmed.slice(1).trim(), `q${si}${i}`)}</blockquote>);
        i++; continue;
      }

      // 有序列表
      const ol = trimmed.match(/^\d+\.\s+(.*)/);
      if (ol) {
        if (listType && listType !== "ol") flushList();
        listType = "ol";
        listBuffer.push(ol[1]);
        i++; continue;
      }

      // 无序列表
      const ul = trimmed.match(/^[-*]\s+(.*)/);
      if (ul) {
        if (listType && listType !== "ul") flushList();
        listType = "ul";
        listBuffer.push(ul[1]);
        i++; continue;
      }

      // 普通段落 / 空行
      flushList();
      if (trimmed === "") {
        blocks.push(<div key={`br-${si}-${i}`} style={{ height: 6 }} />);
      } else {
        blocks.push(<div key={`p-${si}-${i}`} style={{ lineHeight: 1.75, margin: "2px 0" }}>{renderInline(line, `p${si}${i}`)}</div>);
      }
      i++;
    }
    flushList();
  });

  return blocks;
}
