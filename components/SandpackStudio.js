// components/SandpackStudio.js
// 全能代码沙盒：文件树 + 多标签编辑器 + 实时预览 + 控制台
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

function SandpackBridge({ onFilesChange, onError, onReady }) {
  const { sandpack, listen } = useSandpack();

  useEffect(() => {
    if (!onFilesChange) return;
    const out = {};
    for (const [path, file] of Object.entries(sandpack.files)) {
      if (!file.hidden) out[path] = file.code;
    }
    onFilesChange(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files]);

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

  useEffect(() => {
    if (onReady) onReady(sandpack);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack]);

  return null;
}

export default function SandpackStudio({ files, template = "static", onFilesChange, onError, onReady }) {
  const sandpackFiles = {};
  for (const [path, content] of Object.entries(files || {})) {
    sandpackFiles[path] = { code: typeof content === "string" ? content : (content?.code || "") };
  }
  if (Object.keys(sandpackFiles).length === 0) {
    sandpackFiles["/index.html"] = { code: "<h1>开始写代码吧</h1>" };
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <SandpackProvider
        template={template}
        files={sandpackFiles}
        theme="dark"
        options={{ recompileMode: "delayed", recompileDelay: 500 }}
        style={{ height: "100%" }}
      >
        <SandpackBridge onFilesChange={onFilesChange} onError={onError} onReady={onReady} />
        <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0, background: "#0d0d17" }}>
          <SandpackFileExplorer style={{ height: "100%", minWidth: 140, maxWidth: 180 }} />
          <SandpackCodeEditor
            style={{ height: "100%", flex: 1.2 }}
            showTabs
            showLineNumbers
            showInlineErrors
            wrapContent
            closableTabs
          />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <SandpackPreview
              style={{ flex: 1, minHeight: 0 }}
              showOpenInCodeSandbox={false}
              showRefreshButton
              showRestartButton
            />
            <SandpackConsole
              style={{ height: 150, borderTop: "1px solid #2a2a3e" }}
              showHeader
              resetOnPreviewRestart
            />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
