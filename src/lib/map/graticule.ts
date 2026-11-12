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
  // Two points per line is enough: line layers are draped onto the terrain
  // texture, so they follow hills without densifying.
  for (let x = w; x <= e + 1e-9; x += step) {
    features.push({ type: "Feature", properties: { major: isMajor(x) }, geometry: { type: "LineString", coordinates: [[x, s], [x, n]] } });
  }
  for (let y = s; y <= n + 1e-9; y += step) {
    features.push({ type: "Feature", properties: { major: isMajor(y) }, geometry: { type: "LineString", coordinates: [[w, y], [e, y]] } });
  }
  return { type: "FeatureCollection", features };
}
