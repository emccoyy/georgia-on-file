import type { Map as MLMap, ExpressionSpecification } from "maplibre-gl";
import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import georgia from "@/data/geo/georgia.json";
import georgiaMask from "@/data/geo/georgia-mask.json";
import { locationsToBeams, locationsToPoints } from "@/data";
import { ACCENT, BEAM_MIN_ZOOM, CLUSTER_MAX_ZOOM, TYPE_COLORS } from "./config";

/** Layer ids that respond to hover/click. */
export const INTERACTIVE_LAYERS = ["pin-core", "pin-halo", "beam-near-core", "beam-far-core"] as const;
export const CLUSTER_LAYER = "cluster-core";

const typeColor: ExpressionSpecification = [
  "match",
  ["get", "ptype"],
  ...Object.entries(TYPE_COLORS).flat(),
  ACCENT,
] as unknown as ExpressionSpecification;

const hovered = (on: unknown, off: unknown) =>
  ["case", ["boolean", ["feature-state", "hover"], false], on, off] as ExpressionSpecification;

export function addOverlays(map: MLMap) {
  // --- Georgia focus: dim everything outside, glow along the border ---------
  map.addSource("ga-mask", { type: "geojson", data: georgiaMask as unknown as FeatureCollection<Polygon> });
  map.addSource("ga", { type: "geojson", data: georgia as unknown as FeatureCollection<MultiPolygon> });

  map.addLayer({
    id: "ga-mask",
    type: "fill",
    source: "ga-mask",
    paint: { "fill-color": "#030304", "fill-opacity": 0.62 },
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
      "line-opacity": 0.22,
    },
  });
  map.addLayer({
    id: "ga-glow-mid",
    type: "line",
    source: "ga",
    layout: { "line-join": "round" },
    paint: { "line-color": "#ffb547", "line-width": 4, "line-blur": 3, "line-opacity": 0.55 },
  });
  map.addLayer({
    id: "ga-glow-core",
    type: "line",
    source: "ga",
    layout: { "line-join": "round" },
    paint: { "line-color": "#ffe2a8", "line-width": 1.1, "line-opacity": 0.95 },
  });

  // --- Pins -------------------------------------------------------------------
  map.addSource("pins", {
    type: "geojson",
    data: locationsToPoints(),
    cluster: true,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterRadius: 46,
    promoteId: "id",
  });
  // Beams use two footprints: fat at mid zoom so they read, thin up close so they don't block the view.
  map.addSource("beams-far", { type: "geojson", data: locationsToBeams(110), promoteId: "id" });
  map.addSource("beams-near", { type: "geojson", data: locationsToBeams(5), promoteId: "id" });

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
      "circle-opacity": 0.35,
      "circle-pitch-alignment": "map",
    },
  });
  map.addLayer({
    id: CLUSTER_LAYER,
    type: "circle",
    source: "pins",
    filter: ["has", "point_count"],
    paint: {
      "circle-color": "#120d07",
      "circle-radius": ["step", ["get", "point_count"], 12, 4, 15, 10, 19],
      "circle-stroke-color": ACCENT,
      "circle-stroke-width": 1.5,
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
    paint: { "text-color": "#ffe2a8" },
  });

  // Individual pins: ground glow + bright core
  map.addLayer({
    id: "pin-halo",
    type: "circle",
    source: "pins",
    filter: ["!", ["has", "point_count"]],
    paint: {
      "circle-color": typeColor,
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, hovered(20, 12), 14, hovered(30, 22)],
      "circle-blur": 1,
      "circle-opacity": hovered(0.7, 0.4),
      "circle-pitch-alignment": "map",
    },
  });

  const beamHeight: ExpressionSpecification = [
    "interpolate",
    ["linear"],
    ["zoom"],
    BEAM_MIN_ZOOM, 9000,
    12, 3200,
    15, 700,
    18, 220,
  ];
  for (const [range, src, minzoom, maxzoom] of [
    ["far", "beams-far", BEAM_MIN_ZOOM, 13],
    ["near", "beams-near", 12, 24],
  ] as const) {
    const fadeIn = range === "far" ? [BEAM_MIN_ZOOM, 0, BEAM_MIN_ZOOM + 0.8, 1, 12, 1, 13, 0] : [12, 0, 13, 1];
    const fade = (max: number) =>
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
        "fill-extrusion-color": hovered("#fff4dc", typeColor),
        "fill-extrusion-height": beamHeight,
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": fade(range === "far" ? 0.8 : 0.55),
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
      "circle-color": "#fff4dc",
      "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, hovered(5, 3), 14, hovered(7, 5)],
      "circle-stroke-color": typeColor,
      "circle-stroke-width": 2,
      "circle-pitch-alignment": "map",
    },
  });
}
