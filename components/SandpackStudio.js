// components/SandpackStudio.js
// 真实运行的代码沙盒：文件树 + 编辑器 + 实时预览 + 控制台
// 用 Sandpack (CodeSandbox 官方开源库)
import { useEffect } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackFileExplorer,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";

// 监听沙盒文件变化和报错，同步回父组件
function SandpackBridge({ onFilesChange, onError }) {
  const { sandpack, listen } = useSandpack();

  // 文件变化时同步给父组件
  useEffect(() => {
    if (!onFilesChange) return;
    const out = {};
    for (const [path, file] of Object.entries(sandpack.files)) {
      out[path] = file.code;
    }
    onFilesChange(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files]);

  // 监听运行时报错
  useEffect(() => {
    if (!onError) return;
    const stop = listen((msg) => {
      if (msg.type === "action" && msg.action === "show-error") {
        onError(msg.message || "运行出错");
      } else if (msg.type === "success") {
        onError(null);
      }
    });
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function SandpackStudio({ files, onFilesChange, onError }) {
  // 把 { "/index.html": "..." } 转成 Sandpack 需要的格式
  const sandpackFiles = {};
  for (const [path, content] of Object.entries(files || {})) {
    sandpackFiles[path] = { code: typeof content === "string" ? content : (content?.code || "") };
  }
  // 兜底：至少要有一个 index.html
  if (Object.keys(sandpackFiles).length === 0) {
    sandpackFiles["/index.html"] = { code: "<h1>开始写代码吧</h1>" };
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <SandpackProvider
        template="static"
        files={sandpackFiles}
        theme="dark"
        options={{ recompileMode: "delayed", recompileDelay: 600 }}
        style={{ height: "100%" }}
      >
        <SandpackBridge onFilesChange={onFilesChange} onError={onError} />
        <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
          <SandpackFileExplorer style={{ height: "100%", minWidth: 130 }} />
          <SandpackCodeEditor
            style={{ height: "100%" }}
            showTabs
            showLineNumbers
            wrapContent
          />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <SandpackPreview
              style={{ flex: 1, minHeight: 0 }}
              showOpenInCodeSandbox={false}
              showRefreshButton
            />
            <SandpackConsole style={{ height: 140, borderTop: "1px solid #2a2a3e" }} />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
