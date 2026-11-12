import type { Metadata } from "next";
import { PageShell } from "@/components/ui/PageShell";
import { ColumnChart, MeterList } from "@/components/stats/Charts";
import { busiestLocations, headline, productionsByDecade, topCounties, typeBreakdown } from "@/lib/stats";
import { TYPE_COLORS } from "@/lib/map/config";

export const metadata: Metadata = {
  title: "Stats · Georgia on Film",
  description: "Georgia filming locations by the numbers: productions by decade, top counties, formats and the most-filmed places.",
};

function Card({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="border border-line/30 p-5" aria-labelledby={title.replace(/\W+/g, "-")}>
      <h2 id={title.replace(/\W+/g, "-")} className="font-display text-2xl leading-none tracking-wide">
        {title}
      </h2>
      {note && <p className="mt-1 mb-5 font-mono text-[10px] tracking-wider text-line">{note}</p>}
      {children}
    </section>
  );
}

export default function StatsPage() {
  const h = headline();
  const types = typeBreakdown(TYPE_COLORS);
  const kpis = [
    { label: "Public locations", value: h.locations },
    { label: "Productions", value: h.productions },
    { label: "Counties", value: h.counties },
    { label: "Towns & cities", value: h.cities },
    { label: "Years covered", value: `${h.firstYear}–${h.lastYear}` },
  ];
  return (
    <PageShell>
      <p className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">{"// By the numbers"}</p>
      <h1 className="mt-2 font-display text-6xl leading-[0.85] tracking-wide sm:text-7xl">Stats</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-paper/75">
        Everything here is computed live from the dataset behind the map, so it updates whenever a location or production is added.
        Rows link straight into the map.
      </p>

      <dl className="mt-8 grid grid-cols-2 border border-line/30 sm:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="border-line/20 p-4 not-last:border-r max-sm:odd:border-r max-sm:[&:nth-child(n+3)]:border-t">
            <dt className="font-mono text-[9px] tracking-[0.25em] text-line uppercase">{k.label}</dt>
            <dd className="mt-1 font-display text-4xl leading-none tracking-wide tabular-nums sm:text-5xl">{k.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Productions by decade" note="Release year of each production with at least one location here. Hover a column for titles.">
          <ColumnChart data={productionsByDecade()} valueLabel="productions" />
        </Card>
        <Card title="Top counties" note="Counties ranked by number of filming locations on the map.">
          <MeterList data={topCounties()} valueLabel="locations" />
        </Card>
        <Card title="By format" note="Share of productions by type. Colors match the map's beacons.">
          <MeterList data={types} valueLabel="productions" total={h.productions} />
        </Card>
        <Card title="Most-filmed places" note="Locations ranked by how many productions shot there.">
          <MeterList data={busiestLocations()} valueLabel="productions" />
        </Card>
      </div>
    </PageShell>
  );
}
