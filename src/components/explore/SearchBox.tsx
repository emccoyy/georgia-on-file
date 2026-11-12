"use client";

import { useId, useMemo, useState } from "react";
import { search, type SearchHit } from "@/lib/search";

type Props = {
  query: string;
  onQuery: (q: string) => void;
  onPick: (hit: SearchHit) => void;
};

/**
 * Fuzzy search over location names, cities and production titles. ARIA
 * combobox: ↑/↓ to move, Enter to pick, Escape to clear. Typing also filters
 * the pins on the map live (handled by the parent via onQuery).
 */
export function SearchBox({ query, onQuery, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = useMemo(() => search(query), [query]);
  const listId = useId();
  const showList = open && hits.length > 0;

  const pick = (hit: SearchHit) => {
    onPick(hit);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 border border-line/40 bg-ink/80 px-3 backdrop-blur-md focus-within:border-accent">
        <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-line" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16l5 5" />
        </svg>
        <input
          type="text"
          role="combobox"
          aria-label="Search locations and productions"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          placeholder="Search titles, places, towns…"
          value={query}
          onChange={(e) => {
            onQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, hits.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && showList) {
              e.preventDefault();
              pick(hits[active]);
            } else if (e.key === "Escape") {
              onQuery("");
              setOpen(false);
            }
          }}
          className="h-10 w-full bg-transparent font-mono text-[12px] tracking-wide text-paper placeholder:text-line/60 focus:outline-none"
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => onQuery("")}
            className="font-mono text-[10px] tracking-widest text-line uppercase hover:text-accent"
          >
            Clear
          </button>
        )}
      </div>
      {showList && (
        <ul id={listId} role="listbox" className="absolute inset-x-0 top-full z-40 mt-1 border border-line/40 bg-ink/95 backdrop-blur-md">
          {hits.map((h, i) => (
            <li
              key={`${h.kind}-${h.id}`}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(h)}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2 ${i === active ? "bg-accent/10" : ""}`}
            >
              <span className="truncate text-sm text-paper">{h.label}</span>
              <span className="shrink-0 font-mono text-[9px] tracking-widest text-line uppercase">
                {h.kind === "production" ? "Title" : "Place"} · {h.detail.split(" · ")[0]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
