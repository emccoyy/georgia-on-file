import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { locationById, productionById, productions } from "@/data";
import type { FilmLocation } from "@/data/schema";
import { TYPE_COLORS } from "@/lib/map/config";
import { orderByNearest } from "@/lib/tour";
import { ProductionMap } from "@/components/production/ProductionMap";
import { TypeIcon } from "@/components/ui/TypeIcon";

export function generateStaticParams() {
  return productions.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/production/[id]">): Promise<Metadata> {
  const { id } = await params;
  const p = productionById.get(id);
  if (!p) return { title: "Not found · Georgia on Film" };
  return {
    title: `${p.title} (${p.year}) filming locations · Georgia on Film`,
    description: `${p.locationIds.length} public filming location${p.locationIds.length === 1 ? "" : "s"} in Georgia for ${p.title}. ${p.logline}`,
  };
}

const label = "font-mono text-[9px] tracking-[0.25em] text-line/70 uppercase";

export default async function ProductionPage({ params }: PageProps<"/production/[id]">) {
  const { id } = await params;
  const p = productionById.get(id);
  if (!p) notFound();
  const locs = p.locationIds.map((lid) => locationById.get(lid)).filter((l): l is FilmLocation => !!l);
  const color = TYPE_COLORS[p.type];

  return (
    <main className="min-h-dvh bg-ink px-5 py-8 text-paper sm:px-10 sm:py-10">
      <nav className="mb-8">
        <Link href="/" className="font-mono text-[11px] tracking-[0.2em] text-line uppercase hover:text-accent">
          ← Back to the map
        </Link>
      </nav>

      <header className="max-w-4xl">
        <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.25em] uppercase" style={{ color }}>
          <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} aria-hidden />
          {p.type}
        </p>
        <h1 className="mt-2 font-display text-6xl leading-[0.85] tracking-wide sm:text-8xl">{p.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-paper/80">{p.logline}</p>

        <dl className="mt-6 grid max-w-xl grid-cols-3 border border-line/40 font-mono text-[12px] tracking-wider uppercase">
          <div className="border-r border-line/30 px-3 py-2">
            <dt className={label}>Year</dt>
            <dd>{p.year}</dd>
          </div>
          <div className="border-r border-line/30 px-3 py-2">
            <dt className={label}>Distributor / network</dt>
            <dd className="truncate">{p.distributor ?? "—"}</dd>
          </div>
          <div className="px-3 py-2">
            <dt className={label}>GA locations</dt>
            <dd>{locs.length}</dd>
          </div>
        </dl>
      </header>

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section aria-label="Map of filming locations" className="relative h-[420px] overflow-hidden border border-line/40 sm:h-[540px]">
          <ProductionMap locationIds={p.locationIds} />
        </section>

        <section aria-labelledby="locations-heading">
          <div className="mb-3 flex items-end justify-between">
            <h2 id="locations-heading" className="font-mono text-[10px] tracking-[0.25em] text-line uppercase">
              Filming locations · {locs.length}
            </h2>
            <div className="flex gap-2">
              <Link
                href={`/?production=${p.id}`}
                className="border border-line/40 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-line uppercase hover:text-paper"
              >
                View on map
              </Link>
              {locs.length > 1 && (
                // Stops ordered nearest-neighbour so the fly-through follows a sensible route.
                <Link
                  href={`/?tour=${orderByNearest(p.locationIds, { fromOutlier: true }).join(",")}&play=1`}
                  className="border border-accent/60 bg-accent/10 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] text-accent uppercase hover:bg-accent/20"
                >
                  ▶ Tour this production
                </Link>
              )}
            </div>
          </div>
          <ol className="flex flex-col divide-y divide-line/20 border-y border-line/20">
            {locs.map((l, i) => (
              <li key={l.id}>
                <Link href={`/?loc=${l.id}`} className="group flex gap-3 py-3 focus-visible:outline-2 focus-visible:outline-accent">
                  <span className="w-6 pt-0.5 font-mono text-[11px] text-line/60">{String(i + 1).padStart(2, "0")}</span>
                  <TypeIcon type={l.type} className="mt-0.5 size-5 shrink-0 text-accent/80" />
                  <span className="min-w-0">
                    <span className="block font-display text-xl leading-none tracking-wide group-hover:text-accent">{l.name}</span>
                    <span className="mt-1 block font-mono text-[10px] tracking-wider text-line uppercase">
                      {l.city} · {l.county} County
                    </span>
                    <span className="mt-1.5 block text-xs leading-relaxed text-paper/70">{l.description}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section aria-labelledby="sources-heading" className="mt-10 max-w-4xl">
        <h2 id="sources-heading" className="mb-2 font-mono text-[10px] tracking-[0.25em] text-line uppercase">
          Sources
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1">
          {p.sources.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-line underline decoration-line/40 hover:text-accent">
                {new URL(u).hostname.replace(/^www\./, "")}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 border-t border-line/20 pt-4 font-mono text-[10px] leading-relaxed tracking-wide text-paper/50">
        Unofficial fan project. Not affiliated with any studio, network or the Georgia Film Office. Public places only. Designed and
        built by Ethan McCoy.
      </footer>
    </main>
  );
}
