"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { locations, productions } from "@/data";

/** Total hold time of the title card before the camera fly-in starts. */
export const INTRO_MS = 2800;

const fade = (delay: number) => ({
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
});

/**
 * Opening-credits title card. Plays once per session on a plain visit to the
 * home page; any click, key or the Skip button ends it early. The map loads
 * underneath while it plays.
 */
export function IntroSequence({ show, onDone }: { show: boolean; onDone: () => void }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onDone, INTRO_MS);
    const skip = (e: KeyboardEvent) => {
      if (e.key !== "Tab") onDone();
    };
    window.addEventListener("keydown", skip);
    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", skip);
    };
  }, [show, onDone]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="intro"
          className="absolute inset-0 z-50 grid cursor-pointer place-items-center bg-ink"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          onClick={onDone}
          role="presentation"
        >
          {/* Drafting grid that fades up behind the title. */}
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(rgba(124,196,242,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(124,196,242,.07)_1px,transparent_1px)] bg-[size:48px_48px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.6 }}
          />
          <div className="relative flex flex-col items-center px-6 text-center">
            <motion.p {...fade(0.15)} className="font-mono text-[10px] tracking-[0.5em] text-accent uppercase sm:text-[11px]">
              An unofficial fan atlas
            </motion.p>
            <motion.div
              aria-hidden
              className="my-4 h-px w-64 origin-center bg-accent/70 sm:w-96"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.3, duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.h2
              className="font-display text-6xl leading-[0.85] text-paper sm:text-8xl"
              initial={{ opacity: 0, letterSpacing: "0.45em" }}
              animate={{ opacity: 1, letterSpacing: "0.06em" }}
              transition={{ delay: 0.45, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            >
              Georgia <span className="text-accent">on</span> Film
            </motion.h2>
            <motion.p {...fade(1.2)} className="mt-5 font-mono text-[10px] tracking-[0.3em] text-line uppercase sm:text-[11px]">
              {locations.length} public locations <span className="text-line/50">/</span> {productions.length} productions
            </motion.p>
          </div>
          <motion.p
            {...fade(1.6)}
            className="absolute bottom-10 font-mono text-[10px] tracking-[0.35em] text-paper/70 uppercase"
          >
            Designed and built by Ethan McCoy
          </motion.p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDone();
            }}
            className="absolute right-6 bottom-8 font-mono text-[10px] tracking-[0.3em] text-line uppercase hover:text-accent focus-visible:outline-2 focus-visible:outline-accent sm:right-10"
          >
            Skip ▸
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
