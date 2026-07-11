// components/SandpackStudio.js
// 真实运行的代码沙盒，支持 static(纯网页) / react(React应用) 两种模式
// 关键设计：Sandpack 是编辑的唯一真相源，父组件通过 filesToInject 推送AI生成的代码，
// 通过 onFilesChange 读取当前代码（供AI参考），避免双向绑定导致的无限重渲染卡顿。
import { useEffect, useRef } from "react";
import {
  SandpackProvider,
  SandpackLayout,
  SandpackFileExplorer,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  useSandpack,
} from "@codesandbox/sandpack-react";

function SandpackBridge({ onFilesChange, onError, filesToInject, injectVersion }) {
  const { sandpack, listen } = useSandpack();
  const lastVersion = useRef(-1);
  const changeTimer = useRef(null);

  // 把AI生成的新文件注入沙盒（只在 injectVersion 变化时执行一次）
  useEffect(() => {
    if (injectVersion === lastVersion.current) return;
    lastVersion.current = injectVersion;
    if (!filesToInject || Object.keys(filesToInject).length === 0) return;
    for (const [path, code] of Object.entries(filesToInject)) {
      const key = path.startsWith("/") ? path : "/" + path;
      sandpack.updateFile(key, code);
    }
    // 激活第一个注入的文件
    const first = Object.keys(filesToInject)[0];
    if (first) {
      const key = first.startsWith("/") ? first : "/" + first;
      try { sandpack.setActiveFile(key); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [injectVersion]);

  // 读取当前所有文件给父组件（防抖，避免每次敲键都触发）
  useEffect(() => {
    if (!onFilesChange) return;
    if (changeTimer.current) clearTimeout(changeTimer.current);
    changeTimer.current = setTimeout(() => {
      const out = {};
      for (const [path, file] of Object.entries(sandpack.files)) {
        if (!file.hidden) out[path] = file.code;
      }
      onFilesChange(out);
    }, 500);
    return () => { if (changeTimer.current) clearTimeout(changeTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandpack.files]);

  // 监听报错
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

export default function SandpackStudio({ initialFiles, filesToInject, injectVersion, onFilesChange, onError, mode = "static" }) {
  const startFiles = {};
  for (const [path, content] of Object.entries(initialFiles || {})) {
    startFiles[path] = { code: typeof content === "string" ? content : (content?.code || "") };
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <SandpackProvider
        key={mode}
        template={mode === "react" ? "react" : "static"}
        files={startFiles}
        theme="dark"
        options={{ recompileMode: "delayed", recompileDelay: 700 }}
        style={{ height: "100%" }}
      >
        <SandpackBridge
          onFilesChange={onFilesChange}
          onError={onError}
          filesToInject={filesToInject}
          injectVersion={injectVersion}
        />
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
            <SandpackConsole style={{ height: 130, borderTop: "1px solid #2a2a3e" }} />
          </div>
        </SandpackLayout>
      </SandpackProvider>
    </div>
  );
}
