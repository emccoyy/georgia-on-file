import type { LocationType } from "@/data/schema";

/** Minimal line icons per location type (24×24, stroke-based, blueprint style). */
const PATHS: Partial<Record<LocationType, string>> & { other: string } = {
  park: "M12 3l5 7h-3l4 6H6l4-6H7zM12 16v5",
  "natural area": "M2 20l7-11 4 6 3-4 6 9z",
  beach: "M2 17c2 0 2-1.5 4-1.5S8 17 10 17s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M2 21c2 0 2-1.5 4-1.5S8 21 10 21s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M17 4a3 3 0 100 6 3 3 0 000-6",
  waterfront: "M12 3v14M8 7h8M5 13a7 7 0 0014 0M2 21h20",
  restaurant: "M7 3v8a2 2 0 002 2v8M11 3v8M15 3c-1.5 2-1.5 7 0 9v9",
  street: "M8 3L5 21M16 3l3 18M12 4v3M12 10v3M12 16v3",
  landmark: "M12 2l3 4h-6zM10 6h4v12h-4zM6 18h12v3H6z",
  campus: "M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6",
  "studio exterior": "M3 8h18v12H3zM3 8l3-5h3l-3 5M9 8l3-5h3l-3 5M15 8l3-5h3",
  "historic site": "M3 21h18M5 21V10M10 21V10M14 21V10M19 21V10M2 10h20L12 4z",
  museum: "M3 21h18M4 10h16M12 3l9 7H3zM6 10v11M10 10v11M14 10v11M18 10v11",
  attraction: "M12 3l2.6 5.6 6 .6-4.5 4 1.3 6L12 16l-5.4 3.2 1.3-6-4.5-4 6-.6z",
  venue: "M3 9c0-3 4-5 9-5s9 2 9 5v8c0 2-4 4-9 4s-9-2-9-4zM3 9c0 3 4 5 9 5s9-2 9-5",
  shopping: "M5 8h14l-1 13H6zM9 8V6a3 3 0 016 0v2",
  cemetery: "M7 21V9a5 5 0 0110 0v12M4 21h16M12 9v6M9.5 11.5h5",
  hotel: "M3 20V6M3 13h18v7M21 13a3 3 0 00-3-3h-8v3M7 11.5a1.5 1.5 0 100-.01",
  theater: "M4 4h16v10c0 4-4 7-8 7s-8-3-8-7zM8 10h.01M16 10h.01M9 15c2 1.5 4 1.5 6 0",
  other: "M12 21s-7-6.5-7-12a7 7 0 0114 0c0 5.5-7 12-7 12zM12 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5",
};

export function TypeIcon({ type, className = "size-5" }: { type: LocationType; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={PATHS[type] ?? PATHS.other} />
    </svg>
  );
}
