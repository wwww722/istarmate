// components/SandpackStudio.js
// 真实运行的代码沙盒，支持两种模式：static(纯网页) / react(React应用)
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

function SandpackBridge({ onFilesChange, onError }) {
  const { sandpack, listen } = useSandpack();

  useEffect(() => {
    if (!onFilesChange) return;
    const out = {};
    for (const [path, file] of Object.entries(sandpack.files)) {
      out[path] = file.code;
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

  return null;
}

export default function SandpackStudio({ files, onFilesChange, onError, mode = "static" }) {
  const sandpackFiles = {};
  for (const [path, content] of Object.entries(files || {})) {
    sandpackFiles[path] = { code: typeof content === "string" ? content : (content?.code || "") };
  }

  // React模式需要控制台，static模式也保留
  const showConsole = true;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <SandpackProvider
        key={mode}
        template={mode === "react" ? "react" : "static"}
        files={sandpackFiles}
        theme="dark"
        options={{ recompileMode: "delayed", recompileDelay: 600 }}
        style={{ height: "100%" }}
      >
        <SandpackBridge onFilesChange={onFilesChange} onError={onError} />
        <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
          <SandpackFileExplorer style={{ height: "100%", minWidth: 140 }} />
          <SandpackCodeEditor
            style={{ height: "100%" }}
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
              showNavigator={mode === "react"}
            />
            {showConsole && (
              <SandpackConsole style={{ height: 130, borderTop: "1px solid #2a2a3e" }} />
            )}
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
