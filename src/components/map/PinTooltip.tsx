"use client";

import { AnimatePresence, motion } from "framer-motion";
import { locationById, type PinProperties } from "@/data";
import { TYPE_COLORS } from "@/lib/map/config";

export type TooltipState = { x: number; y: number; pin?: PinProperties; cluster?: number };

function coords(id: string) {
  const l = locationById.get(id);
  return l ? `${l.lat.toFixed(3)}°N ${Math.abs(l.lng).toFixed(3)}°W` : "";
}

export function PinTooltip({ state }: { state: TooltipState | null }) {
  return (
    <AnimatePresence>
      {state && (
        <motion.div
          key={state.pin?.id ?? "cluster"}
          role="tooltip"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute z-20 max-w-64 -translate-x-1/2 -translate-y-[calc(100%+18px)] border border-line/40 bg-ink/90 px-3 py-2 backdrop-blur-md"
          style={{ left: state.x, top: state.y }}
        >
          {state.pin ? (
            <>
              <p className="font-display text-lg leading-none tracking-wide text-paper">{state.pin.name}</p>
              <p className="mt-1 font-mono text-[10px] tracking-wider text-line uppercase">
                {state.pin.city} · {coords(state.pin.id)}
              </p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: TYPE_COLORS[state.pin.ptype] }}>
                <span className="inline-block size-1.5 rounded-full" style={{ background: TYPE_COLORS[state.pin.ptype] }} />
                {state.pin.titles}
              </p>
            </>
          ) : (
            <p className="font-mono text-[11px] tracking-wider text-paper/80 uppercase">
              {state.cluster} locations · <span className="text-accent">click to expand</span>
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
