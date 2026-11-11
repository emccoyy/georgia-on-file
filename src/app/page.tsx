import { HomeMap } from "@/components/home/HomeMap";
import { Legend } from "@/components/map/Legend";
import { locations, productions } from "@/data";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      <h1 className="sr-only">Georgia on Film: an interactive 3D map of filming locations in Georgia</h1>
      <HomeMap />

      {/* Title block: top-left, over a soft vignette so it stays legible on any terrain. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-ink/90 via-ink/40 to-transparent px-4 pt-5 pb-16 sm:px-8 sm:pt-7">
        <p className="font-display text-[11px] tracking-[0.5em] text-amber uppercase" aria-hidden>
          An interactive atlas
        </p>
        <p className="font-display text-5xl leading-[0.85] tracking-wide text-paper sm:text-7xl" aria-hidden>
          Georgia <span className="text-amber">on</span> Film
        </p>
        <p className="mt-2 text-sm text-paper/60">
          {locations.length} public locations · {productions.length} productions
        </p>
      </div>

      <footer className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent px-4 pt-10 pb-3 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:pb-4">
        <Legend />
        <p className="max-w-xl text-[11px] leading-snug text-paper/55 sm:text-right">
          Unofficial fan project. Not affiliated with any studio, network or the Georgia Film Office. Locations are public
          places only.
        </p>
      </footer>
    </main>
  );
}
