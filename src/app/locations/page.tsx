import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { TypeIcon } from "@/components/ui/TypeIcon";
import { locations, productionsForLocation } from "@/data";

export const metadata: Metadata = {
  title: "Location index · Georgia on Film",
  description: "Every public filming location on the Georgia on Film map, by county, with the productions shot at each.",
};

/** Text index of every location, grouped by county: an accessible, crawlable alternative to the map. */
export default function LocationsIndex() {
  const byCounty = new Map<string, typeof locations>();
  for (const l of [...locations].sort((a, b) => a.name.localeCompare(b.name))) {
    byCounty.set(l.county, [...(byCounty.get(l.county) ?? []), l]);
  }
  const counties = [...byCounty.keys()].sort((a, b) => a.localeCompare(b));

  return (
    <PageShell>
      <p className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">{"// Every location"}</p>
      <h1 className="mt-2 font-display text-6xl leading-[0.85] tracking-wide sm:text-7xl">Location index</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/75">
        All {locations.length} locations in {counties.length} counties. Select one to fly to it on the map.
      </p>

      <nav aria-label="Jump to county" className="mt-6 flex flex-wrap gap-x-1 gap-y-1 font-mono text-[10px] tracking-wider uppercase">
        {counties.map((c) => (
          <a key={c} href={`#county-${c.replace(/\W+/g, "-")}`} className="inline-block px-1.5 py-1.5 text-line hover:text-accent">
            {c}
          </a>
        ))}
      </nav>

      <div className="mt-10 grid gap-x-10 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
        {counties.map((c) => (
          <section key={c} id={`county-${c.replace(/\W+/g, "-")}`} aria-labelledby={`h-${c.replace(/\W+/g, "-")}`} className="scroll-mt-6">
            <h2 id={`h-${c.replace(/\W+/g, "-")}`} className="border-b border-line/30 pb-1 font-mono text-[11px] tracking-[0.25em] text-accent uppercase">
              {c} County · {byCounty.get(c)!.length}
            </h2>
            <ul className="mt-2 flex flex-col">
              {byCounty.get(c)!.map((l) => (
                <li key={l.id}>
                  <Link href={`/?loc=${l.id}`} className="group flex gap-2.5 py-2 focus-visible:outline-2 focus-visible:outline-accent">
                    <TypeIcon type={l.type} className="mt-0.5 size-4 shrink-0 text-line" />
                    <span className="min-w-0">
                      <span className="block text-sm text-paper group-hover:text-accent">{l.name}</span>
                      <span className="block text-xs text-paper/65">
                        {l.city} · {productionsForLocation(l).map((p) => p.title).join(", ")}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
