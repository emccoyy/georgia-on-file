"use client";

import { productions } from "@/data";
import { PRODUCTION_TYPES } from "@/data/schema";
import { FILTER_OPTIONS, type Filters } from "@/lib/filters";
import { TYPE_COLORS } from "@/lib/map/config";

const presentTypes = PRODUCTION_TYPES.filter((t) => productions.some((p) => p.type === t));
const sortedProductions = [...productions].sort((a, b) => a.title.localeCompare(b.title));

const label = "mb-1.5 block font-mono text-[10px] tracking-[0.25em] text-line uppercase";
const select =
  "h-9 w-full border border-line/40 bg-ink px-2 font-mono text-[11px] text-paper focus:border-accent focus:outline-none";

function Chip({ on, onClick, children, color }: { on: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] tracking-wider uppercase transition-colors focus-visible:outline-2 focus-visible:outline-accent ${
        on ? "border-accent bg-accent/15 text-paper" : "border-line/30 text-line hover:border-line"
      }`}
    >
      {color && <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden />}
      {children}
    </button>
  );
}

export function FilterPanel({ filters, onChange, shown, total, onClear }: {
  filters: Filters;
  onChange: (f: Filters) => void;
  shown: number;
  total: number;
  onClear: () => void;
}) {
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => onChange({ ...filters, [k]: v });
  return (
    <div className="flex max-h-[60dvh] flex-col gap-4 overflow-y-auto border border-line/40 bg-ink/95 p-4 backdrop-blur-md">
      <fieldset>
        <legend className={label}>Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {presentTypes.map((t) => (
            <Chip
              key={t}
              color={TYPE_COLORS[t]}
              on={filters.types.includes(t)}
              onClick={() => set("types", filters.types.includes(t) ? filters.types.filter((x) => x !== t) : [...filters.types, t])}
            >
              {t}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={label}>Decade</legend>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_OPTIONS.decades.map((d) => (
            <Chip key={d} on={filters.decade === d} onClick={() => set("decade", filters.decade === d ? null : d)}>
              {d}s
            </Chip>
          ))}
        </div>
      </fieldset>

      <label>
        <span className={label}>Production</span>
        <select className={select} value={filters.productionId ?? ""} onChange={(e) => set("productionId", e.target.value || null)}>
          <option value="">All productions</option>
          {sortedProductions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title} ({p.year})
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className={label}>County</span>
          <select className={select} value={filters.county ?? ""} onChange={(e) => set("county", e.target.value || null)}>
            <option value="">All</option>
            {FILTER_OPTIONS.counties.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={label}>City</span>
          <select className={select} value={filters.city ?? ""} onChange={(e) => set("city", e.target.value || null)}>
            <option value="">All</option>
            {FILTER_OPTIONS.cities.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center justify-between border-t border-line/20 pt-3">
        <p className="font-mono text-[10px] tracking-wider text-line uppercase" aria-live="polite">
          {shown} of {total} locations
        </p>
        <button type="button" onClick={onClear} className="font-mono text-[10px] tracking-widest text-accent uppercase hover:underline">
          Clear all
        </button>
      </div>
    </div>
  );
}
