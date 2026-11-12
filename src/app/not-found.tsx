import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";

export default function NotFound() {
  return (
    <PageShell>
      <div className="grid min-h-[50dvh] place-items-center text-center">
        <div>
          <p className="font-mono text-[10px] tracking-[0.3em] text-accent uppercase">{"// Error 404"}</p>
          <h1 className="mt-2 font-display text-7xl leading-[0.85] tracking-wide">Off the map</h1>
          <p className="mt-4 text-sm text-paper/75">That page doesn&apos;t exist, or the location has moved.</p>
          <Link
            href="/"
            className="mt-6 inline-block border border-accent/60 bg-accent/10 px-4 py-2 font-mono text-[11px] tracking-[0.2em] text-accent uppercase hover:bg-accent/20"
          >
            Back to the map
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
