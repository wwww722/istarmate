// components/ImageUpload.js
// 图片上传按钮：压缩后转base64，供视觉模型理解
import { useRef, useState } from "react";

const MAX_DIM = 1024;      // 最长边压到1024，够模型看清又不浪费token
const MAX_BYTES = 4 * 1024 * 1024;

// 压缩图片并转成 base64 data URL
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("图片格式不支持"));
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          const scale = MAX_DIM / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ImageUpload({ onImage, disabled }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 允许重复选同一张
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("请选择图片文件"); return; }
    if (file.size > MAX_BYTES) { alert("图片太大了，请选小于4MB的图片"); return; }
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      onImage(dataUrl);
    } catch (err) {
      alert(err.message || "图片处理失败");
    }
    setBusy(false);
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
      <button
        onClick={() => !disabled && !busy && inputRef.current?.click()}
        disabled={disabled || busy}
        title="上传图片"
        style={{
          width: 38, height: 38, borderRadius: "50%", border: "none", flexShrink: 0,
          background: "transparent", color: "var(--ink-soft)",
          cursor: disabled || busy ? "default" : "pointer", fontSize: 17,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "⏳" : "🖼️"}
      </button>
    </>
  );
}
