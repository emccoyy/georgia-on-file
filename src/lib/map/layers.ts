import type { Map as MLMap, ExpressionSpecification, StyleSpecification } from "maplibre-gl";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import georgiaClip from "@/data/geo/georgia-clip.json";
import georgiaMask from "@/data/geo/georgia-mask.json";
import { locationsToBeams, locationsToPoints } from "@/data";
import type { FilmLocation } from "@/data/schema";
import { ACCENT, BASE_ELEVATION_M, BEAM_MIN_ZOOM, CLUSTER_MAX_ZOOM, TYPE_COLORS } from "./config";
import { graticule } from "./graticule";
import { BP } from "./theme";

/** Layer ids that respond to hover/click. */
export const INTERACTIVE_LAYERS = ["pin-core", "pin-halo", "beam-near-core", "beam-far-core"] as const;
export const CLUSTER_LAYER = "cluster-core";

const typeColor: ExpressionSpecification = [
  "match",
  ["get", "ptype"],
  ...Object.entries(TYPE_COLORS).flat(),
  ACCENT,
] as unknown as ExpressionSpecification;

/** Hovered or selected pins get the "on" value. */
const hovered = (on: unknown, off: unknown) =>
  [
    "case",
    ["any", ["boolean", ["feature-state", "hover"], false], ["boolean", ["feature-state", "selected"], false]],
    on,
    off,
  ] as ExpressionSpecification;
/** 0→1 per pin, driven by PinFader so filtering animates instead of snapping. */
const fade = ["coalesce", ["feature-state", "fade"], 1] as ExpressionSpecification;
const faded = (v: unknown) => ["*", fade, v] as ExpressionSpecification;

/** Source ids that hold one feature per location (feature id = location id). */
export const PIN_SOURCES = ["pins", "beams-far", "beams-near"] as const;
export const BEAM_RADII = { "beams-far": 110, "beams-near": 5 } as const;

/**
 * Overlay GeoJSON sources. These go into the initial style, ahead of the base
 * map, so the slab mask, rim and pins are tiled first instead of queueing
 * behind hundreds of base-map tiles.
 */
export function overlaySources(initial: FilmLocation[]): StyleSpecification["sources"] {
  return {
    "ga-mask": { type: "geojson", data: georgiaMask as unknown as FeatureCollection<Polygon> },
    // The glow traces the clip edge, i.e. the rim of the raised slab.
    ga: { type: "geojson", data: georgiaClip as unknown as FeatureCollection<MultiPolygon> },
    pins: {
      type: "geojson",
      data: locationsToPoints(initial),
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: 46,
      promoteId: "id",
    },
    // Beams use two footprints: fat at mid zoom so they read, thin up close so they don't block the view.
    "beams-far": { type: "geojson", data: locationsToBeams(BEAM_RADII["beams-far"], initial), promoteId: "id" },
    "beams-near": { type: "geojson", data: locationsToBeams(BEAM_RADII["beams-near"], initial), promoteId: "id" },
  };
}

/** Adds overlay layers (their sources come from overlaySources in the style). */
export function addOverlays(map: MLMap) {
  // --- Georgia only: hide everything outside, glow along the rim -----------
  map.addLayer({
    id: "ga-mask",
    type: "fill",
    source: "ga-mask",
    // Fully opaque: everything outside Georgia disappears into the void floor.
    paint: { "fill-color": BP.floor, "fill-opacity": 1 },
  });
  // Cliff walls: only elevations between the void floor and just below sea level
  // exist on the walls, so a color ramp over that band paints them (deep navy
  // at the base → cyan at the rim) and leaves land, sea and floor untouched.
  const B = BASE_ELEVATION_M;
  map.addLayer({
    id: "ga-walls",
    type: "color-relief",
    source: "demShade",
    paint: {
      "color-relief-opacity": 1,
      "color-relief-color": [
        "interpolate",
        ["linear"],
        ["elevation"],
        B, "rgba(0,0,0,0)",
        B + 15, "#061a30",
        B * 0.55, "#0c3358",
        B * 0.2, "#1d6a9e",
        -260, "#6fd3f5",
        -250, "rgba(0,0,0,0)",
      ],
    },
  });
  // Drafting grid: 0.25° minor / 1° major, draped over floor and state alike.
  map.addSource("grid", { type: "geojson", data: graticule() });
  map.addLayer({
    id: "grid",
    type: "line",
    source: "grid",
    paint: {
      "line-color": BP.line,
      "line-width": ["case", ["get", "major"], 0.9, 0.5],
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, ["case", ["get", "major"], 0.22, 0.05], 8, ["case", ["get", "major"], 0.22, 0.1]],
    },
  });
  map.addLayer({
    id: "ga-tint",
    type: "fill",
    source: "ga",
    paint: { "fill-color": ACCENT, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.035, 9, 0.0] },
  });
  // Three stacked lines = soft bloom + mid glow + hot core.
  map.addLayer({
    id: "ga-glow-wide",
    type: "line",
    source: "ga",
    layout: { "line-join": "round" },
    paint: {
      "line-color": ACCENT,
      "line-width": ["interpolate", ["linear"], ["zoom"], 5, 14, 10, 34],
      "line-blur": ["interpolate", ["linear"], ["zoom"], 5, 12, 10, 28],
      "line-opacity": 0.18,
    },
  });
  map.addLayer({
    id: "ga-glow-mid",
    type: "line",
    source: "ga",
    layout: { "line-join": "round" },
    paint: { "line-color": BP.cyan, "line-width": 3, "line-blur": 2.5, "line-opacity": 0.6 },
  });
  map.addLayer({
    id: "ga-glow-core",
    type: "line",
    source: "ga",
    layout: { "line-join": "round" },
    paint: { "line-color": BP.ink, "line-width": 1.1, "line-opacity": 0.95 },
  });

  // --- Pins -------------------------------------------------------------------

  // Clusters
  map.addLayer({
    id: "cluster-halo",
    type: "circle",
    source: "pins",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": ACCENT,
      "circle-radius": ["step", ["get", "point_count"], 22, 4, 28, 10, 36],
      "circle-blur": 1,
      "circle-opacity": 0.22,
      "circle-pitch-alignment": "map",
    },
  });
  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: "pins",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": BP.floor,
      "circle-opacity": 0.85,
      "circle-radius": ["step", ["get", "point_count"], 12, 4, 15, 10, 19],
      "circle-stroke-color": ACCENT,
      "circle-stroke-width": 1.2,
      "circle-pitch-alignment": "map",
    },
  });
  map.addLayer({
    id: "cluster-count",
    type: "symbol",
    source: "pins",
    filter: ["has", "point_count"],
    layout: {
      "text-field": ["get", "point_count_abbreviated"],
      "text-font": ["Noto Sans Regular"],
      "text-size": 12,
      "text-allow-overlap": true,
      "text-pitch-alignment": "viewport",
    },
    paint: { "text-color": BP.ink },
  });

  // Individual pins: ground glow + bright core
  map.addLayer({
    id: "pin-halo",
    type: "circle",
    source: "pins",
    filter: ["!", ["has", "point_count"]],
    paint: {
      // Hollow survey-marker ring around each location.
      "circle-color": typeColor,
      "circle-opacity": faded(hovered(0.18, 0.06)),
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, faded(hovered(12, 8)), 14, faded(hovered(20, 14))],
      "circle-stroke-color": typeColor,
      "circle-stroke-width": hovered(1.6, 1),
      "circle-stroke-opacity": faded(0.85),
      "circle-pitch-alignment": "map",
    },
  });

  // Beams rise out of the ground as `fade` goes 0→1 (opacity can't vary per feature on extrusions).
  const beamHeight: ExpressionSpecification = [
    "interpolate",
    ["linear"],
    ["zoom"],
    BEAM_MIN_ZOOM, faded(9000),
    12, faded(3200),
    15, faded(700),
    18, faded(220),
  ];
  for (const [range, src, minzoom, maxzoom] of [
    ["far", "beams-far", BEAM_MIN_ZOOM, 13],
    ["near", "beams-near", 12, 24],
  ] as const) {
    const fadeIn = range === "far" ? [BEAM_MIN_ZOOM, 0, BEAM_MIN_ZOOM + 0.8, 1, 12, 1, 13, 0] : [12, 0, 13, 1];
    const zoomFade = (max: number) =>
      [
        "interpolate",
        ["linear"],
        ["zoom"],
        ...fadeIn.map((v, i) => (i % 2 === 1 ? v * max : v)),
      ] as unknown as ExpressionSpecification;
    map.addLayer({
      id: `beam-${range}-core`,
      type: "fill-extrusion",
      source: src,
      minzoom,
      maxzoom,
      paint: {
        "fill-extrusion-color": hovered(BP.ink, typeColor),
        "fill-extrusion-height": beamHeight,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": zoomFade(range === "far" ? 0.95 : 0.85),
        "fill-extrusion-vertical-gradient": false,
      },
    });
  }

  map.addLayer({
    id: "pin-core",
    type: "circle",
    source: "pins",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": typeColor,
      "circle-opacity": fade,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, faded(hovered(3.5, 2)), 14, faded(hovered(5, 3.5))],
      "circle-stroke-color": BP.ink,
      "circle-stroke-width": hovered(1.2, 0),
      "circle-stroke-opacity": fade,
      "circle-pitch-alignment": "map",
    },
  });
}
