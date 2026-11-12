"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/site";

/** Mono text nav. `compact` drops the Map link (used on the map itself). */
export function SiteNav({ compact = false, className = "" }: { compact?: boolean; className?: string }) {
  const path = usePathname();
  return (
    <nav aria-label="Site" className={className}>
      <ul className="flex gap-4 font-mono text-[10px] tracking-[0.25em] uppercase sm:gap-5">
        {NAV.filter((n) => !compact || n.href !== "/").map((n) => {
          const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`pointer-events-auto hover:text-accent focus-visible:outline-2 focus-visible:outline-accent ${active ? "text-accent" : "text-line"}`}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
