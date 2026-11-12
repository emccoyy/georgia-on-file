import type { FeatureCollection, LineString } from "geojson";

/**
 * Drafting grid: lat/lng lines every `step` degrees across the viewable area.
 * Draped on the terrain, it reads as a perspective grid on the drafting table
 * and across the state. `major` marks every whole degree.
 */
export function graticule(step = 0.25, bounds = [-89.5, 27.5, -77.5, 37.5]): FeatureCollection<LineString, { major: boolean }> {
  const [w, s, e, n] = bounds;
  const features: FeatureCollection<LineString, { major: boolean }>["features"] = [];
  const isMajor = (v: number) => Math.abs(v - Math.round(v)) < 1e-6;
  // Densify meridians so they drape smoothly over terrain instead of cutting through hills.
  for (let x = w; x <= e + 1e-9; x += step) {
    const coords: [number, number][] = [];
    for (let y = s; y <= n + 1e-9; y += 0.1) coords.push([x, y]);
    features.push({ type: "Feature", properties: { major: isMajor(x) }, geometry: { type: "LineString", coordinates: coords } });
  }
  for (let y = s; y <= n + 1e-9; y += step) {
    const coords: [number, number][] = [];
    for (let x = w; x <= e + 1e-9; x += 0.1) coords.push([x, y]);
    features.push({ type: "Feature", properties: { major: isMajor(y) }, geometry: { type: "LineString", coordinates: coords } });
  }
  return { type: "FeatureCollection", features };
}
