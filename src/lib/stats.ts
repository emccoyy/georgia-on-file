import { locations, productions } from "@/data";
import { PRODUCTION_TYPES, type ProductionType } from "@/data/schema";
import { decadeOf } from "./filters";

export type Bar = { key: string; label: string; value: number; detail?: string; color?: string; href?: string };

/** Productions by decade of release (every decade in range, empty ones included). */
export function productionsByDecade(): Bar[] {
  const by = new Map<number, string[]>();
  for (const p of productions) by.set(decadeOf(p.year), [...(by.get(decadeOf(p.year)) ?? []), p.title]);
  const ds = [...by.keys()];
  const out: Bar[] = [];
  for (let d = Math.min(...ds); d <= Math.max(...ds); d += 10) {
    const titles = by.get(d) ?? [];
    out.push({ key: String(d), label: `${d}s`, value: titles.length, detail: titles.slice(0, 4).join(", ") + (titles.length > 4 ? ` +${titles.length - 4} more` : "") });
  }
  return out;
}

/** Counties ranked by number of filming locations. */
export function topCounties(n = 10): Bar[] {
  const by = new Map<string, number>();
  for (const l of locations) by.set(l.county, (by.get(l.county) ?? 0) + 1);
  return [...by]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([county, v]) => ({ key: county, label: `${county} County`, value: v, href: `/?county=${encodeURIComponent(county)}` }));
}

/** Productions per format. */
export function typeBreakdown(colors: Record<ProductionType, string>): Bar[] {
  return PRODUCTION_TYPES.map((t) => ({
    key: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
    value: productions.filter((p) => p.type === t).length,
    color: colors[t],
    href: `/?type=${encodeURIComponent(t)}`,
  })).filter((b) => b.value > 0);
}

/** Locations with the most productions filmed there. */
export function busiestLocations(n = 8): Bar[] {
  return [...locations]
    .sort((a, b) => b.productionIds.length - a.productionIds.length || a.name.localeCompare(b.name))
    .slice(0, n)
    .map((l) => ({ key: l.id, label: l.name, value: l.productionIds.length, detail: l.city, href: `/?loc=${l.id}` }));
}

export function headline() {
  const years = productions.map((p) => p.year);
  return {
    locations: locations.length,
    productions: productions.length,
    counties: new Set(locations.map((l) => l.county)).size,
    cities: new Set(locations.map((l) => l.city)).size,
    firstYear: Math.min(...years),
    lastYear: Math.max(...years),
  };
}
