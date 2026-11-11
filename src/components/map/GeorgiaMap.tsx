"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, MapGeoJSONFeature, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { buildBaseStyle } from "@/lib/map/style";
import { addOverlays, CLUSTER_LAYER, INTERACTIVE_LAYERS } from "@/lib/map/layers";
import { exaggerationAt, GEORGIA_BOUNDS, HOME_BEARING, QUALITY_SETTINGS } from "@/lib/map/config";
import { detectQuality, prefersReducedMotion, type Quality } from "@/lib/device";
import { locationById, type PinProperties } from "@/data";
import { MapControls } from "./MapControls";
import { PinTooltip, type TooltipState } from "./PinTooltip";

maplibregl.setWorkerUrl("/vendor/maplibre-gl-worker.mjs");

const HOVER_SOURCES = ["pins", "beams-far", "beams-near"];

export default function GeorgiaMap({ onReady }: { onReady?: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const qualityRef = useRef<Quality>("high");
  const hoverId = useRef<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [bearing, setBearing] = useState(HOME_BEARING);
  const [error, setError] = useState<string | null>(null);

  /** Camera that frames the whole state at the device's home pitch. */
  const homeCamera = useCallback((map: MLMap, pitch: number) => {
    const narrow = map.getContainer().clientWidth < 640;
    const cam = map.cameraForBounds(GEORGIA_BOUNDS, {
      padding: narrow ? { top: 90, bottom: 120, left: 16, right: 16 } : { top: 110, bottom: 90, left: 80, right: 80 },
      bearing: HOME_BEARING,
    });
    return {
      center: cam?.center ?? [-83.4, 32.7],
      // cameraForBounds assumes a flat, top-down view; pitched views fit tighter, so nudge in.
      zoom: (cam?.zoom ?? 6.3) + (pitch > 0 ? 0.35 : 0),
      bearing: HOME_BEARING,
      pitch,
    } as const;
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const quality = detectQuality();
    qualityRef.current = quality;
    const q = QUALITY_SETTINGS[quality];

    let map: MLMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: buildBaseStyle(quality),
        center: [-83.4, 32.7],
        zoom: 6,
        maxPitch: q.maxPitch,
        pixelRatio: Math.min(window.devicePixelRatio || 1, q.pixelRatioCap),
        attributionControl: false,
        maxBounds: [
          [-100, 20],
          [-65, 45],
        ],
        minZoom: 4.5,
        fadeDuration: 200,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "WebGL is unavailable on this device.";
      queueMicrotask(() => setError(msg));
      return;
    }
    mapRef.current = map;
    // Top-right keeps attribution clear of the footer disclaimer and legend.
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");
    // Handy for tuning the look from devtools: open with ?debug to get window.__map.
    if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __map: MLMap }).__map = map;
    map.jumpTo(homeCamera(map, q.homePitch));

    // Keep exaggeration tied to zoom so mountains read at statewide scale.
    let raf = 0;
    const syncTerrain = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!map.getTerrain()) return;
        map.setTerrain({ source: "dem", exaggeration: exaggerationAt(map.getZoom(), quality) });
      });
    };

    map.on("load", () => {
      // Start the compact attribution collapsed (the ⓘ button still expands it).
      map.getContainer().querySelector(".maplibregl-ctrl-attrib")?.classList.remove("maplibregl-compact-show");
      map.setTerrain({ source: "dem", exaggeration: exaggerationAt(map.getZoom(), quality) });
      addOverlays(map);
      onReady?.();
    });
    map.on("zoom", syncTerrain);
    map.on("rotate", () => setBearing(map.getBearing()));

    // --- Hover tooltip + highlight ------------------------------------------
    const setHover = (id: string | null) => {
      if (hoverId.current === id) return;
      for (const source of HOVER_SOURCES) {
        if (hoverId.current) map.setFeatureState({ source, id: hoverId.current }, { hover: false });
        if (id) map.setFeatureState({ source, id }, { hover: true });
      }
      hoverId.current = id;
    };
    const interactive = [...INTERACTIVE_LAYERS, CLUSTER_LAYER];
    map.on("mousemove", (e) => {
      const layers = interactive.filter((l) => map.getLayer(l));
      const f = map.queryRenderedFeatures(e.point, { layers })[0] as MapGeoJSONFeature | undefined;
      map.getCanvas().style.cursor = f ? "pointer" : "";
      if (!f || f.layer.id === CLUSTER_LAYER) {
        setHover(null);
        setTooltip(f ? { x: e.point.x, y: e.point.y, cluster: f.properties.point_count as number } : null);
        return;
      }
      const p = f.properties as PinProperties;
      setHover(p.id);
      setTooltip({ x: e.point.x, y: e.point.y, pin: p });
    });
    map.getCanvas().addEventListener("mouseleave", () => {
      setHover(null);
      setTooltip(null);
    });

    // --- Click: expand clusters, fly to pins ---------------------------------
    map.on("click", async (e) => {
      const layers = interactive.filter((l) => map.getLayer(l));
      const f = map.queryRenderedFeatures(e.point, { layers })[0] as MapGeoJSONFeature | undefined;
      if (!f) return;
      const reduce = prefersReducedMotion();
      const center = (f.geometry.type === "Point" ? f.geometry.coordinates : [e.lngLat.lng, e.lngLat.lat]) as [number, number];
      if (f.layer.id === CLUSTER_LAYER) {
        const zoom = await (map.getSource("pins") as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number);
        map.easeTo({ center, zoom: zoom + 0.5, duration: reduce ? 0 : 1200 });
        return;
      }
      // Beams are polygons, so use the pin's own coordinates rather than the click point.
      const loc = locationById.get((f.properties as PinProperties).id);
      const pinCenter: [number, number] = loc ? [loc.lng, loc.lat] : center;
      // Phase 2 replaces this with the full cinematic move + location panel.
      const cam = { center: pinCenter, zoom: 14.5, pitch: Math.min(68, map.getMaxPitch()), bearing: map.getBearing() + 25 };
      if (reduce) map.jumpTo(cam);
      else map.flyTo({ ...cam, duration: 3200, curve: 1.6, essential: false });
    });

    return () => {
      cancelAnimationFrame(raf);
      map.remove();
      mapRef.current = null;
    };
  }, [homeCamera, onReady]);

  // --- Control handlers ------------------------------------------------------
  const duration = () => (prefersReducedMotion() ? 0 : 1600);

  const resetView = () => {
    const map = mapRef.current;
    if (!map) return;
    const pitch = is3D ? QUALITY_SETTINGS[qualityRef.current].homePitch : 0;
    map.easeTo({ ...homeCamera(map, pitch), bearing: is3D ? HOME_BEARING : 0, duration: duration() * 1.4 });
  };

  const toggle3D = () => {
    const map = mapRef.current;
    if (!map) return;
    const q = QUALITY_SETTINGS[qualityRef.current];
    if (is3D) {
      map.easeTo({ pitch: 0, bearing: 0, duration: duration() });
      map.once("moveend", () => {
        map.setTerrain(null);
        map.setMaxPitch(0);
      });
    } else {
      map.setMaxPitch(q.maxPitch);
      map.setTerrain({ source: "dem", exaggeration: exaggerationAt(map.getZoom(), qualityRef.current) });
      map.easeTo({ pitch: q.homePitch, bearing: HOME_BEARING, duration: duration() });
    }
    setIs3D(!is3D);
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-paper/70">
        <p>
          The 3D map couldn’t start on this device ({error}). Try a recent version of Chrome, Safari, Firefox or Edge with
          hardware acceleration turned on.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
        role="region"
        aria-label="3D map of filming locations in Georgia. Use arrow keys to pan, plus and minus to zoom, shift plus arrows to rotate and tilt."
      />
      <PinTooltip state={tooltip} />
      <MapControls
        is3D={is3D}
        bearing={bearing}
        onZoomIn={() => mapRef.current?.zoomIn({ duration: duration() / 3 })}
        onZoomOut={() => mapRef.current?.zoomOut({ duration: duration() / 3 })}
        onResetNorth={() => mapRef.current?.easeTo({ bearing: 0, duration: duration() / 2 })}
        onReset={resetView}
        onToggle3D={toggle3D}
      />
    </div>
  );
}
