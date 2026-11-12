import type { Map as MLMap, PaddingOptions } from "maplibre-gl";
import type { FilmLocation } from "@/data/schema";
import type { Quality } from "@/lib/device";
import { QUALITY_SETTINGS } from "./config";

/** How close to get for each kind of place: wide for landscapes, tight for buildings. */
function zoomFor(l: FilmLocation, quality: Quality) {
  const wide = ["park", "natural area", "beach", "waterfront", "campus", "attraction", "cemetery", "historic site"];
  const z = wide.includes(l.type) ? 14.2 : l.type === "street" ? 15.2 : 15.8;
  return quality === "low" ? Math.min(z, 14.5) : z;
}

/** Panel-aware padding so the target lands in the visible part of the map. */
export function selectionPadding(map: MLMap): PaddingOptions {
  const { clientWidth: w, clientHeight: h } = map.getContainer();
  return w >= 768 ? { top: 0, bottom: 0, left: 0, right: Math.min(440, w * 0.4) } : { top: 0, left: 0, right: 0, bottom: h * 0.45 };
}

const NO_PADDING: PaddingOptions = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Cinematic establishing-shot move: arc in to the location, swing the camera
 * round ~35°, settle at a low angle, then drift a few more degrees like a slow
 * dolly. Any user input cancels the drift (MapLibre stops animations on
 * interaction). Reduced motion: an instant cut.
 */
export function flyToLocation(map: MLMap, l: FilmLocation, opts: { quality: Quality; reduce: boolean; padding?: PaddingOptions }) {
  const q = QUALITY_SETTINGS[opts.quality];
  const target = {
    center: [l.lng, l.lat] as [number, number],
    zoom: zoomFor(l, opts.quality),
    pitch: Math.min(q.maxPitch, opts.quality === "high" ? 70 : 55),
    bearing: map.getBearing() + 35,
    padding: opts.padding ?? selectionPadding(map),
  };
  map.stop();
  if (opts.reduce) {
    map.jumpTo(target);
    return;
  }
  const token = ++flightToken;
  let interrupted = false;
  const canvas = map.getCanvasContainer();
  const onUser = () => (interrupted = true);
  canvas.addEventListener("pointerdown", onUser, { once: true });
  canvas.addEventListener("wheel", onUser, { once: true, passive: true });
  map.flyTo({ ...target, duration: 3600, curve: 1.6, essential: false });
  // Drift only if the fly-in finished on its own: no user input, no newer flight.
  map.once("moveend", () => {
    canvas.removeEventListener("pointerdown", onUser);
    canvas.removeEventListener("wheel", onUser);
    if (interrupted || token !== flightToken) return;
    map.easeTo({ bearing: target.bearing + 10, duration: 9000, easing: (t) => t });
  });
}

let flightToken = 0;

/** Ease the padding back to zero when the panel closes, keeping the view otherwise. */
export function clearSelectionPadding(map: MLMap, reduce: boolean) {
  map.easeTo({ padding: NO_PADDING, duration: reduce ? 0 : 700 });
}
