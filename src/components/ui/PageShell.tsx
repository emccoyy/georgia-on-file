import Link from "next/link";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import { SiteNav } from "./SiteNav";

/** Layout for the non-map pages: header with wordmark + nav, content, footer. */
export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-ink text-paper">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line/20 px-5 py-5 sm:px-10">
        <Link href="/" className="font-display text-2xl leading-none tracking-wide hover:text-accent focus-visible:outline-2 focus-visible:outline-accent">
          Georgia <span className="text-accent">on</span> Film
        </Link>
        <SiteNav />
      </header>
      <main id="main" className="px-5 py-10 sm:px-10">
        {children}
      </main>
      <footer className="border-t border-line/20 px-5 py-5 font-mono text-[10px] leading-relaxed tracking-wide text-paper/60 sm:px-10">
        {SITE.disclaimer} Designed and built by {SITE.author}.
      </footer>
    </div>
  );
}
