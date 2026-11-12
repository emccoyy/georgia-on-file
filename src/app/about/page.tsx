import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { SITE } from "@/lib/site";
import { locations, productions } from "@/data";

export const metadata: Metadata = {
  title: "About · Georgia on Film",
  description: "About Georgia on Film: an unofficial, hand-curated 3D atlas of public filming locations across Georgia.",
};

const h2 = "font-display text-3xl leading-none tracking-wide";
const p = "mt-3 text-sm leading-relaxed text-paper/80";
const a = "text-accent underline decoration-accent/40 hover:decoration-accent";

export default function AboutPage() {
  const verified = locations.filter((l) => l.verified).length;
  const contact = [
    SITE.portfolioUrl && { label: "Portfolio", href: SITE.portfolioUrl },
    SITE.email && { label: SITE.email, href: `mailto:${SITE.email}` },
    SITE.linkedinUrl && { label: "LinkedIn", href: SITE.linkedinUrl },
  ].filter((x): x is { label: string; href: string } => !!x);

  return (
    <PageShell>
      <div className="max-w-3xl">
        <p className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">{"// About the project"}</p>
        <h1 className="mt-2 font-display text-6xl leading-[0.85] tracking-wide sm:text-7xl">About</h1>
        <p className="mt-5 text-lg leading-relaxed text-paper/90">
          Georgia has become one of the busiest places in the world to make film and television. Georgia on Film is an
          interactive 3D atlas of the real, public places where that work happens: the town squares, parks, diners and landmarks
          you can visit yourself.
        </p>

        <section className="mt-12">
          <h2 className={h2}>How to use it</h2>
          <ul className={`${p} list-disc space-y-1.5 pl-5 marker:text-accent`}>
            <li>Drag to pan, scroll or pinch to zoom, right-drag or two-finger drag to rotate and tilt. Arrow keys work too.</li>
            <li>Click a pin to fly in and see what was filmed there, with sources and directions.</li>
            <li>Search or filter by production, format, decade, county or town.</li>
            <li>
              Build a <strong className="text-paper">film tour</strong>: add stops, reorder them, then press Play to fly the route,
              or share the link.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className={h2}>Where the data comes from</h2>
          <p className={p}>
            Every entry is hand-curated and linked to its sources: Explore Georgia&apos;s film-location guides, local news coverage,
            venue and visitor-bureau pages, and the Georgia Film Office where available. Nothing is scraped. Descriptions and
            loglines are written fresh, not copied.
          </p>
          <p className={p}>
            The map currently holds {locations.length} locations and {productions.length} productions. {verified === 0
              ? "Entries are still being fact-checked against their sources"
              : `${verified} of ${locations.length} locations have been fact-checked so far`}
            ; pins marked approximate sit on the landmark or town center rather than an exact spot. Spot something wrong?{" "}
            {SITE.email ? (
              <a className={a} href={`mailto:${SITE.email}`}>
                Let me know
              </a>
            ) : (
              "Corrections are welcome"
            )}
            .
          </p>
        </section>

        <section className="mt-12">
          <h2 className={h2}>The rules</h2>
          <ul className={`${p} list-disc space-y-1.5 pl-5 marker:text-accent`}>
            <li>
              <strong className="text-paper">Public places only.</strong> Parks, landmarks, streets, campuses and businesses open to
              the public. Private homes are never included, even when fans have identified them.
            </li>
            <li>
              <strong className="text-paper">No copyrighted imagery.</strong> No film stills, posters or studio logos. Any photos
              are openly licensed (Wikimedia Commons) and credited.
            </li>
            <li>
              <strong className="text-paper">Be a good visitor.</strong> Many of these are working businesses and neighborhoods.
              Respect opening hours, property lines and the people who live and work there.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className={h2}>Built with</h2>
          <p className={p}>
            Next.js, TypeScript and Tailwind CSS; <a className={a} href="https://maplibre.org">MapLibre GL JS</a> for the 3D map;
            map data © <a className={a} href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors via{" "}
            <a className={a} href="https://openfreemap.org">OpenFreeMap</a> and OpenMapTiles; elevation from{" "}
            <a className={a} href="https://registry.opendata.aws/terrain-tiles/">AWS Terrain Tiles</a> (Mapzen); contour lines by{" "}
            <a className={a} href="https://github.com/onthegomap/maplibre-contour">maplibre-contour</a>; state boundary from US
            Census cartographic data; motion by Framer Motion.
          </p>
        </section>

        <section className="mt-12 border border-line/30 p-6">
          <p className="font-mono text-[10px] tracking-[0.3em] text-line uppercase">Designed and built by</p>
          <p className="mt-1 font-display text-4xl leading-none tracking-wide">{SITE.author}</p>
          {contact.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] tracking-[0.2em] uppercase">
              {contact.map((c) => (
                <li key={c.href}>
                  <a className={a} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                    {c.label} ↗
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-paper/70">Portfolio and contact links coming soon.</p>
          )}
        </section>

        <p className="mt-12 font-mono text-[10px] leading-relaxed tracking-wide text-paper/60">
          {SITE.disclaimer} All film and series titles are trademarks of their respective owners and are referenced for
          informational purposes only. <Link className={a} href="/">Back to the map</Link>.
        </p>
      </div>
    </PageShell>
  );
}
