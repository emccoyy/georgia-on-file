"use client";

export type Readout = { lng: number | null; lat: number | null; zoom: number; pitch: number; bearing: number };

const fmt = (v: number, pos: string, neg: string) => `${v >= 0 ? pos : neg} ${Math.abs(v).toFixed(4)}°`;

/** Survey-style HUD: live cursor coordinates and camera state. Desktop only. */
export function MapReadout({ r }: { r: Readout }) {
  const heading = ((r.bearing % 360) + 360) % 360;
  return (
    <div
      className="pointer-events-none absolute bottom-28 left-8 z-10 hidden font-mono text-[10px] leading-relaxed tracking-wider text-line uppercase lg:block"
      aria-hidden
    >
      <p>
        <span className="text-line/60">CURSOR </span>
        {r.lat === null || r.lng === null ? "— —" : `${fmt(r.lat, "N", "S")}  ${fmt(r.lng, "E", "W")}`}
      </p>
      <p>
        <span className="text-line/60">ZOOM </span>
        {r.zoom.toFixed(2)}
        <span className="text-line/60">  PITCH </span>
        {r.pitch.toFixed(0)}°<span className="text-line/60">  HDG </span>
        {heading.toFixed(0).padStart(3, "0")}°
      </p>
    </div>
  );
}
