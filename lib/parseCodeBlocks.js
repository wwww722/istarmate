// lib/parseCodeBlocks.js
// 从代码星的回复里解析出 ```file:文件名 ... ``` 代码块，用于注入沙盒

export function parseFileBlocks(text) {
  const files = {};
  // 匹配 ```file:路径\n内容\n```
  const regex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const path = match[1].trim();
    const content = match[2].replace(/\n$/, "");
    files[path] = content;
  }
  return files;
}

// 把回复文本里的 file 代码块替换成友好提示，避免聊天区显示一大坨代码
export function stripFileBlocks(text) {
  return text.replace(/```file:([^\n]+)\n[\s\S]*?```/g, (m, path) => {
    return `\n\`📄 ${path.trim()} 已更新到右侧沙盒 →\`\n`;
  });
}

// 判断回复里是否包含 file 代码块
export function hasFileBlocks(text) {
  return /```file:[^\n]+\n/.test(text);
}
