export type Quality = "high" | "low";

/**
 * Rough device-capability guess. Low tier = phones/tablets with small screens,
 * few cores or little memory. Override for testing with `?quality=high|low`.
 */
export function detectQuality(): Quality {
  if (typeof window === "undefined") return "high";
  const override = new URLSearchParams(window.location.search).get("quality");
  if (override === "high" || override === "low") return override;

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const cores = nav.hardwareConcurrency ?? 8;
  const memory = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const smallScreen = Math.min(window.screen.width, window.screen.height) < 600;

  if (nav.connection?.saveData) return "low";
  if (cores <= 4 || memory <= 4) return "low";
  if (coarse && smallScreen) return "low";
  return "high";
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
