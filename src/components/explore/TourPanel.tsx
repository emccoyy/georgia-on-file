"use client";

import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { locationById } from "@/data";
import { cumulativeMiles, formatMiles, resolveStops, tourShareUrl } from "@/lib/tour";

type Props = {
  ids: string[];
  onChange: (ids: string[]) => void;
  onSelect: (id: string) => void;
  onPlay: () => void;
  onOptimize: () => void;
};

function Stop({ id, n, onRemove, onSelect }: { id: string; n: number; onRemove: () => void; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });
  const l = locationById.get(id);
  if (!l) return null;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 border-b border-line/20 bg-ink py-2 pr-1 ${isDragging ? "relative z-10 border-accent/60 shadow-lg shadow-black/50" : ""}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder stop ${n}, ${l.name}. Press space to pick up, arrow keys to move, space to drop.`}
        className="cursor-grab touch-none px-1 text-line/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
          {[6, 12, 18].map((y) => [9, 15].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.4" />))}
        </svg>
      </button>
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-accent font-mono text-[10px] text-paper">{n}</span>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left focus-visible:outline-2 focus-visible:outline-accent">
        <span className="block truncate text-sm text-paper hover:text-accent">{l.name}</span>
        <span className="block font-mono text-[9px] tracking-widest text-line uppercase">{l.city}</span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${l.name} from tour`}
        className="px-1.5 text-line/60 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      >
        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </li>
  );
}

const btn =
  "border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-40";

/**
 * Film Tour builder: ordered stops (drag or keyboard to reorder), straight-line
 * distance, Play, Share link, nearest-neighbour Optimize, Clear.
 */
export function TourPanel({ ids, onChange, onSelect, onPlay, onOptimize }: Props) {
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const stops = resolveStops(ids);
  const cum = cumulativeMiles(stops);
  const total = cum.at(-1) ?? 0;

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onChange(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  const share = async () => {
    const url = tourShareUrl(ids, window.location.origin);
    try {
      await navigator.clipboard.writeText(url);
      setCopied("ok");
    } catch {
      window.prompt("Copy this tour link:", url);
      setCopied("fail");
    }
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex max-h-[60dvh] flex-col border border-line/40 bg-ink/95 backdrop-blur-md">
      <div className="flex items-baseline justify-between border-b border-line/30 px-4 py-3">
        <h2 className="font-display text-2xl leading-none tracking-wide text-paper">Film tour</h2>
        <p className="font-mono text-[10px] tracking-wider text-line uppercase" aria-live="polite">
          {stops.length} stop{stops.length === 1 ? "" : "s"}
          {stops.length > 1 && ` · ≈ ${formatMiles(total)} mi`}
        </p>
      </div>

      {stops.length === 0 ? (
        <p className="px-4 py-6 text-sm leading-relaxed text-paper/70">
          Open any location and press <span className="font-mono text-[11px] text-accent uppercase">+ Add to tour</span>. Stops are
          joined into a route you can reorder, fly through, and share.
        </p>
      ) : (
        <div className="overflow-y-auto px-3">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ol aria-label="Tour stops">
                {ids.map((id, i) => (
                  <Stop key={id} id={id} n={i + 1} onSelect={() => onSelect(id)} onRemove={() => onChange(ids.filter((x) => x !== id))} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {stops.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-line/30 p-3">
          {stops.length > 1 && (
            <p className="font-mono text-[9px] leading-relaxed tracking-wider text-line/70">
              Distances are straight-line between stops, not driving routes.
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={onPlay} disabled={stops.length < 2} className={`${btn} border-accent bg-accent/15 text-accent hover:bg-accent/25`}>
              ▶ Play tour
            </button>
            <button type="button" onClick={share} className={`${btn} border-line/40 text-line hover:text-paper`}>
              {copied === "ok" ? "Link copied" : "Share"}
            </button>
            <button type="button" onClick={onOptimize} disabled={stops.length < 3} className={`${btn} border-line/40 text-line hover:text-paper`}>
              Optimize order
            </button>
            <button type="button" onClick={() => onChange([])} className={`${btn} ml-auto border-line/40 text-line hover:text-paper`}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
