// components/MultimodalUpload.js
// 图片/文件上传
// - 把图片转 data:image/xxx;base64 发给后端，后端拼入 multimodal message
// - 青少年友好：不支持陌生大文件，单张 < 2MB，最多 3 张
import { useRef, useState } from "react";

export default function MultimodalUpload({ onAttach, maxFiles = 3, maxMB = 2 }) {
  const [preview, setPreview] = useState([]);
  const inputRef = useRef(null);

  function pick() { inputRef.current?.click(); }

  function onChange(e) {
    const files = Array.from(e.target.files || []);
    const next = [...preview];
    let ok = 0;
    for (const f of files) {
      if (next.length >= maxFiles) { alert(`最多一次发 ${maxFiles} 张哦`); break; }
      if (f.size / 1024 / 1024 > maxMB) { alert(`这张 ${Math.round(f.size/1024/1024)}MB 超过了 ${maxMB}MB 限制，拍小一点的呀`); continue; }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        const item = { name: f.name, mime: f.type, dataUrl, size: f.size };
        setPreview(p => { const arr = [...p, item]; onAttach && onAttach(arr); return arr; });
      };
      reader.readAsDataURL(f);
      ok++;
    }
    if (!ok) return;
    e.target.value = "";
  }

  function remove(i) {
    setPreview(p => { const next = p.filter((_, idx) => idx !== i); onAttach && onAttach(next); return next; });
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,.png,.jpg,.jpeg,.gif,.webp,.txt,.md,.js,.jsx,.html,.css,.py,.java,.c,.cpp" multiple onChange={onChange} style={{ display: "none" }} />
      {preview.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          {preview.map((p, i) => (
            <div key={i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid rgba(124,111,224,0.35)", width: 68, height: 68 }}>
              {p.dataUrl.startsWith("data:image") ? (
                <img src={p.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} alt="" />
              ) : (
                <div style={{ width: "100%", height: "100%", background: "#f2eaff", display: "grid", placeItems: "center", color: "#4b42b4", fontSize: 18 }}>📄</div>
              )}
              <button onClick={() => remove(i)} title="移除" style={{
                position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%",
                background: "rgba(255,100,100,0.9)", color: "#fff", border: "none", fontSize: 12,
                cursor: "pointer", lineHeight: "14px",
              }}>×</button>
            </div>
          ))}
        </div>
      )}
      <button onClick={pick} style={{
        marginTop: 8, background: "rgba(124,111,224,0.08)", color: "#4b42b4",
        border: "1.5px dashed rgba(124,111,224,0.35)", borderRadius: 999, padding: "5px 12px",
        fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      }}>
        {preview.length ? "➕ 再加一张（最多3张）" : "📷 发图片/代码文件让 AI 看"}
      </button>
    </div>
  );
}
