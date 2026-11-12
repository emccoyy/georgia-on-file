import type { ProductionType } from "@/data/schema";
import type { Quality } from "@/lib/device";

/** Central knobs for the 3D look. Tweak here, not inside layer code. */

export const GEORGIA_BOUNDS: [[number, number], [number, number]] = [
  [-85.61, 30.36],
  [-80.84, 35.0],
];

/** Pin colors by production type (all pass 3:1 non-text contrast on the navy sheet). */
export const TYPE_COLORS: Record<ProductionType, string> = {
  "feature film": "#FF1A3C", // deep neon red
  "TV series": "#00F060", // deep neon green
  "limited series": "#FFE500", // deep neon yellow
  "TV movie": "#B026FF", // deep neon purple
  documentary: "#C4B5FD", // lavender (no documentaries in the data yet)
};

export const ACCENT = "#5CE1FF";

export const TERRAIN_TILES = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
export const TERRAIN_ATTRIBUTION =
  '<a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles</a> (Mapzen, AWS Open Data)';

/**
 * Terrain exaggeration by zoom. Georgia tops out at ~1,450 m (Brasstown Bald),
 * which is nearly invisible at a statewide zoom with true scale, so we
 * exaggerate more when zoomed out and relax toward ~1.5x up close.
 */
export const EXAGGERATION: Record<Quality, [zoom: number, value: number][]> = {
  high: [
    [5, 5],
    [7, 3.8],
    [9, 2.8],
    [12, 1.8],
    [15, 1.5],
  ],
  low: [
    [5, 3.5],
    [7, 2.5],
    [9, 1.8],
    [12, 1.4],
  ],
};

export function exaggerationAt(zoom: number, q: Quality): number {
  const stops = EXAGGERATION[q];
  if (zoom <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    const [z1, v1] = stops[i];
    const [z0, v0] = stops[i - 1];
    if (zoom <= z1) return v0 + ((zoom - z0) / (z1 - z0)) * (v1 - v0);
  }
  return stops[stops.length - 1][1];
}

export const QUALITY_SETTINGS: Record<
  Quality,
  { maxPitch: number; homePitch: number; demTileSize: number; demMaxZoom: number; buildings: boolean; pixelRatioCap: number }
> = {
  high: { maxPitch: 80, homePitch: 64, demTileSize: 256, demMaxZoom: 14, buildings: true, pixelRatioCap: 2 },
  low: { maxPitch: 60, homePitch: 45, demTileSize: 512, demMaxZoom: 12, buildings: false, pixelRatioCap: 1.25 },
};

/**
 * Elevation (m, before exaggeration) assigned to everything outside Georgia.
 * Deeper = taller cliff walls on the raised state.
 */
export const BASE_ELEVATION_M = -3500;

/** Home camera: an angled establishing shot looking slightly NNW across the state. */
export const HOME_BEARING = -12;

/** Pins cluster up to this zoom; light beams fade in just after. */
export const CLUSTER_MAX_ZOOM = 9;
export const BEAM_MIN_ZOOM = 9.5;
