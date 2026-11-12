import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import { locationById } from "@/data";
import type { FilmLocation } from "@/data/schema";

export const MAX_STOPS = 25;

const R_MI = 3958.8;
const rad = (d: number) => (d * Math.PI) / 180;

/** Great-circle distance in miles. */
export function milesBetween(a: FilmLocation, b: FilmLocation): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_MI * Math.asin(Math.sqrt(h));
}

export const resolveStops = (ids: string[]) => ids.map((id) => locationById.get(id)).filter((l): l is FilmLocation => !!l);

/** Cumulative miles at each stop (first = 0). */
export function cumulativeMiles(stops: FilmLocation[]): number[] {
  const out = [0];
  for (let i = 1; i < stops.length; i++) out.push(out[i - 1] + milesBetween(stops[i - 1], stops[i]));
  return out;
}

export function totalMiles(stops: FilmLocation[]): number {
  return cumulativeMiles(stops).at(-1) ?? 0;
}

/**
 * Route as one LineString. The map drapes it over the terrain, so it climbs
 * the mountains with no extra vertices needed. Distances are straight-line
 * ("as the crow flies"), not driving distance.
 */
export function routeGeoJSON(stops: FilmLocation[]): FeatureCollection<LineString> {
  if (stops.length < 2) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: stops.map((s) => [s.lng, s.lat]) } }],
  };
}

export function stopsGeoJSON(stops: FilmLocation[]): FeatureCollection<Point, { n: number; id: string }> {
  return {
    type: "FeatureCollection",
    features: stops.map(
      (s, i): Feature<Point, { n: number; id: string }> => ({
        type: "Feature",
        properties: { n: i + 1, id: s.id },
        geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      }),
    ),
  };
}

/**
 * Greedy nearest-neighbour ordering: a quick, decent route. Starts from the
 * first stop (the user's chosen start), or with `fromOutlier` from the stop
 * farthest from the group's centre, so the route sweeps across instead of
 * doubling back.
 */
export function orderByNearest(ids: string[], { fromOutlier = false } = {}): string[] {
  const stops = resolveStops(ids);
  if (stops.length < 3) return stops.map((s) => s.id);
  let startIdx = 0;
  if (fromOutlier) {
    const c = { lat: stops.reduce((a, s) => a + s.lat, 0) / stops.length, lng: stops.reduce((a, s) => a + s.lng, 0) / stops.length };
    const far = (s: FilmLocation) => (s.lat - c.lat) ** 2 + ((s.lng - c.lng) * Math.cos(rad(c.lat))) ** 2;
    startIdx = stops.reduce((best, s, i) => (far(s) > far(stops[best]) ? i : best), 0);
  }
  const rest = stops.filter((_, i) => i !== startIdx);
  const out = [stops[startIdx]];
  while (rest.length) {
    const last = out[out.length - 1];
    let best = 0;
    for (let i = 1; i < rest.length; i++) if (milesBetween(last, rest[i]) < milesBetween(last, rest[best])) best = i;
    out.push(rest.splice(best, 1)[0]);
  }
  return out.map((s) => s.id);
}

/** `?tour=a,b,c` → valid, de-duplicated ids (unknown ids dropped). */
export function parseTourParam(v: string | null): string[] {
  if (!v) return [];
  return [...new Set(v.split(","))].filter((id) => locationById.has(id)).slice(0, MAX_STOPS);
}

export function tourShareUrl(ids: string[], origin: string): string {
  return `${origin}/?tour=${ids.join(",")}`;
}

export const formatMiles = (mi: number) => (mi < 10 ? mi.toFixed(1) : Math.round(mi).toLocaleString("en-US"));
