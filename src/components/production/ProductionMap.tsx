"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { detectQuality } from "@/lib/device";

const GeorgiaMap = dynamic(() => import("@/components/map/GeorgiaMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <p className="cursor-blink font-mono text-[10px] tracking-[0.3em] text-accent uppercase">Loading terrain</p>
    </div>
  ),
});

/**
 * Embedded 3D map of one production's locations. It's secondary on this page,
 * so it only starts when scrolled into view, and on phones / low-power devices
 * only when asked for (a 3D terrain map is heavy for a content page).
 * Clicking a pin opens it on the main map.
 */
export function ProductionMap({ locationIds, count }: { locationIds: string[]; count: number }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [requested, setRequested] = useState(false);
  // Server render and hydration assume "not low power"; the client value applies right after.
  const lowPower = useSyncExternalStore(
    () => () => {},
    () => detectQuality() === "low",
    () => false,
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const start = visible && (!lowPower || requested);
  return (
    <div ref={ref} className="h-full">
      {start ? (
        <GeorgiaMap mode="mini" locationIds={locationIds} onSelect={(id) => router.push(`/?loc=${id}`)} />
      ) : (
        <div className="grid h-full place-items-center bg-[linear-gradient(rgba(124,196,242,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(124,196,242,.08)_1px,transparent_1px)] bg-[size:32px_32px]">
          {lowPower && (
            <button
              type="button"
              onClick={() => setRequested(true)}
              className="border border-accent/60 bg-ink/80 px-4 py-2.5 font-mono text-[11px] tracking-[0.2em] text-accent uppercase hover:bg-accent/15 focus-visible:outline-2 focus-visible:outline-accent"
            >
              Load 3D map · {count} location{count === 1 ? "" : "s"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
