import mlcontour from "maplibre-contour";
import * as maplibregl from "maplibre-gl";
import { TERRAIN_TILES } from "./config";
import type { Quality } from "@/lib/device";

/**
 * Topographic contour lines generated on the fly from the same Terrarium DEM
 * (maplibre-contour, computed in a web worker). Uses the raw DEM, not the
 * clipped one, so there are no contours on the cliff walls; anything outside
 * Georgia is hidden by the mask layer.
 */
let demSource: InstanceType<typeof mlcontour.DemSource> | null = null;

function source() {
  if (!demSource) {
    demSource = new mlcontour.DemSource({
      url: TERRAIN_TILES,
      encoding: "terrarium",
      maxzoom: 13,
      worker: true,
      cacheSize: 100,
    });
    demSource.setupMaplibre(maplibregl);
  }
  return demSource;
}

/** zoom → [minor, major] interval in meters. Georgia spans ~0–1,450 m. */
const THRESHOLDS: Record<Quality, Record<number, [number, number]>> = {
  high: { 5: [100, 500], 8: [50, 250], 10: [20, 100], 12: [10, 50], 14: [5, 25] },
  low: { 6: [200, 1000], 9: [100, 500], 11: [50, 250], 13: [20, 100] },
};

export function contourTiles(quality: Quality): string {
  return source().contourProtocolUrl({
    thresholds: THRESHOLDS[quality],
    contourLayer: "contours",
    elevationKey: "ele",
    levelKey: "level",
    extent: 4096,
    buffer: 1,
  });
}
