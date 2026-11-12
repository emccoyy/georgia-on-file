"use client";

import { AnimatePresence, motion } from "framer-motion";

export function LoadingScreen({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="absolute inset-0 z-40 grid place-items-center bg-ink"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          aria-live="polite"
        >
          <p className="cursor-blink font-mono text-xs tracking-[0.3em] text-accent uppercase">Initializing terrain model</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
