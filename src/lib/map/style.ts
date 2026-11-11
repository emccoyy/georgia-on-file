import type { StyleSpecification } from "maplibre-gl";
import { QUALITY_SETTINGS, TERRAIN_ATTRIBUTION, TERRAIN_TILES } from "./config";
import type { Quality } from "@/lib/device";

/**
 * Custom dark "establishing shot" base style on OpenFreeMap vector tiles
 * (OpenMapTiles schema). Overlay layers (mask, Georgia glow, pins) are added
 * at runtime in layers.ts so they can reference app data.
 */
export function buildBaseStyle(quality: Quality): StyleSpecification {
  const q = QUALITY_SETTINGS[quality];
  const font = ["Noto Sans Regular"];

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
        tiles: [TERRAIN_TILES],
        encoding: "terrarium",
        tileSize: q.demTileSize,
        maxzoom: q.demMaxZoom,
        attribution: TERRAIN_ATTRIBUTION,
      },
      demShade: {
        type: "raster-dem",
        tiles: [TERRAIN_TILES],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: quality === "high" ? 13 : 11,
      },
    },
    sky: {
      "sky-color": "#06070b",
      "horizon-color": "#3a2410",
      "fog-color": "#0c0a09",
      "sky-horizon-blend": 0.55,
      "horizon-fog-blend": 0.65,
      "fog-ground-blend": 0.55,
      "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 9, 1, 12, 0],
    },
    // Warm low-angle "key light" for building extrusions and beams.
    light: { anchor: "map", position: [1.4, 215, 35], color: "#ffd8a3", intensity: 0.35 },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#0a0a0b" } },

      // Elevation tint: near-black lowlands warming to umber on the ridgelines.
      {
        id: "relief",
        type: "color-relief",
        source: "demShade",
        paint: {
          "color-relief-opacity": 0.9,
          "color-relief-color": [
            "interpolate",
            ["linear"],
            ["elevation"],
            0, "#0a0a0b",
            100, "#0d0c0b",
            250, "#14110e",
            450, "#211a13",
            700, "#33271a",
            1000, "#4d3922",
            1300, "#6b4f2e",
            1700, "#8a683c",
          ],
        },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "demShade",
        paint: {
          "hillshade-method": "standard",
          "hillshade-exaggeration": ["interpolate", ["linear"], ["zoom"], 5, 1, 9, 0.8, 14, 0.5],
          "hillshade-shadow-color": "#000000",
          "hillshade-highlight-color": "#9c7a4e",
          "hillshade-accent-color": "#24180c",
          "hillshade-illumination-direction": 315,
          "hillshade-illumination-anchor": "map",
        },
      },
      {
        id: "landcover-wood",
        type: "fill",
        source: "omt",
        "source-layer": "landcover",
        filter: ["==", ["get", "class"], "wood"],
        paint: { "fill-color": "#101511", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.15, 12, 0.35] },
      },
      {
        id: "park",
        type: "fill",
        source: "omt",
        "source-layer": "park",
        paint: { "fill-color": "#111a13", "fill-opacity": 0.45 },
      },
      {
        id: "landuse-urban",
        type: "fill",
        source: "omt",
        "source-layer": "landuse",
        filter: ["match", ["get", "class"], ["residential", "commercial", "industrial", "retail"], true, false],
        paint: { "fill-color": "#16130f", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.6, 13, 0.3] },
      },
      {
        id: "water",
        type: "fill",
        source: "omt",
        "source-layer": "water",
        paint: { "fill-color": "#060b12", "fill-antialias": true },
      },
      {
        id: "waterway",
        type: "line",
        source: "omt",
        "source-layer": "waterway",
        filter: ["==", ["get", "class"], "river"],
        paint: { "line-color": "#0d1724", "line-width": ["interpolate", ["linear"], ["zoom"], 7, 0.6, 14, 3] },
      },
      {
        id: "roads-minor",
        type: "line",
        source: "omt",
        "source-layer": "transportation",
        minzoom: 12,
        filter: ["match", ["get", "class"], ["minor", "service", "tertiary"], true, false],
        paint: {
          "line-color": "#2a2520",
          "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 12, 0.4, 17, 4],
          "line-opacity": 0.8,
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
          "line-color": ["match", ["get", "class"], ["motorway", "trunk"], "#5a4428", "#3a3128"],
          "line-width": ["interpolate", ["exponential", 1.5], ["zoom"], 6, 0.4, 10, 1.1, 16, 6],
          "line-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0.45, 10, 0.75],
        },
      },
      {
        id: "state-lines",
        type: "line",
        source: "omt",
        "source-layer": "boundary",
        filter: ["all", ["==", ["get", "admin_level"], 4], ["!=", ["get", "maritime"], 1]],
        paint: { "line-color": "#5b544c", "line-width": 0.8, "line-dasharray": [3, 2], "line-opacity": 0.6 },
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
                  0, "#17140f",
                  50, "#221c15",
                  150, "#33291d",
                ],
                "fill-extrusion-height": ["coalesce", ["get", "render_height"], 6],
                "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
                "fill-extrusion-opacity": ["interpolate", ["linear"], ["zoom"], 14.5, 0, 15.5, 0.92],
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
        filter: ["match", ["get", "class"], ["town", "village"], true, false],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": font,
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 13, 13],
          "text-letter-spacing": 0.08,
          "text-transform": "uppercase",
        },
        paint: { "text-color": "#8d8478", "text-halo-color": "#0a0a0b", "text-halo-width": 1.2 },
      },
      {
        id: "place-city",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        minzoom: 5,
        filter: ["==", ["get", "class"], "city"],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": font,
          "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 10, 15],
          "text-letter-spacing": 0.18,
          "text-transform": "uppercase",
        },
        paint: { "text-color": "#b3a998", "text-halo-color": "#0a0a0b", "text-halo-width": 1.4 },
      },
      {
        id: "place-state",
        type: "symbol",
        source: "omt",
        "source-layer": "place",
        maxzoom: 7,
        filter: ["==", ["get", "class"], "state"],
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": font,
          "text-size": 11,
          "text-letter-spacing": 0.4,
          "text-transform": "uppercase",
        },
        paint: { "text-color": "#6f675d", "text-halo-color": "#0a0a0b", "text-halo-width": 1 },
      },
    ],
  };
}
