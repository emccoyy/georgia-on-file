import Fuse from "fuse.js";
import { locations, productions, productionsForLocation } from "@/data";

export type SearchHit =
  | { kind: "location"; id: string; label: string; detail: string }
  | { kind: "production"; id: string; label: string; detail: string };

type Entry = SearchHit & { extra: string };

const entries: Entry[] = [
  ...locations.map((l) => ({
    kind: "location" as const,
    id: l.id,
    label: l.name,
    detail: `${l.city} · ${l.county} County`,
    extra: productionsForLocation(l)
      .map((p) => p.title)
      .join(" "),
  })),
  ...productions.map((p) => ({
    kind: "production" as const,
    id: p.id,
    label: p.title,
    detail: `${p.year} · ${p.type}`,
    extra: p.distributor ?? "",
  })),
];

// Fuzzy, typo-tolerant. Titles and place names weigh most; cities and the
// productions shot at a place help ("walking dead" finds Senoia's Main Street).
const fuse = new Fuse(entries, {
  keys: [
    { name: "label", weight: 3 },
    { name: "detail", weight: 1 },
    { name: "extra", weight: 1 },
  ],
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
});

export function search(query: string, limit = 8): SearchHit[] {
  if (query.trim().length < 2) return [];
  return fuse.search(query.trim(), { limit }).map(({ item }) => ({
    kind: item.kind,
    id: item.id,
    label: item.label,
    detail: item.detail,
  }));
}

/** Location ids a query matches: direct location hits plus every location of a matching production. */
export function locationIdsForQuery(query: string): Set<string> | null {
  if (query.trim().length < 2) return null;
  const ids = new Set<string>();
  for (const { item } of fuse.search(query.trim())) {
    if (item.kind === "location") ids.add(item.id);
    else productions.find((p) => p.id === item.id)?.locationIds.forEach((id) => ids.add(id));
  }
  return ids;
}
