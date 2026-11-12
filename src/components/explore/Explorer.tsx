"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { locationById, locations } from "@/data";
import { PRODUCTION_TYPES } from "@/data/schema";
import { activeFilterCount, EMPTY_FILTERS, filtersFromParams, filtersToParams, matchesFilters, type Filters } from "@/lib/filters";
import { locationIdsForQuery, type SearchHit } from "@/lib/search";
import { MAX_STOPS, orderByNearest, parseTourParam } from "@/lib/tour";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { SearchBox } from "./SearchBox";
import { FilterPanel } from "./FilterPanel";
import { LocationPanel, type Playback } from "./LocationPanel";
import { TourPanel } from "./TourPanel";
import { LoadingScreen } from "./LoadingScreen";
import { IntroSequence } from "./IntroSequence";

const GeorgiaMap = dynamic(() => import("@/components/map/GeorgiaMap"), { ssr: false });

/** Per stop during Play tour: the camera flight (see camera.ts) plus time to read the card. */
const FLIGHT_MS = 3600;
const DWELL_MS = 5500;
const TOUR_STORAGE_KEY = "gof:tour";
const INTRO_SEEN_KEY = "gof:intro-seen";
const DEEP_LINK_PARAMS = ["loc", "tour", "q", "production", "type", "decade", "county", "city"];

/** Initial state comes from the URL so filtered/selected/tour views are shareable. */
function readUrl() {
  const p = new URLSearchParams(window.location.search);
  const loc = p.get("loc");
  let tour = parseTourParam(p.get("tour"));
  // No tour in the link: fall back to this browser's last tour (a convenience only).
  if (!p.has("tour")) {
    try {
      tour = parseTourParam(window.localStorage.getItem(TOUR_STORAGE_KEY));
    } catch {
      /* storage unavailable */
    }
  }
  // Title card + fly-in: once per session, only on a plain visit (a deep link should
  // land straight on its content), never with reduced motion.
  let intro = !DEEP_LINK_PARAMS.some((k) => p.has(k)) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  try {
    if (window.sessionStorage.getItem(INTRO_SEEN_KEY)) intro = false;
  } catch {
    /* storage unavailable: still play */
  }
  return {
    intro,
    selectedId: loc && locationById.has(loc) ? loc : null,
    filters: filtersFromParams(p, PRODUCTION_TYPES),
    query: p.get("q") ?? "",
    tour,
    autoplay: p.get("play") === "1" && tour.length > 1,
    tourOpen: p.has("tour") && tour.length > 0 && p.get("play") !== "1",
  };
}

type Play = { index: number; paused: boolean };

/**
 * The home map experience: owns selection, filters, search and the film tour,
 * and keeps them in the URL. Rendered client-only (see HomeMap).
 */
export default function Explorer() {
  const [initial] = useState(readUrl);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [query, setQuery] = useState(initial.query);
  const [tour, setTour] = useState<string[]>(initial.tour);
  const [open, setOpen] = useState<"filters" | "tour" | null>(initial.tourOpen ? "tour" : null);
  const [play, setPlay] = useState<Play | null>(null);
  const [ready, setReady] = useState(false);
  const [introDone, setIntroDone] = useState(!initial.intro);
  const finishIntro = useCallback(() => {
    setIntroDone(true);
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }, []);
  const reduce = useReducedMotion() ?? false;
  const desktop = useMediaQuery("(min-width: 768px)");

  const visibleIds = useMemo(() => {
    const q = locationIdsForQuery(query);
    const ids = new Set(locations.filter((l) => matchesFilters(l, filters) && (!q || q.has(l.id))).map((l) => l.id));
    // Tour stops stay visible during playback even if filtered out.
    if (play) tour.forEach((id) => ids.add(id));
    return ids;
  }, [filters, query, play, tour]);

  // Mirror state into the URL (replaceState: no history spam, no re-render).
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    filtersToParams(filters, p);
    const set = (k: string, v: string | null) => (v ? p.set(k, v) : p.delete(k));
    set("loc", selectedId);
    set("q", query.trim() || null);
    set("tour", tour.length ? tour.join(",") : null);
    p.delete("play");
    const qs = p.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filters, selectedId, query, tour]);

  // Remember the tour in this browser.
  useEffect(() => {
    try {
      window.localStorage.setItem(TOUR_STORAGE_KEY, tour.join(","));
    } catch {
      /* storage unavailable */
    }
  }, [tour]);

  // --- Tour playback --------------------------------------------------------
  const goTo = useCallback(
    (index: number) => {
      setPlay((p) => (p ? { ...p, index } : p));
      setSelectedId(tour[index]);
    },
    [tour],
  );
  const startTour = useCallback(() => {
    if (tour.length < 2) return;
    setOpen(null);
    setPlay({ index: 0, paused: false });
    setSelectedId(tour[0]);
  }, [tour]);
  const stopTour = useCallback(() => setPlay(null), []);

  // Auto-advance (not with reduced motion: then stepping is manual, with instant cuts).
  useEffect(() => {
    if (!play || play.paused || reduce || play.index >= tour.length - 1) return;
    const t = setTimeout(() => goTo(play.index + 1), FLIGHT_MS + DWELL_MS);
    return () => clearTimeout(t);
  }, [play, reduce, tour.length, goTo]);

  // ?play=1 (e.g. from "Tour this production"): start once the map is ready.
  const [autoplayPending, setAutoplayPending] = useState(initial.autoplay);
  useEffect(() => {
    if (!ready || !autoplayPending) return;
    const t = setTimeout(() => {
      setAutoplayPending(false);
      startTour();
    }, 400);
    return () => clearTimeout(t);
  }, [ready, autoplayPending, startTour]);

  // --- Handlers ------------------------------------------------------------------
  const onReady = useCallback(() => setReady(true), []);
  const close = useCallback(() => {
    setPlay(null);
    setSelectedId(null);
  }, []);
  // Picking a pin by hand ends playback.
  const select = useCallback((id: string) => {
    setPlay(null);
    setSelectedId(id);
  }, []);
  const editTour = (ids: string[]) => {
    setPlay(null);
    setTour(ids);
  };
  const toggleInTour = (id: string) => editTour(tour.includes(id) ? tour.filter((x) => x !== id) : [...tour, id].slice(0, MAX_STOPS));

  const pick = (hit: SearchHit) => {
    setQuery("");
    if (hit.kind === "location") select(hit.id);
    else {
      setFilters({ ...EMPTY_FILTERS, productionId: hit.id });
      setSelectedId(null);
    }
  };

  const nActive = activeFilterCount(filters) + (query.trim().length >= 2 ? 1 : 0);
  const clearAll = () => {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  };

  const playback: Playback | null =
    play && selectedId === tour[play.index]
      ? {
          index: play.index,
          total: tour.length,
          paused: play.paused,
          auto: !reduce,
          onPrev: () => goTo(Math.max(0, play.index - 1)),
          onNext: () => goTo(Math.min(tour.length - 1, play.index + 1)),
          onTogglePause: () => setPlay((p) => (p ? { ...p, paused: !p.paused } : p)),
          onExit: stopTour,
        }
      : null;

  const barBtn = (active: boolean) =>
    `flex h-10 shrink-0 items-center gap-2 border px-3 font-mono text-[10px] tracking-[0.2em] uppercase backdrop-blur-md focus-visible:outline-2 focus-visible:outline-accent ${
      active ? "border-accent bg-accent/10 text-accent" : "border-line/40 bg-ink/80 text-line hover:text-paper"
    }`;

  return (
    <div className="group absolute inset-0" data-panel={selectedId ? "open" : "closed"}>
      <GeorgiaMap
        visibleIds={visibleIds}
        selectedId={selectedId}
        onSelect={select}
        onReady={onReady}
        tourIds={tour}
        tourStep={play ? play.index : null}
        intro={!initial.intro ? "done" : introDone ? "play" : "pending"}
      />

      {/* Search, filters and tour, top-left inside the drafting frame. */}
      <div className="absolute top-5 right-14 left-5 z-20 flex flex-col gap-2 sm:top-8 sm:right-auto sm:left-8 sm:w-[400px]">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <SearchBox query={query} onQuery={setQuery} onPick={pick} />
          </div>
          <button
            type="button"
            aria-expanded={open === "filters"}
            aria-controls="filter-panel"
            onClick={() => setOpen((o) => (o === "filters" ? null : "filters"))}
            className={barBtn(open === "filters" || nActive > 0)}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {nActive > 0 && <span className="text-paper">{nActive}</span>}
            <span className="sr-only">{nActive > 0 ? `${nActive} active` : ""}</span>
          </button>
          <button
            type="button"
            aria-expanded={open === "tour"}
            aria-controls="tour-panel"
            onClick={() => setOpen((o) => (o === "tour" ? null : "tour"))}
            className={barBtn(open === "tour" || tour.length > 0)}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
              <circle cx="5" cy="18" r="2" />
              <circle cx="19" cy="6" r="2" />
              <path d="M7 18h6a3 3 0 000-6h-2a3 3 0 010-6h6" />
            </svg>
            <span className="hidden sm:inline">Tour</span>
            {tour.length > 0 && <span className="text-paper">{tour.length}</span>}
            <span className="sr-only">{tour.length} stops</span>
          </button>
        </div>

        {nActive > 0 && open !== "filters" && (
          <p className="font-mono text-[10px] tracking-wider text-line uppercase" aria-live="polite">
            {visibleIds.size} of {locations.length} locations ·{" "}
            <button type="button" onClick={clearAll} className="text-accent hover:underline">
              Clear
            </button>
          </p>
        )}

        <AnimatePresence mode="wait">
          {open && (
            <motion.div
              key={open}
              id={open === "filters" ? "filter-panel" : "tour-panel"}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
            >
              {open === "filters" ? (
                <FilterPanel filters={filters} onChange={setFilters} shown={visibleIds.size} total={locations.length} onClear={clearAll} />
              ) : (
                <TourPanel
                  ids={tour}
                  onChange={editTour}
                  onSelect={(id) => {
                    select(id);
                    if (!desktop) setOpen(null); // phones: make room for the bottom sheet
                  }}
                  onPlay={startTour}
                  onOptimize={() => editTour(orderByNearest(tour))}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <LocationPanel
        id={selectedId}
        onClose={close}
        tour={
          selectedId
            ? { inTour: tour.includes(selectedId), full: tour.length >= MAX_STOPS, onToggle: () => toggleInTour(selectedId) }
            : undefined
        }
        playback={playback}
      />
      <IntroSequence show={!introDone} onDone={finishIntro} />
      {/* After the title card, keep showing the loader if the map still isn't ready. */}
      <LoadingScreen show={!ready && introDone} />
    </div>
  );
}
