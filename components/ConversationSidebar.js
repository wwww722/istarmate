// components/ConversationSidebar.js
// 会话列表侧边栏：搜索、置顶、归档、重命名、删除
import { useState } from "react";

function timeLabel(dateStr) {
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function ConversationSidebar({
  conversations, activeId, onSelect, onNew, onRename, onDelete,
  onPin, onArchive, onSearch, onClose, open,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  function startRename(c) {
    setEditingId(c.id);
    setEditTitle(c.title);
    setMenuId(null);
  }
  function commitRename(id) {
    if (editTitle.trim()) onRename(id, editTitle.trim());
    setEditingId(null);
  }

  async function doSearch(q) {
    setQuery(q);
    if (!q.trim()) { setResults(null); return; }
    setSearching(true);
    const r = await onSearch(q.trim());
    setResults(r || []);
    setSearching(false);
  }

  const list = results !== null ? results : conversations;

  return (
    <>
      {open && <div onClick={onClose} className="conv-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, display: "none" }} />}

      <div className={`conv-sidebar ${open ? "open" : ""}`}
        style={{ width: 250, flexShrink: 0, borderRight: "1px solid var(--line)", background: "var(--card)", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "12px 12px 6px" }}>
          <button onClick={onNew}
            style={{ width: "100%", padding: "10px", borderRadius: 12, border: "1.5px dashed rgba(124,111,224,0.35)", background: "transparent", color: "var(--purple-deep)", cursor: "pointer", fontSize: 13.5, fontWeight: 500, marginBottom: 8 }}>
            ＋ 新对话
          </button>

          {/* 搜索框 */}
          <div style={{ position: "relative" }}>
            <input
              value={query}
              onChange={e => doSearch(e.target.value)}
              placeholder="搜索对话..."
              style={{ width: "100%", padding: "7px 28px 7px 10px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card-solid)", fontSize: 12.5, color: "var(--ink)", outline: "none", fontFamily: "inherit" }}
            />
            {query && (
              <button onClick={() => doSearch("")}
                style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "var(--ink-muted)", cursor: "pointer", fontSize: 13, padding: 0 }}>×</button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "4px 8px 12px" }}>
          {searching ? (
            <p style={{ fontSize: 12.5, color: "var(--ink-muted)", textAlign: "center", padding: 16 }}>搜索中...</p>
          ) : list.length === 0 ? (
            <p style={{ fontSize: 12.5, color: "var(--ink-muted)", textAlign: "center", padding: "20px 10px", lineHeight: 1.6 }}>
              {results !== null ? "没有找到相关对话" : "还没有对话记录"}
            </p>
          ) : list.map(c => (
            <div key={c.id}
              onClick={() => { if (editingId !== c.id) { onSelect(c.id); onClose?.(); } }}
              style={{
                padding: "9px 10px", borderRadius: 10, marginBottom: 3, cursor: "pointer",
                background: c.id === activeId ? "var(--purple-light)" : "transparent",
                position: "relative",
              }}>
              {editingId === c.id ? (
                <input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  onBlur={() => commitRename(c.id)}
                  onKeyDown={e => { if (e.key === "Enter") commitRename(c.id); if (e.key === "Escape") setEditingId(null); }}
                  onClick={e => e.stopPropagation()}
                  style={{ width: "100%", border: "1px solid var(--purple)", borderRadius: 6, padding: "3px 6px", fontSize: 13, background: "var(--card-solid)", color: "var(--ink)", outline: "none" }}
                />
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {c.pinned && <span style={{ fontSize: 10 }}>📌</span>}
                    <p style={{ fontSize: 13.5, fontWeight: c.id === activeId ? 600 : 400, margin: 0, color: "var(--ink)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.title}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id); }}
                      style={{ background: "transparent", border: "none", color: "var(--ink-muted)", cursor: "pointer", fontSize: 14, padding: "0 2px", lineHeight: 1 }}>⋯</button>
                  </div>

                  {/* 搜索结果显示匹配片段 */}
                  {c.hits?.length > 0 ? (
                    <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "3px 0 0", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {c.hits[0].role === "user" ? "你：" : "星伴："}{c.hits[0].snippet}
                    </p>
                  ) : (
                    <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "2px 0 0" }}>
                      {timeLabel(c.updated_at)}{c.msg_count > 0 ? ` · ${c.msg_count}条` : ""}
                    </p>
                  )}

                  {menuId === c.id && (
                    <div onClick={e => e.stopPropagation()}
                      style={{ position: "absolute", right: 6, top: 30, background: "var(--card-solid)", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-md)", zIndex: 10, overflow: "hidden", minWidth: 110 }}>
                      {onPin && (
                        <button onClick={() => { setMenuId(null); onPin(c.id, !c.pinned); }} style={menuItemStyle}>
                          {c.pinned ? "取消置顶" : "📌 置顶"}
                        </button>
                      )}
                      <button onClick={() => startRename(c)} style={menuItemStyle}>✎ 重命名</button>
                      {onArchive && (
                        <button onClick={() => { setMenuId(null); onArchive(c.id, true); }} style={menuItemStyle}>
                          📥 归档
                        </button>
                      )}
                      <button onClick={() => { setMenuId(null); onDelete(c.id); }}
                        style={{ ...menuItemStyle, color: "var(--coral-deep)" }}>🗑 删除</button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .conv-sidebar {
            position: fixed !important; left: 0; top: 0; bottom: 0; z-index: 50;
            transform: translateX(-100%); transition: transform 0.25s ease;
            box-shadow: 8px 0 30px rgba(0,0,0,0.2);
          }
          .conv-sidebar.open { transform: translateX(0); }
          .conv-overlay { display: block !important; }
        }
      `}</style>
    </>
  );
}

const menuItemStyle = {
  display: "block", width: "100%", padding: "8px 12px", background: "transparent",
  border: "none", textAlign: "left", cursor: "pointer", fontSize: 12.5, color: "var(--ink)",
};
