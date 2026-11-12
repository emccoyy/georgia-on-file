import { HomeMap } from "@/components/home/HomeMap";
import { Legend } from "@/components/map/Legend";
import { TitleBlock } from "@/components/ui/TitleBlock";
import { locations, productions } from "@/data";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      <h1 className="sr-only">Georgia on Film: an interactive 3D map of filming locations in Georgia</h1>
      <HomeMap />

      {/* Sheet header, over a soft fade so it stays legible on any terrain. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-ink/90 via-ink/40 to-transparent px-5 pt-6 pb-16 sm:px-10 sm:pt-8">
        <p className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase" aria-hidden>
          {"// DWG GA-001"}
          <span className="hidden sm:inline">{" · Filming locations atlas"}</span>
        </p>
        <p className="mt-1 font-display text-5xl leading-[0.85] tracking-wide text-paper sm:text-7xl" aria-hidden>
          Georgia <span className="text-accent">on</span> Film
        </p>
        <p className="mt-2 font-mono text-[11px] tracking-[0.18em] text-line uppercase">
          {locations.length} public locations <span className="text-line/50">/</span> {productions.length} productions
        </p>
      </div>

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent px-5 pt-10 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-6">
        <Legend />
        <TitleBlock locations={locations.length} productions={productions.length} />
      </footer>

      {/* Drafting-sheet frame with registration marks. */}
      <div className="blueprint-frame" aria-hidden>
        <span />
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
