import { useState } from "react";
import { MODELS, PLATFORMS, getModelById } from "../lib/multiModel";

export default function ModelSelector({ selectedModelId, onSelect, useCase }) {
  const [open, setOpen] = useState(false);
  
  const selectedModel = getModelById(selectedModelId);
  
  const filteredModels = useCase === "code"
    ? MODELS.filter(m => m.category === "code" || m.category === "reasoning")
    : MODELS.filter(m => m.category === "chat" || m.category === "reasoning");

  const platformGroups = filteredModels.reduce((acc, model) => {
    if (!acc[model.platform]) {
      acc[model.platform] = [];
    }
    acc[model.platform].push(model);
    return acc;
  }, {});

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 14px",
          borderRadius: 8,
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-elevated)",
          color: "var(--text)",
          fontSize: 13,
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--accent)"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--border)"}
      >
        <span style={{ fontSize: 16 }}>
          {selectedModel ? PLATFORMS[selectedModel.platform]?.logo || "🤖" : "🤖"}
        </span>
        <span style={{ fontWeight: 500 }}>
          {selectedModel?.name || "选择模型"}
        </span>
        <span style={{
          fontSize: 10,
          padding: "2px 6px",
          borderRadius: 4,
          backgroundColor: selectedModel?.isFree ? "rgba(16, 185, 129, 0.15)" : "rgba(251, 146, 60, 0.15)",
          color: selectedModel?.isFree ? "#10b981" : "#fb923c",
        }}>
          {selectedModel?.isFree ? "免费" : "付费"}
        </span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          right: 0,
          width: 320,
          maxHeight: 480,
          overflowY: "auto",
          borderRadius: 12,
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-panel)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          zIndex: 100,
          padding: 12,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0 8px 12px",
            borderBottom: "1px solid var(--border)",
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 16 }}>🤖</span>
            <span style={{ fontWeight: 600, fontSize: 14 }}>选择AI模型</span>
          </div>

          {Object.entries(platformGroups).map(([platform, models]) => {
            const platformConfig = PLATFORMS[platform];
            return (
              <div key={platform} style={{ marginBottom: 16 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 8px",
                  marginBottom: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: platformConfig?.color || "#6b7280",
                  textTransform: "uppercase",
                }}>
                  <span>{platformConfig?.logo || "📦"}</span>
                  <span>{platformConfig?.name || platform}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onSelect(model.id);
                        setOpen(false);
                      }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        gap: 4,
                        padding: 10,
                        borderRadius: 8,
                        border: selectedModelId === model.id ? `2px solid ${platformConfig?.color || "#6366f1"}` : "1px solid transparent",
                        backgroundColor: selectedModelId === model.id
                          ? `${platformConfig?.color || "#6366f1"}15`
                          : "transparent",
                        color: "var(--text)",
                        textAlign: "left",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (selectedModelId !== model.id) {
                          e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedModelId !== model.id) {
                          e.currentTarget.style.backgroundColor = "transparent";
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{model.name}</span>
                        {model.isFree && (
                          <span style={{
                            fontSize: 9,
                            padding: "1px 5px",
                            borderRadius: 3,
                            backgroundColor: "rgba(16, 185, 129, 0.15)",
                            color: "#10b981",
                            fontWeight: 600,
                          }}>免费</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {model.description}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {model.capabilities.map((cap, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: 9,
                              padding: "2px 6px",
                              borderRadius: 4,
                              backgroundColor: "var(--bg-elevated)",
                              color: "var(--text-muted)",
                            }}
                          >
                            {cap}
                          </span>
                        ))}
                      </div>
                      {model.freeInfo && !model.isFree && (
                        <div style={{ fontSize: 10, color: "#fb923c" }}>
                          试用：{model.freeInfo}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}