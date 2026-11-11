"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

// MapLibre touches window/WebGL, so it only ever renders on the client.
const GeorgiaMap = dynamic(() => import("@/components/map/GeorgiaMap"), { ssr: false });

export function HomeMap() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  return (
    <div className="absolute inset-0">
      <GeorgiaMap onReady={onReady} />
      <AnimatePresence>
        {!ready && (
          <motion.div
            className="absolute inset-0 grid place-items-center bg-ink"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            aria-live="polite"
          >
            <p className="font-display text-sm tracking-[0.4em] text-amber/80 uppercase">Loading terrain…</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
