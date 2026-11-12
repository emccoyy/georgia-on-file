"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, MapGeoJSONFeature, GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { addContours, buildBaseStyle } from "@/lib/map/style";
import { addOverlays, CLUSTER_LAYER, INTERACTIVE_LAYERS, overlaySources, PIN_SOURCES, routeGradient } from "@/lib/map/layers";
import { cumulativeMiles, resolveStops, routeGeoJSON, stopsGeoJSON } from "@/lib/tour";
import { registerClippedDem } from "@/lib/map/clippedDem";
import { PinFader } from "@/lib/map/pinFader";
import { clearSelectionPadding, FLY_IN_START, flyToLocation, startIdleDrift } from "@/lib/map/camera";
import { exaggerationAt, GEORGIA_BOUNDS, HOME_BEARING, QUALITY_SETTINGS } from "@/lib/map/config";
import { detectQuality, prefersReducedMotion, type Quality } from "@/lib/device";
import { locationById, locations as allLocations, type PinProperties } from "@/data";
import type { FilmLocation } from "@/data/schema";
import { MapControls } from "./MapControls";
import { PinTooltip, type TooltipState } from "./PinTooltip";
import { MapReadout } from "./MapReadout";

// Versioned so the long-lived cache (see next.config headers) busts on upgrades.
maplibregl.setWorkerUrl(`/vendor/maplibre-gl-worker.mjs?v=${maplibregl.getVersion()}`);
registerClippedDem();

type Props = {
  /** "explore" = full-screen home map; "mini" = embedded map on production pages. */
  mode?: "explore" | "mini";
  /** Locations this map may ever show (mini maps pass a production's locations). */
  locationIds?: string[];
  /** Currently visible subset (filters/search). Changes animate. */
  visibleIds?: Set<string>;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Film tour stops in order; drawn as a route with numbered stops. */
  tourIds?: string[];
  /** Index of the current stop while a tour plays (route is brighter up to here). */
  tourStep?: number | null;
  onReady?: () => void;
  /**
   * Landing choreography: "pending" holds the camera high above the Southeast
   * (title card showing), "play" runs the fly-in, "done" starts at the home view.
   */
  intro?: "pending" | "play" | "done";
};

const resolve = (ids: string[]) => ids.map((id) => locationById.get(id)).filter((l): l is FilmLocation => !!l);

export default function GeorgiaMap({
  mode = "explore",
  locationIds,
  visibleIds,
  selectedId = null,
  onSelect,
  onReady,
  tourIds,
  tourStep = null,
  intro = "done",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const faderRef = useRef<PinFader | null>(null);
  const qualityRef = useRef<Quality>("high");
  const hoverId = useRef<string | null>(null);
  const selectedRef = useRef<string | null>(null);
  const reticleRef = useRef<maplibregl.Marker | null>(null);
  // Latest callbacks/props for map handlers that are registered once.
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  const scopeRef = useRef(locationIds);
  const introRef = useRef(intro);
  const flownRef = useRef(false);
  const stopDriftRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
  });

  const [loaded, setLoaded] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [is3D, setIs3D] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // The map instance as state, for child widgets (readout, compass) that subscribe to
  // camera events themselves, so camera motion never re-renders this component.
  const [mapInst, setMapInst] = useState<MLMap | null>(null);
  const mini = mode === "mini";

  /** Home camera: the whole state (explore) or this production's locations (mini). */
  const homeCamera = useCallback(
    (map: MLMap, pitch: number) => {
      const scope = scopeRef.current ? resolve(scopeRef.current) : [];
      if (mini && scope.length) {
        if (scope.length === 1) return { center: [scope[0].lng, scope[0].lat] as [number, number], zoom: 12.5, pitch, bearing: HOME_BEARING };
        const b = new maplibregl.LngLatBounds();
        scope.forEach((l) => b.extend([l.lng, l.lat]));
        const cam = map.cameraForBounds(b, { padding: 70, bearing: HOME_BEARING, maxZoom: 13 });
        return { center: cam?.center ?? b.getCenter(), zoom: (cam?.zoom ?? 8) - (pitch > 0 ? 0.3 : 0), pitch, bearing: HOME_BEARING };
      }
      const narrow = map.getContainer().clientWidth < 640;
      const cam = map.cameraForBounds(GEORGIA_BOUNDS, {
        padding: narrow ? { top: 110, bottom: 120, left: 16, right: 16 } : { top: 110, bottom: 90, left: 80, right: 80 },
        bearing: HOME_BEARING,
      });
      return {
        center: cam?.center ?? ([-83.4, 32.7] as [number, number]),
        // cameraForBounds assumes a flat, top-down view; pitched views fit tighter, so nudge in.
        zoom: (cam?.zoom ?? 6.3) + (pitch > 0 ? 0.35 : 0),
        bearing: HOME_BEARING,
        pitch,
      };
    },
    [mini],
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const quality = detectQuality();
    qualityRef.current = quality;
    const q = QUALITY_SETTINGS[quality];
    const scope = scopeRef.current ? resolve(scopeRef.current) : allLocations;

    // Overlay sources first so they're tiled before the base map.
    const base = buildBaseStyle(quality);
    const style = { ...base, sources: { ...overlaySources(scope), ...base.sources } };

    let map: MLMap;
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style,
        center: [-83.4, 32.7],
        zoom: 6,
        maxPitch: q.maxPitch,
        pixelRatio: Math.min(window.devicePixelRatio || 1, q.pixelRatioCap),
        attributionControl: false,
        // Wide enough for the fly-in to start high above the Southeast.
        maxBounds: [
          [-99, 21],
          [-67, 43],
        ],
        minZoom: 4.5,
        fadeDuration: 200,
        // An embedded map shouldn't hijack page scrolling.
        cooperativeGestures: mini,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "WebGL is unavailable on this device.";
      queueMicrotask(() => setError(msg));
      return;
    }
    mapRef.current = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "top-right");
    if (!mini) map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: "imperial" }), "bottom-left");
    // Handy for tuning the look from devtools: open with ?debug to get window.__map.
    if (new URLSearchParams(window.location.search).has("debug")) (window as unknown as { __map: MLMap }).__map = map;
    map.jumpTo(introRef.current === "done" ? homeCamera(map, q.homePitch) : FLY_IN_START);

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
      faderRef.current = new PinFader(map, scope.map((l) => l.id));
      // Contours are decoration: add them after the first full render.
      map.once("idle", () => addContours(map, quality));
      setMapInst(map);
      setLoaded(true);
      onReadyRef.current?.();
    });
    map.on("zoom", syncTerrain);

    // --- Hover tooltip + highlight ------------------------------------------
    const setHover = (id: string | null) => {
      if (hoverId.current === id) return;
      for (const source of PIN_SOURCES) {
        if (hoverId.current) map.setFeatureState({ source, id: hoverId.current }, { hover: false });
        if (id) map.setFeatureState({ source, id }, { hover: true });
      }
      hoverId.current = id;
    };
    const interactive = [...INTERACTIVE_LAYERS, CLUSTER_LAYER];
    const hit = (point: maplibregl.PointLike) =>
      map.queryRenderedFeatures(point, { layers: interactive.filter((l) => map.getLayer(l)) })[0] as MapGeoJSONFeature | undefined;

    map.on("mousemove", (e) => {
      const f = hit(e.point);
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

    // --- Click: expand clusters, select pins ---------------------------------
    map.on("click", async (e) => {
      const f = hit(e.point);
      if (!f) return;
      if (f.layer.id === CLUSTER_LAYER) {
        const center = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        const zoom = await (map.getSource("pins") as GeoJSONSource).getClusterExpansionZoom(f.properties.cluster_id as number);
        map.easeTo({ center, zoom: zoom + 0.5, duration: prefersReducedMotion() ? 0 : 1200 });
        return;
      }
      setTooltip(null);
      onSelectRef.current?.((f.properties as PinProperties).id);
    });

    return () => {
      cancelAnimationFrame(raf);
      faderRef.current?.destroy();
      faderRef.current = null;
      reticleRef.current?.remove();
      reticleRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [homeCamera, mini]);

  // --- Filtering: animate pins in/out ----------------------------------------
  useEffect(() => {
    if (!loaded || !visibleIds || !faderRef.current) return;
    faderRef.current.setVisible(visibleIds, !prefersReducedMotion());
  }, [loaded, visibleIds]);

  // --- Selection: highlight + cinematic camera move ---------------------------
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const prev = selectedRef.current;
    if (prev === selectedId) return;
    for (const source of PIN_SOURCES) {
      if (prev) map.setFeatureState({ source, id: prev }, { selected: false });
      if (selectedId) map.setFeatureState({ source, id: selectedId }, { selected: true });
    }
    selectedRef.current = selectedId;
    // Selecting anything ends the landing drift for good (before the fly-to starts).
    if (selectedId) {
      stopDriftRef.current?.();
      stopDriftRef.current = null;
    }
    const loc = selectedId ? locationById.get(selectedId) : undefined;
    // Selection reticle: an HTML marker lying flat on the terrain, pulsing via CSS.
    // (A circle layer for this occluded other pins on terrain.)
    reticleRef.current?.remove();
    reticleRef.current = null;
    if (loc) {
      const el = document.createElement("div");
      el.className = "reticle";
      el.setAttribute("aria-hidden", "true");
      reticleRef.current = new maplibregl.Marker({ element: el, pitchAlignment: "map", rotationAlignment: "map" })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
    }
    if (loc) flyToLocation(map, loc, { quality: qualityRef.current, reduce: prefersReducedMotion() });
    else if (prev) clearSelectionPadding(map, prefersReducedMotion());
  }, [loaded, selectedId]);

  // --- Film tour route: redraw with a draw-on animation when stops change ------
  const tourKey = tourIds?.join(",") ?? "";
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map) return;
    const stops = resolveStops(tourKey ? tourKey.split(",") : []);
    (map.getSource("tour-route") as GeoJSONSource | undefined)?.setData(routeGeoJSON(stops));
    (map.getSource("tour-stops") as GeoJSONSource | undefined)?.setData(stopsGeoJSON(stops));
    if (stops.length < 2 || prefersReducedMotion()) {
      map.setPaintProperty("tour-route-line", "line-gradient", routeGradient(1));
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 1200);
      map.setPaintProperty("tour-route-line", "line-gradient", routeGradient(1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [loaded, tourKey]);

  // While playing, the route is brighter up to the current stop.
  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || !tourKey) return;
    const stops = resolveStops(tourKey.split(","));
    const cum = cumulativeMiles(stops);
    const total = cum.at(-1) || 1;
    const travelled = tourStep === null ? 0 : cum[Math.min(tourStep, cum.length - 1)] / total;
    map.setPaintProperty("tour-route-line", "line-gradient", routeGradient(1, travelled));
  }, [loaded, tourKey, tourStep]);

  // --- Landing: fly-in, then idle drift ---------------------------------------
  // Drift only on capable devices, without reduced motion, with nothing selected.
  const beginDrift = useCallback((map: MLMap) => {
    if (mini || qualityRef.current === "low" || prefersReducedMotion() || selectedRef.current) return;
    stopDriftRef.current?.();
    stopDriftRef.current = startIdleDrift(map);
  }, [mini]);

  useEffect(() => {
    const map = mapRef.current;
    if (!loaded || !map || flownRef.current) return;
    if (intro === "done") {
      flownRef.current = true;
      if (introRef.current === "done") beginDrift(map);
      else map.jumpTo(homeCamera(map, QUALITY_SETTINGS[qualityRef.current].homePitch)); // intro skipped (reduced motion)
      return;
    }
    if (intro !== "play") return;
    flownRef.current = true;
    const home = homeCamera(map, QUALITY_SETTINGS[qualityRef.current].homePitch);
    if (prefersReducedMotion()) {
      map.jumpTo(home);
      return;
    }
    // Swoop down from high above the Southeast and tilt into the establishing shot.
    map.flyTo({ ...home, duration: 5200, curve: 1.25, essential: false, easing: (t) => 1 - Math.pow(1 - t, 3) });
    map.once("moveend", () => beginDrift(map));
  }, [loaded, intro, homeCamera, beginDrift]);

  useEffect(() => () => stopDriftRef.current?.(), []);

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
      {!mini && <MapReadout map={mapInst} />}
      <MapControls
        compact={mini}
        is3D={is3D}
        map={mapInst}
        onZoomIn={() => mapRef.current?.zoomIn({ duration: duration() / 3 })}
        onZoomOut={() => mapRef.current?.zoomOut({ duration: duration() / 3 })}
        onResetNorth={() => mapRef.current?.easeTo({ bearing: 0, duration: duration() / 2 })}
        onReset={resetView}
        onToggle3D={toggle3D}
      />
    </div>
  );
}
