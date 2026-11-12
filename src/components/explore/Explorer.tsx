"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { locationById, locations } from "@/data";
import { PRODUCTION_TYPES } from "@/data/schema";
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, filtersToParams, matchesFilters, type Filters } from "@/lib/filters";
import { locationIdsForQuery, type SearchHit } from "@/lib/search";
import { SearchBox } from "./SearchBox";
import { FilterPanel } from "./FilterPanel";
import { LocationPanel } from "./LocationPanel";
import { LoadingScreen } from "./LoadingScreen";

const GeorgiaMap = dynamic(() => import("@/components/map/GeorgiaMap"), { ssr: false });

/** Initial state comes from the URL so filtered/selected views are shareable. */
function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const loc = p.get("loc");
  return {
    selectedId: loc && locationById.has(loc) ? loc : null,
    filters: filtersFromParams(p, PRODUCTION_TYPES),
    query: p.get("q") ?? "",
  };
}

/**
 * The home map experience: owns selection, filters and search, and keeps them
 * in the URL. Rendered client-only (see HomeMap), so reading window is safe.
 */
export default function Explorer() {
  const [initial] = useState(readUrl);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [query, setQuery] = useState(initial.query);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [ready, setReady] = useState(false);

  const visibleIds = useMemo(() => {
    const q = locationIdsForQuery(query);
    return new Set(locations.filter((l) => matchesFilters(l, filters) && (!q || q.has(l.id))).map((l) => l.id));
  }, [filters, query]);

  // Mirror state into the URL (replaceState: no history spam, no re-render).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    filtersToParams(filters, p);
    if (selectedId) p.set("loc", selectedId);
    else p.delete("loc");
    if (query.trim()) p.set("q", query.trim());
    else p.delete("q");
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters, selectedId, query]);

  const close = useCallback(() => setSelectedId(null), []);
  const onReady = useCallback(() => setReady(true), []);

  const pick = (hit: SearchHit) => {
    if (hit.kind === "location") {
      setQuery("");
      setSelectedId(hit.id);
    } else {
      setQuery("");
      setFilters({ ...EMPTY_FILTERS, productionId: hit.id });
      setSelectedId(null);
    }
  };

  const nActive = activeFilterCount(filters) + (query.trim().length >= 2 ? 1 : 0);
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  };

  return (
    <div className="group absolute inset-0" data-panel={selectedId ? "open" : "closed"}>
      <GeorgiaMap visibleIds={visibleIds} selectedId={selectedId} onSelect={setSelectedId} onReady={onReady} />

      {/* Search + filters, top-left inside the drafting frame. */}
      <div className="absolute top-5 right-14 left-5 z-20 flex flex-col gap-2 sm:top-8 sm:right-auto sm:left-8 sm:w-[360px]">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <SearchBox query={query} onQuery={setQuery} onPick={pick} />
          </div>
          <button
            type="button"
            aria-expanded={filtersOpen}
            aria-controls="filter-panel"
            onClick={() => setFiltersOpen((o) => !o)}
            className={`flex h-10 shrink-0 items-center gap-2 border px-3 font-mono text-[10px] tracking-[0.2em] uppercase backdrop-blur-md focus-visible:outline-2 focus-visible:outline-accent ${
              filtersOpen || nActive ? "border-accent bg-accent/10 text-accent" : "border-line/40 bg-ink/80 text-line hover:text-paper"
            }`}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {nActive > 0 && <span className="text-paper">{nActive}</span>}
          </button>
        </div>

        {nActive > 0 && !filtersOpen && (
          <p className="font-mono text-[10px] tracking-wider text-line uppercase" aria-live="polite">
            {visibleIds.size} of {locations.length} locations ·{" "}
            <button type="button" onClick={clearAll} className="text-accent hover:underline">
              Clear
            </button>
          </p>
        )}

        <AnimatePresence>
          {filtersOpen && (
            <motion.div
              id="filter-panel"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              <FilterPanel filters={filters} onChange={setFilters} shown={visibleIds.size} total={locations.length} onClear={clearAll} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LocationPanel id={selectedId} onClose={close} />
      <LoadingScreen show={!ready} />
    </div>
  );
}
