"use client";

import { useEffect, useMemo, useState } from "react";

const MEMORY_STORAGE_KEY = "xiaokb_user_memories_v1";
const OPEN_EVENT = "kb-memory-center-open";
const MAX_MEMORIES = 12;
const MAX_MEMORY_LENGTH = 180;

function makeMemory(content) {
  return {
    id: globalThis.crypto?.randomUUID?.() || `memory_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    content: content.trim().slice(0, MAX_MEMORY_LENGTH),
    enabled: true,
    updatedAt: Date.now(),
  };
}

function normalizeMemories(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item.content === "string")
    .map((item) => ({
      id: String(item.id || `memory_${Math.random().toString(16).slice(2)}`),
      content: item.content.trim().slice(0, MAX_MEMORY_LENGTH),
      enabled: item.enabled !== false,
      updatedAt: Number(item.updatedAt) || Date.now(),
    }))
    .filter((item) => item.content)
    .slice(0, MAX_MEMORIES);
}

function readMemories() {
  try {
    return normalizeMemories(JSON.parse(localStorage.getItem(MEMORY_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

export default function MemoryCenter() {
  const [open, setOpen] = useState(false);
  const [memories, setMemories] = useState([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");

  const enabledCount = useMemo(() => memories.filter((item) => item.enabled).length, [memories]);

  useEffect(() => {
    const onOpen = () => {
      setMemories(readMemories());
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function persist(next) {
    const normalized = normalizeMemories(next);
    setMemories(normalized);
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(normalized));
  }

  function addMemory() {
    const content = draft.trim();
    if (!content || memories.length >= MAX_MEMORIES) return;
    persist([makeMemory(content), ...memories]);
    setDraft("");
  }

  function saveEdit(id) {
    const content = editingValue.trim();
    if (!content) return;
    persist(memories.map((item) => item.id === id ? { ...item, content: content.slice(0, MAX_MEMORY_LENGTH), updatedAt: Date.now() } : item));
    setEditingId(null);
    setEditingValue("");
  }

  function toggleMemory(id) {
    persist(memories.map((item) => item.id === id ? { ...item, enabled: !item.enabled, updatedAt: Date.now() } : item));
  }

  function deleteMemory(id) {
    persist(memories.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setEditingValue("");
    }
  }

  if (!open) return null;

  return (
    <div className="memoryCenterBackdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <section className="memoryCenter" role="dialog" aria-modal="true" aria-labelledby="memory-center-title">
        <header className="memoryCenterHeader">
          <div>
            <span className="memoryCenterEyebrow">XIAOKB MEMORY</span>
            <h2 id="memory-center-title">小KB记得的事</h2>
            <p>我会记得，但记什么由你决定。</p>
          </div>
          <button type="button" className="memoryCenterClose" onClick={() => setOpen(false)} aria-label="关闭记忆中心">×</button>
        </header>

        <div className="memoryCenterPrivacy">
          <span aria-hidden="true">◌</span>
          <p><strong>可控记忆</strong>只保存你主动写下的内容。关闭某条后，小KB不会在聊天里参考它；受保护私人记忆不会显示在这里，也不能从这里编辑。</p>
        </div>

        <div className="memoryComposer">
          <textarea
            value={draft}
            maxLength={MAX_MEMORY_LENGTH}
            rows={3}
            placeholder="例如：我做开发，讲技术时先说人话和直觉，再补术语。"
            onChange={(event) => setDraft(event.target.value)}
          />
          <div>
            <small>{draft.length}/{MAX_MEMORY_LENGTH} · 最多 {MAX_MEMORIES} 条</small>
            <button type="button" onClick={addMemory} disabled={!draft.trim() || memories.length >= MAX_MEMORIES}>记住这件事</button>
          </div>
        </div>

        <div className="memoryCenterMeta">
          <span>{enabledCount} 条启用</span>
          <span>{memories.length}/{MAX_MEMORIES}</span>
        </div>

        <div className="memoryList">
          {memories.length === 0 ? (
            <div className="memoryEmpty">
              <span aria-hidden="true">KB</span>
              <strong>这里还很安静</strong>
              <p>写下一件你希望小KB以后自然记得的事。</p>
            </div>
          ) : memories.map((memory) => (
            <article className={`memoryItem${memory.enabled ? " isEnabled" : " isDisabled"}`} key={memory.id}>
              <button className="memoryToggle" type="button" onClick={() => toggleMemory(memory.id)} aria-pressed={memory.enabled} aria-label={memory.enabled ? "停用这条记忆" : "启用这条记忆"}>
                <i aria-hidden="true" />
              </button>

              <div className="memoryItemBody">
                {editingId === memory.id ? (
                  <textarea value={editingValue} maxLength={MAX_MEMORY_LENGTH} rows={3} autoFocus onChange={(event) => setEditingValue(event.target.value)} />
                ) : <p>{memory.content}</p>}
                <small>{memory.enabled ? "聊天中会自然参考" : "已暂停使用"}</small>
              </div>

              <div className="memoryItemActions">
                {editingId === memory.id ? (
                  <>
                    <button type="button" onClick={() => saveEdit(memory.id)} disabled={!editingValue.trim()}>保存</button>
                    <button type="button" onClick={() => { setEditingId(null); setEditingValue(""); }}>取消</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => { setEditingId(memory.id); setEditingValue(memory.content); }}>编辑</button>
                    <button type="button" className="isDanger" onClick={() => deleteMemory(memory.id)}>忘掉</button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>

        <footer className="memoryCenterFooter">记忆保存在当前浏览器。清除浏览器网站数据后，这些普通记忆也会被清除。</footer>
      </section>
    </div>
  );
}
