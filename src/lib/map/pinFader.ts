import type { GeoJSONSource, Map as MLMap } from "maplibre-gl";
import { locationById, locationsToBeams, locationsToPoints } from "@/data";
import type { FilmLocation } from "@/data/schema";
import { BEAM_RADII, PIN_SOURCES } from "./layers";

const DURATION = 450;

/**
 * Animates pins in and out when the visible set changes. Entering pins are
 * added with fade=0 and animated up; leaving pins animate down and are then
 * removed from the sources (so clusters recount). `fade` drives ring radius,
 * dot opacity and beam height in layers.ts.
 */
export class PinFader {
  private current: Set<string>;
  private raf = 0;
  private pendingFinal: Set<string> | null = null;

  constructor(
    private map: MLMap,
    initial: Iterable<string>,
  ) {
    this.current = new Set(initial);
  }

  private setData(ids: Set<string>) {
    const list = [...ids].map((id) => locationById.get(id)).filter((l): l is FilmLocation => !!l);
    (this.map.getSource("pins") as GeoJSONSource | undefined)?.setData(locationsToPoints(list));
    for (const src of ["beams-far", "beams-near"] as const) {
      (this.map.getSource(src) as GeoJSONSource | undefined)?.setData(locationsToBeams(BEAM_RADII[src], list));
    }
  }

  private setFade(id: string, fade: number) {
    for (const source of PIN_SOURCES) this.map.setFeatureState({ source, id }, { fade });
  }

  setVisible(next: Set<string>, animate: boolean) {
    // Finish any running animation instantly before starting a new one.
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      if (this.pendingFinal) this.setData(this.pendingFinal);
    }
    const entering = [...next].filter((id) => !this.current.has(id));
    const leaving = [...this.current].filter((id) => !next.has(id));
    if (!entering.length && !leaving.length) return;

    if (!animate) {
      for (const id of entering) this.setFade(id, 1);
      this.setData(next);
      this.current = next;
      return;
    }

    for (const id of entering) this.setFade(id, 0);
    this.setData(new Set([...next, ...leaving]));
    this.pendingFinal = next;
    this.current = next;

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
      for (const id of entering) this.setFade(id, e);
      for (const id of leaving) this.setFade(id, 1 - e);
      if (t < 1) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = 0;
        // Leaving pins keep fade=0 (resetting now would flash them back before the
        // async setData lands). Pins re-entering later are set to 0 and animated up.
        this.setData(next);
        this.pendingFinal = null;
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }
}
