"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { locationById, productionsForLocation } from "@/data";
import type { FilmLocation } from "@/data/schema";
import { TYPE_COLORS } from "@/lib/map/config";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { TypeIcon } from "@/components/ui/TypeIcon";

const host = (u: string) => new URL(u).hostname.replace(/^www\./, "");
const directionsUrl = (l: FilmLocation) => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lng}`;

/** Placeholder art: blueprint card with the location-type icon (no copyrighted stills). */
function Placeholder({ l }: { l: FilmLocation }) {
  return (
    <div className="relative grid h-36 place-items-center overflow-hidden border border-line/30 bg-[linear-gradient(135deg,#0d3156,#061a30)]">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(124,196,242,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(124,196,242,.12)_1px,transparent_1px)] bg-[size:20px_20px]" />
      <TypeIcon type={l.type} className="relative size-14 text-accent/80" />
      <span className="absolute bottom-2 left-2.5 font-mono text-[9px] tracking-[0.2em] text-line uppercase">{l.type}</span>
      <span className="absolute right-2.5 bottom-2 font-mono text-[9px] tracking-wider text-line">
        {l.lat.toFixed(4)}°N {Math.abs(l.lng).toFixed(4)}°W
      </span>
    </div>
  );
}

function PanelBody({ l, onClose, headingRef }: { l: FilmLocation; onClose: () => void; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const prods = productionsForLocation(l);
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] text-accent uppercase">
            {l.city} · {l.county} County
          </p>
          <h2 ref={headingRef} tabIndex={-1} className="mt-1 font-display text-4xl leading-[0.9] tracking-wide text-paper outline-none">
            {l.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close location panel"
          className="grid size-9 shrink-0 place-items-center border border-line/40 text-line hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {l.image ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element -- remote Wikimedia images, attribution shown below */}
          <img src={l.image.src} alt={l.image.alt} className="h-44 w-full border border-line/30 object-cover" loading="lazy" />
          <figcaption className="mt-1 font-mono text-[9px] text-line/80">
            <a href={l.image.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline">
              {l.image.credit}
            </a>{" "}
            · {l.image.license}
          </figcaption>
        </figure>
      ) : (
        <Placeholder l={l} />
      )}

      <p className="text-sm leading-relaxed text-paper/85">{l.description}</p>
      {l.approximateCoords && (
        <p className="-mt-3 font-mono text-[10px] tracking-wide text-line/70">⚠ Pin is approximate (landmark or town center).</p>
      )}

      <section aria-labelledby="filmed-here">
        <h3 id="filmed-here" className="mb-2 font-mono text-[10px] tracking-[0.25em] text-line uppercase">
          Filmed here · {prods.length}
        </h3>
        <ul className="flex flex-col divide-y divide-line/20 border-y border-line/20">
          {prods.map((p) => (
            <li key={p.id} className="py-3">
              <Link href={`/production/${p.id}`} className="group block focus-visible:outline-2 focus-visible:outline-accent">
                <p className="flex items-baseline justify-between gap-3">
                  <span className="font-display text-xl leading-none tracking-wide text-paper group-hover:text-accent">{p.title}</span>
                  <span className="font-mono text-[11px] text-line">{p.year}</span>
                </p>
                <p className="mt-1 flex items-center gap-1.5 font-mono text-[10px] tracking-wider uppercase" style={{ color: TYPE_COLORS[p.type] }}>
                  <span className="size-1.5 rounded-full" style={{ background: TYPE_COLORS[p.type] }} aria-hidden />
                  {p.type}
                  {p.distributor && <span className="text-line/70 normal-case">· {p.distributor}</span>}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-paper/70">{p.logline}</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <a
        href={directionsUrl(l)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 border border-accent/60 bg-accent/10 py-2.5 font-mono text-[11px] tracking-[0.2em] text-accent uppercase hover:bg-accent/20 focus-visible:outline-2 focus-visible:outline-accent"
      >
        Get directions ↗
      </a>

      <section aria-labelledby="sources">
        <h3 id="sources" className="mb-1.5 font-mono text-[10px] tracking-[0.25em] text-line uppercase">
          Sources
        </h3>
        <ul className="flex flex-col gap-1">
          {l.sources.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] break-all text-line underline decoration-line/40 hover:text-accent">
                {host(u)}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/**
 * Location details. Desktop: slides in from the right. Mobile: bottom sheet
 * that can be dragged down to dismiss. Escape closes; focus moves to the title.
 */
export function LocationPanel({ id, onClose }: { id: string | null; onClose: () => void }) {
  const l = id ? locationById.get(id) : undefined;
  const desktop = useMediaQuery("(min-width: 768px)");
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const drag = useDragControls();

  useEffect(() => {
    if (!l) return;
    headingRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [l, onClose]);

  const t = reduce ? { duration: 0 } : { type: "spring" as const, damping: 32, stiffness: 300 };

  return (
    <AnimatePresence>
      {l &&
        (desktop ? (
          <motion.aside
            key="panel"
            aria-label={`${l.name} details`}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={t}
            className="absolute top-0 right-0 bottom-0 z-30 w-[420px] max-w-[40vw] overflow-y-auto border-l border-line/40 bg-ink/92 backdrop-blur-md"
          >
            <PanelBody key={l.id} l={l} onClose={onClose} headingRef={headingRef} />
          </motion.aside>
        ) : (
          <motion.aside
            key="sheet"
            aria-label={`${l.name} details`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={t}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => (info.offset.y > 120 || info.velocity.y > 600) && onClose()}
            className="absolute inset-x-0 bottom-0 z-30 flex max-h-[58dvh] flex-col border-t border-line/50 bg-ink/95 backdrop-blur-md"
          >
            <div className="flex cursor-grab touch-none justify-center py-2.5" onPointerDown={(e) => drag.start(e)} aria-hidden>
              <span className="h-1 w-10 rounded-full bg-line/50" />
            </div>
            <div className="overflow-y-auto overscroll-contain">
              <PanelBody key={l.id} l={l} onClose={onClose} headingRef={headingRef} />
            </div>
          </motion.aside>
        ))}
    </AnimatePresence>
  );
}
