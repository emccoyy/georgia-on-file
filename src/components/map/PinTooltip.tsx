"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { PinProperties } from "@/data";
import { TYPE_COLORS } from "@/lib/map/config";

export type TooltipState = { x: number; y: number; pin?: PinProperties; cluster?: number };

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
          className="pointer-events-none absolute z-20 max-w-64 -translate-x-1/2 -translate-y-[calc(100%+18px)] rounded-md border border-white/10 bg-ink/90 px-3 py-2 shadow-xl backdrop-blur-md"
          style={{ left: state.x, top: state.y }}
        >
          {state.pin ? (
            <>
              <p className="font-display text-lg leading-none tracking-wide text-paper">{state.pin.name}</p>
              <p className="mt-1 text-xs text-paper/60">{state.pin.city}</p>
              <p className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: TYPE_COLORS[state.pin.ptype] }}>
                <span className="inline-block size-1.5 rounded-full" style={{ background: TYPE_COLORS[state.pin.ptype] }} />
                {state.pin.titles}
              </p>
            </>
          ) : (
            <p className="text-xs text-paper/80">
              {state.cluster} locations · <span className="text-amber">click to expand</span>
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
