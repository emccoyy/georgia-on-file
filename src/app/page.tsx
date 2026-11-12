import { HomeMap } from "@/components/home/HomeMap";
import { Legend } from "@/components/map/Legend";
import { TitleBlock } from "@/components/ui/TitleBlock";
import { SiteNav } from "@/components/ui/SiteNav";
import { locations, productions } from "@/data";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      <h1 className="sr-only">Georgia on Film: an interactive 3D map of filming locations in Georgia</h1>
      <HomeMap />

      {/* Site nav: top-right on desktop (beside the attribution button), in the footer on phones. */}
      <SiteNav compact className="absolute top-[30px] right-16 z-20 hidden sm:block" />


      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col gap-2 bg-gradient-to-t from-ink/95 via-ink/60 to-transparent px-5 pt-10 pb-4 sm:flex-row sm:items-end sm:justify-between sm:px-10 sm:pb-6">
        <div className="flex flex-col gap-2">
          <SiteNav compact className="sm:hidden" />
          <Legend />
        </div>
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
