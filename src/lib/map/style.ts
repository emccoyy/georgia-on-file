import type { ExpressionSpecification, LayerSpecification, Map as MLMap, StyleSpecification } from "maplibre-gl";
import georgiaClip from "@/data/geo/georgia-clip.json";
import { QUALITY_SETTINGS, TERRAIN_ATTRIBUTION } from "./config";
import { CLIPPED_DEM_TILES } from "./clippedDem";
import { contourTiles } from "./contours";
import { BP } from "./theme";
import type { Quality } from "@/lib/device";

/**
 * Blueprint base style on OpenFreeMap vector tiles (OpenMapTiles schema):
 * navy "paper", cyan/white line work, topographic contours, translucent
 * buildings. Overlays (mask, slab walls, grid, rim, pins) are added at runtime
 * in layers.ts.
 */
export function buildBaseStyle(quality: Quality): StyleSpecification {
  const q = QUALITY_SETTINGS[quality];
  const font = ["Noto Sans Regular"];
  // Labels only for places inside Georgia: the rest of the map is a void.
  const inGeorgia = ["within", georgiaClip] as unknown as ExpressionSpecification;
  const name: ExpressionSpecification = ["coalesce", ["get", "name:en"], ["get", "name"]];

  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      omt: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        attribution:
          '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      },
      // Separate DEM sources for terrain mesh vs. shading is MapLibre's recommended setup.
      dem: {
        type: "raster-dem",
        tiles: [CLIPPED_DEM_TILES],
        encoding: "terrarium",
        tileSize: q.demTileSize,
        maxzoom: q.demMaxZoom,
        attribution: TERRAIN_ATTRIBUTION,
      },
      demShade: {
        type: "raster-dem",
        tiles: [CLIPPED_DEM_TILES],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: quality === "high" ? 13 : 11,
      },
    },
    sky: {
      "sky-color": BP.sky,
      "horizon-color": BP.horizon,
      "fog-color": BP.floor,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.7,
      "fog-ground-blend": 0.6,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 1, 12, 0],
    },
    light: { anchor: "map", position: [1.4, 215, 35], color: "#d6f0ff", intensity: 0.3 },
    layers: [
      { id: "background", type: "background", paint: { "background-color": BP.paper } },

      // Altitude tint: the sheet brightens slightly toward the ridgelines.
      {
        id: "relief",
        type: "color-relief",
        source: "demShade",
        paint: {
          "color-relief-opacity": 1,
          "color-relief-color": [
            "interpolate",
            ["linear"],
            ["elevation"],
            0, BP.paper,
            300, "#0d3156",
            700, "#12406c",
            1100, "#185083",
            1600, "#1f6299",
          ],
        },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "demShade",
        paint: {
          "hillshade-method": "standard",
          "hillshade-exaggeration": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 10, 0.5, 14, 0.35],
          "hillshade-shadow-color": "#020b16",
          "hillshade-highlight-color": "#4f9ccf",
          "hillshade-accent-color": "#071d36",
          "hillshade-illumination-direction": 315,
          "hillshade-illumination-anchor": "map",
        },
      },
      {
        id: "landuse-urban",
        type: "fill",
        source: "omt",
        "source-layer": "landuse",
        filter: ["match", ["get", "class"], ["residential", "commercial", "industrial", "retail"], true, false],
        paint: { "fill-color": "#103a63", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.5, 13, 0.25] },
      },
      // Water as drafted outlines over a darker fill.
      { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": BP.water } },
      {
        id: "water-outline",
        type: "line",
        source: "omt",
        "source-layer": "water",
        paint: { "line-color": BP.line, "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 14, 1.2], "line-opacity": 0.55 },
      },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        filter: ["==", ["get", "class"], "river"],
        paint: { "line-color": BP.line, "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.4, 14, 2], "line-opacity": 0.45 },
      },
      {
        id: "roads-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["match", ["get", "class"], ["minor", "service", "tertiary"], true, false],
        paint: {
          "line-color": BP.lineFaint,
          "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0.3, 17, 2.5],
          "line-opacity": 0.6,
        },
      },
      {
        id: "roads-major",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 6,
        filter: ["match", ["get", "class"], ["motorway", "trunk", "primary", "secondary"], true, false],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": ["match", ["get", "class"], ["motorway", "trunk"], BP.lineBright, BP.line],
          "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 6, 0.35, 10, 0.8, 16, 3.5],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.3, 10, 0.55],
        },
      },
      // Building footprints drawn as outlines, then extruded as translucent volumes.
      {
        id: "building-outline",
        type: "line",
        source: "omt",
        "source-layer": "building",
        minzoom: 14,
        paint: { "line-color": BP.lineBright, "line-width": 0.6, "line-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15, 0.55] },
      },
      ...(q.buildings
        ? ([
            {
              id: "buildings-3d",
              type: "fill-extrusion",
              source: "omt",
              "source-layer": "building",
              minzoom: 14.5,
              paint: {
                "fill-extrusion-color": [
                  "interpolate",
                  ["linear"],
                  ["coalesce", ["get", "render_height"], 6],
                  0, "#2a6fa6",
                  80, "#4c9ad3",
                  200, "#8fd0f5",
                ],
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.45],
                "fill-extrusion-vertical-gradient": true,
              },
            },
          ] satisfies StyleSpecification["layers"])
        : []),

      {
        id: "place-town",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 9.5,
        filter: ["all", ["match", ["get", "class"], ["town", "village"], true, false], inGeorgia],
        layout: {
          "text-field": name,
          "text-font": font,
          "text-size": ["interpolate", ["linear"], ["zoom"], 9, 10, 13, 12],
          "text-letter-spacing": 0.12,
          "text-transform": "uppercase",
        },
        paint: { "text-color": BP.line, "text-halo-color": BP.paper, "text-halo-width": 1.2 },
      },
      {
        id: "place-city",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 5,
        filter: ["all", ["==", ["get", "class"], "city"], inGeorgia],
        layout: {
          "text-field": name,
          "text-font": font,
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 10, 14],
          "text-letter-spacing": 0.25,
          "text-transform": "uppercase",
        },
        paint: { "text-color": BP.ink, "text-halo-color": BP.paper, "text-halo-width": 1.4 },
      },
    ],
  };
}

/**
 * Topographic contours: minor lines faint, index (major) lines brighter with
 * labels. Added once the map first goes idle, so their generation (in a worker)
 * and tile parsing don't compete with the first render.
 */
export function addContours(map: MLMap, quality: Quality) {
  if (map.getSource("contours")) return;
  const font = ["Noto Sans Regular"];
  const inGeorgia = ["within", georgiaClip] as unknown as ExpressionSpecification;
  map.addSource("contours", { type: "vector", tiles: [contourTiles(quality)], maxzoom: 15 });
  const layers: LayerSpecification[] = [
    {
      id: "contour-minor",
      type: "line",
      source: "contours",
      "source-layer": "contours",
      filter: ["==", ["get", "level"], 0],
      paint: { "line-color": BP.line, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.4, 12, 0.7], "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.18, 10, 0.38] },
    },
    {
      id: "contour-major",
      type: "line",
      source: "contours",
      "source-layer": "contours",
      filter: [">", ["get", "level"], 0],
      paint: { "line-color": BP.lineBright, "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 12, 1.3], "line-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.35, 10, 0.7] },
    },
    {
      id: "contour-label",
      type: "symbol",
      source: "contours",
      "source-layer": "contours",
      minzoom: 9,
      filter: ["all", [">", ["get", "level"], 0], inGeorgia],
      layout: {
        "symbol-placement": "line",
        "text-field": ["concat", ["number-format", ["get", "ele"], {}], " m"],
        "text-font": font,
        "text-size": 9,
        "text-letter-spacing": 0.1,
      },
      paint: { "text-color": BP.line, "text-halo-color": BP.paper, "text-halo-width": 1.2 },
    },
  ];
  // Beneath the place labels, above the base map.
  for (const layer of layers) map.addLayer(layer, map.getLayer("place-town") ? "place-town" : undefined);
}
