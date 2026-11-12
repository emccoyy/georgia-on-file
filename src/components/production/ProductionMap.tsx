"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const GeorgiaMap = dynamic(() => import("@/components/map/GeorgiaMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center">
      <p className="cursor-blink font-mono text-[10px] tracking-[0.3em] text-accent uppercase">Loading terrain</p>
    </div>
  ),
});

/** Embedded 3D map of one production's locations. Clicking a pin opens it on the main map. */
export function ProductionMap({ locationIds }: { locationIds: string[] }) {
  const router = useRouter();
  return <GeorgiaMap mode="mini" locationIds={locationIds} onSelect={(id) => router.push(`/?loc=${id}`)} />;
}
