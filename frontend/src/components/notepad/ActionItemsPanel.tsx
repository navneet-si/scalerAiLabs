import React from "react";
import { ActionItemRead, ParticipantRead } from "@/lib/types";
import { Checkbox } from "../ui/Checkbox";
import { Avatar } from "../ui/Avatar";
import { formatMs } from "@/lib/time";

type ActionItemsPanelProps = {
  items: ActionItemRead[];
  onToggle: (id: number, checked: boolean) => void;
  onSeek: (ms: number) => void;
  /** Rendered inside the notes document, which supplies its own padding and heading. */
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

export function ActionItemsPanel({ items, onToggle, onSeek, bare = false }: ActionItemsPanelProps) {
  if (items.length === 0) {
    if (bare) return null;
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <h3 className="text-[16px] font-medium text-[var(--color-gray-900)] mb-2">No action items</h3>
        <p className="text-[14px] text-[var(--color-gray-500)] max-w-sm">
          No action items were identified in this meeting.
        </p>
      </div>
    );
  }

  const groups = groupItems(items);

  return (
    <div className={bare ? "" : "p-8 max-w-3xl"}>
      {groups.map((group, i) => (
        <div key={i} className="mb-10 last:mb-0">
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
                className={`flex items-start gap-4 p-4 rounded-[8px] border ${
                  item.is_done ? "bg-[var(--color-gray-50)] border-[var(--color-gray-100)]" : "bg-white border-[var(--color-gray-200)] shadow-sm"
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <Checkbox 
                    checked={item.is_done} 
                    onChange={(e) => onToggle(item.id, e.target.checked)} 
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[14px] leading-snug ${item.is_done ? "text-[var(--color-gray-500)] line-through" : "text-[var(--color-gray-900)]"}`}>
                    {item.text}
                  </p>
                  
                  {item.due_date && (
                    <div className="text-[12px] text-[var(--color-gray-500)] mt-2">
                      Due: {new Date(item.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
