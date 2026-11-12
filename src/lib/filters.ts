import { locations, productionsForLocation } from "@/data";
import type { FilmLocation, ProductionType } from "@/data/schema";

export type Filters = {
  productionId: string | null;
  types: ProductionType[]; // empty = all
  decade: number | null; // e.g. 1990
  county: string | null;
  city: string | null;
};

export const EMPTY_FILTERS: Filters = { productionId: null, types: [], decade: null, county: null, city: null };

export const decadeOf = (year: number) => Math.floor(year / 10) * 10;

export function matchesFilters(l: FilmLocation, f: Filters): boolean {
  if (f.county && l.county !== f.county) return false;
  if (f.city && l.city !== f.city) return false;
  const prods = productionsForLocation(l);
  if (f.productionId && !l.productionIds.includes(f.productionId)) return false;
  // Type and decade must be satisfied by the same production (e.g. "a TV series from the 1980s").
  if (f.types.length || f.decade !== null) {
    return prods.some(
      (p) => (!f.types.length || f.types.includes(p.type)) && (f.decade === null || decadeOf(p.year) === f.decade),
    );
  }
  return true;
}

export function activeFilterCount(f: Filters) {
  return (f.productionId ? 1 : 0) + (f.types.length ? 1 : 0) + (f.decade !== null ? 1 : 0) + (f.county ? 1 : 0) + (f.city ? 1 : 0);
}

/** Select options derived from the dataset. */
export const FILTER_OPTIONS = (() => {
  const decades = new Set<number>();
  for (const l of locations) for (const p of productionsForLocation(l)) decades.add(decadeOf(p.year));
  const sorted = (xs: Iterable<string>) => [...new Set(xs)].sort((a, b) => a.localeCompare(b));
  return {
    decades: [...decades].sort((a, b) => a - b),
    counties: sorted(locations.map((l) => l.county)),
    cities: sorted(locations.map((l) => l.city)),
  };
})();

/** URL <-> filter state, so a filtered/selected view can be shared. */
export function filtersToParams(f: Filters, params: URLSearchParams) {
  const set = (k: string, v: string | null) => (v ? params.set(k, v) : params.delete(k));
  set("production", f.productionId);
  set("type", f.types.length ? f.types.join(",") : null);
  set("decade", f.decade !== null ? String(f.decade) : null);
  set("county", f.county);
  set("city", f.city);
}

export function filtersFromParams(params: URLSearchParams, validTypes: readonly string[]): Filters {
  const decade = Number(params.get("decade"));
  return {
    productionId: params.get("production"),
    types: (params.get("type")?.split(",") ?? []).filter((t): t is ProductionType => validTypes.includes(t)),
    decade: Number.isFinite(decade) && decade > 1800 ? decade : null,
    county: params.get("county"),
    city: params.get("city"),
  };
}
