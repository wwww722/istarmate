// components/EmotionPicker.js
// 情绪词汇选择器，帮助青少年找到准确描述自己感受的词语

const EMOTIONS = {
  "低落类": ["沮丧", "失落", "委屈", "难过", "心酸", "绝望", "无力", "灰心", "痛苦", "郁闷"],
  "焦虑类": ["焦虑", "紧张", "担心", "害怕", "恐慌", "不安", "忐忑", "慌乱", "迷茫", "压抑"],
  "愤怒类": ["烦躁", "愤怒", "委屈", "憋屈", "不满", "厌烦", "崩溃", "抓狂", "憎恨", "失控"],
  "孤独类": ["孤独", "寂寞", "被忽视", "格格不入", "疏离", "被排斥", "无助", "没人懂我"],
  "积极类": ["感激", "开心", "期待", "满足", "平静", "释然", "充实", "有动力", "感动", "温暖"],
};

export default function EmotionPicker({ onSelect, onClose }) {
  return (
    <div style={{
      position: "absolute",
      bottom: "100%",
      left: 0,
      right: 0,
      marginBottom: 8,
      background: "rgba(255,255,255,0.97)",
      backdropFilter: "blur(20px)",
      borderRadius: 18,
      border: "1px solid rgba(124,111,224,0.15)",
      boxShadow: "0 -8px 40px rgba(90,78,201,0.15)",
      padding: "16px",
      maxHeight: 300,
      overflowY: "auto",
      zIndex: 20,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontSize: 13, fontWeight: 600, margin: 0, color: "var(--ink)" }}>选一个描述你感受的词</p>
        <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "var(--ink-soft)", padding: "0 4px" }}>×</button>
      </div>
      {Object.entries(EMOTIONS).map(([category, words]) => (
        <div key={category} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 11.5, color: "var(--ink-muted)", margin: "0 0 6px", fontWeight: 500 }}>{category}</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {words.map(word => (
              <button key={word} onClick={() => { onSelect(word); onClose(); }} style={{
                background: "var(--purple-light)",
                border: "1px solid rgba(124,111,224,0.2)",
                color: "var(--purple-deep)",
                padding: "5px 12px",
                borderRadius: 20,
                fontSize: 13.5,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
                onMouseOver={e => e.target.style.background = "var(--purple)"}
                onMouseOut={e => e.target.style.background = "var(--purple-light)"}
                onMouseOverCapture={e => { e.target.style.background = "var(--purple)"; e.target.style.color = "#fff"; }}
                onMouseOutCapture={e => { e.target.style.background = "var(--purple-light)"; e.target.style.color = "var(--purple-deep)"; }}
              >
                {word}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
