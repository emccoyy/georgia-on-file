/**
 * Blueprint palette. Every map color lives here so the drafting look can be
 * retuned in one place. UI colors mirror these in globals.css (@theme).
 */
export const BP = {
  /** The void around the slab: the "drafting table". */
  floor: "#061a30",
  /** Base paper color of the sheet. */
  paper: "#0b2a4a",
  /** Line work, from faint to bright. */
  lineFaint: "#3f7fb5",
  line: "#7cc4f2",
  lineBright: "#bfe6ff",
  ink: "#eaf7ff",
  /** Signature accent: cyan "light pen". */
  cyan: "#5ce1ff",
  water: "#061e38",
  sky: "#03101f",
  horizon: "#0f3f6b",
} as const;
