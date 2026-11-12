"use client";

import { useEffect, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { useMediaQuery } from "@/lib/useMediaQuery";

type Readout = { lng: number | null; lat: number | null; zoom: number; pitch: number; bearing: number };

const fmt = (v: number, pos: string, neg: string) => `${v >= 0 ? pos : neg} ${Math.abs(v).toFixed(4)}°`;

/**
 * Survey-style HUD: live cursor coordinates and camera state (desktop only).
 * Subscribes to the map itself, at most one update per frame, so camera motion
 * re-renders only this widget.
 */
export function MapReadout({ map }: { map: MLMap | null }) {
  const wide = useMediaQuery("(min-width: 1024px)");
  const [r, setR] = useState<Readout | null>(null);

  useEffect(() => {
    if (!map || !wide) return;
    let raf = 0;
    let cursor: { lng: number; lat: number } | null = null;
    const push = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setR({ lng: cursor?.lng ?? null, lat: cursor?.lat ?? null, zoom: map.getZoom(), pitch: map.getPitch(), bearing: map.getBearing() }),
      );
    };
    const onMouse = (e: { lngLat: { lng: number; lat: number } }) => {
      cursor = e.lngLat;
      push();
    };
    map.on("move", push);
    map.on("mousemove", onMouse);
    push();
    return () => {
      cancelAnimationFrame(raf);
      map.off("move", push);
      map.off("mousemove", onMouse);
    };
  }, [map, wide]);

  if (!wide || !r) return null;
  const heading = ((r.bearing % 360) + 360) % 360;
  return (
    <div className="pointer-events-none absolute bottom-28 left-8 z-10 font-mono text-[10px] leading-relaxed tracking-wider text-line uppercase" aria-hidden>
      <p>
        <span className="text-line/80">CURSOR </span>
        {r.lat === null || r.lng === null ? "— —" : `${fmt(r.lat, "N", "S")}  ${fmt(r.lng, "E", "W")}`}
      </p>
      <p>
        <span className="text-line/80">ZOOM </span>
        {r.zoom.toFixed(2)}
        <span className="text-line/80">  PITCH </span>
        {r.pitch.toFixed(0)}°<span className="text-line/80">  HDG </span>
        {heading.toFixed(0).padStart(3, "0")}°
      </p>
    </div>
  );
}
