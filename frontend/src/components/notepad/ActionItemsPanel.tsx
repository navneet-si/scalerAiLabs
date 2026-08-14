import React, { useState, useEffect, useRef } from "react";
import { ActionItemRead, ParticipantRead } from "@/lib/types";
import { Checkbox } from "../ui/Checkbox";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { api } from "@/lib/api";

type ActionItemsPanelProps = {
  items: ActionItemRead[];
  onToggle: (id: number, checked: boolean) => void;
  onAdd?: (text: string) => void;
  onUpdate?: (id: number, data: any, optimisticData: any) => void;
  onDelete?: (id: number) => void;
  onSeek: (ms: number) => void;
  bare?: boolean;
};

// Group action items by assignee
function groupItems(items: ActionItemRead[]) {
  const grouped = new Map<number | "unassigned", { assignee: ParticipantRead | null, items: ActionItemRead[] }>();
  
  items.forEach(item => {
    const key = item.assignee ? item.assignee.id : "unassigned";
    if (!grouped.has(key)) {
      grouped.set(key, { assignee: item.assignee, items: [] });
    }
    grouped.get(key)!.items.push(item);
  });
  
  return Array.from(grouped.values()).sort((a, b) => {
    if (!a.assignee) return 1;
    if (!b.assignee) return -1;
    return a.assignee.name.localeCompare(b.assignee.name);
  });
}

function EditableText({ text, onSave }: { text: string, onSave: (val: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="flex-1 w-full text-[14px] px-2 py-1 border border-[var(--color-purple-500)] rounded outline-none"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (val !== text && val.trim()) onSave(val.trim());
          else setVal(text);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            setEditing(false);
            if (val !== text && val.trim()) onSave(val.trim());
            else setVal(text);
          }
          if (e.key === "Escape") {
            setEditing(false);
            setVal(text);
          }
        }}
      />
    );
  }
  return (
    <span 
      className="flex-1 min-w-0 cursor-text px-2 py-1 border border-transparent hover:border-[var(--color-gray-200)] rounded transition-colors"
      onClick={() => setEditing(true)}
    >
      {text}
    </span>
  );
}

export function ActionItemsPanel({ items, onToggle, onAdd, onUpdate, onDelete, onSeek, bare = false }: ActionItemsPanelProps) {
  const [participants, setParticipants] = useState<ParticipantRead[]>([]);
  const [newItemText, setNewItemText] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    api.getParticipants().then(setParticipants).catch(console.error);
  }, []);

  const groups = groupItems(items);

  return (
    <div className={bare ? "" : "p-8 max-w-3xl"}>
      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-[var(--color-gray-200)] rounded-[8px] mb-8 bg-white shadow-sm">
          <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-2">No action items</h3>
          <p className="text-[14px] text-[var(--color-gray-500)] max-w-sm">
            No action items were identified in this meeting.
          </p>
        </div>
      )}

      {groups.map((group, i) => (
        <div key={i} className="mb-10 last:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Avatar 
              name={group.assignee?.name || "Unassigned"} 
              initials={group.assignee?.initials || "?"}
              color={group.assignee?.avatar_color || "#98A2B3"}
              size={24}
            />
            <h3 className="text-[16px] font-medium text-[var(--color-gray-900)]">
              {group.assignee?.name || "Unassigned"}
            </h3>
          </div>
          
          <div className="flex flex-col gap-3">
            {group.items.map(item => (
              <div 
                key={item.id} 
                className={`flex items-start gap-4 p-4 rounded-[8px] border relative group ${
                  item.is_done ? "bg-[var(--color-gray-50)] border-[var(--color-gray-100)]" : "bg-white border-[var(--color-gray-200)] shadow-sm hover:border-[var(--color-gray-300)]"
                }`}
              >
                <div className="mt-1 flex-shrink-0">
                  <Checkbox 
                    checked={item.is_done} 
                    onChange={(e) => onToggle(item.id, e.target.checked)} 
                  />
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className={`flex text-[14px] leading-snug ${item.is_done ? "text-[var(--color-gray-500)] line-through" : "text-[var(--color-gray-900)]"}`}>
                    <EditableText 
                      text={item.text} 
                      onSave={(val) => {
                        if (onUpdate) onUpdate(item.id, { text: val }, { text: val });
                      }} 
                    />
                  </div>
                  
                  <div className="flex items-center gap-4 text-[12px] text-[var(--color-gray-500)] opacity-70 hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Assign:</span>
                      <select 
                        className="bg-transparent outline-none cursor-pointer text-[var(--color-gray-700)] hover:text-[var(--color-gray-900)] border-b border-transparent hover:border-gray-300"
                        value={item.assignee?.id || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          const assigneeId = val ? Number(val) : null;
                          const assigneeObj = assigneeId ? participants.find(p => p.id === assigneeId) || null : null;
                          if (onUpdate) onUpdate(item.id, { assignee_id: assigneeId }, { assignee: assigneeObj });
                        }}
                      >
                        <option value="">Unassigned</option>
                        {participants.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-medium">Due:</span>
                      <input 
                        type="date"
                        className="bg-transparent outline-none cursor-pointer text-[var(--color-gray-700)] hover:text-[var(--color-gray-900)] border-b border-transparent hover:border-gray-300"
                        value={item.due_date || ""}
                        onChange={(e) => {
                          const val = e.target.value || null;
                          if (onUpdate) onUpdate(item.id, { due_date: val }, { due_date: val });
                        }}
                      />
                    </div>
                  </div>
                </div>

                {onDelete && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {deletingId === item.id ? (
                      <div className="flex items-center gap-2 bg-white shadow-sm border border-[var(--color-gray-200)] rounded px-2 py-1">
                        <span className="text-[12px] text-[var(--color-red-600)] font-medium">Delete?</span>
                        <button onClick={() => onDelete(item.id)} className="text-[12px] text-white bg-[var(--color-red-600)] px-2 py-0.5 rounded hover:bg-[var(--color-red-700)]">Yes</button>
                        <button onClick={() => setDeletingId(null)} className="text-[12px] text-[var(--color-gray-500)] px-2 py-0.5 hover:bg-[var(--color-gray-100)] rounded">No</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeletingId(item.id)}
                        className="text-[var(--color-gray-400)] hover:text-[var(--color-red-600)] p-1 rounded hover:bg-[var(--color-gray-100)] transition-colors"
                        title="Delete action item"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {onAdd && (
        <div className="flex items-center gap-3 mt-6 p-4 border border-dashed border-[var(--color-gray-300)] rounded-[8px] bg-[var(--color-gray-50)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-gray-400)] ml-2"><path d="M12 5v14M5 12h14"/></svg>
          <input 
            type="text" 
            placeholder="Add action item... (Press Enter to save)" 
            className="flex-1 bg-transparent border-none outline-none text-[14px] text-[var(--color-gray-900)] placeholder:text-[var(--color-gray-400)]"
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newItemText.trim()) {
                onAdd(newItemText.trim());
                setNewItemText("");
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
