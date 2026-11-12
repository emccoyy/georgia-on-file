"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Bar } from "@/lib/stats";

/* Chart conventions (see the dataviz method): thin marks, 4px rounded data-end
   anchored to the baseline, 2px gaps, recessive axis, one hue for a single
   series, identity in text (never color alone), hover detail, table view. */

const ACCENT = "#5ce1ff";

function TableView({ data, valueLabel }: { data: Bar[]; valueLabel: string }) {
  return (
    <details className="mt-4 font-mono text-[10px] tracking-wider text-line">
      <summary className="cursor-pointer uppercase hover:text-accent">View as table</summary>
      <table className="mt-2 w-full text-left">
        <thead>
          <tr className="text-line/80 uppercase">
            <th className="py-1 font-normal">Item</th>
            <th className="py-1 text-right font-normal">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.key} className="border-t border-line/15 text-paper/85">
              <td className="py-1">{d.label}</td>
              <td className="py-1 text-right tabular-nums">{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** Vertical columns for an ordered category (decades). Max column directly labeled; others on hover. */
export function ColumnChart({ data, valueLabel, height = 220 }: { data: Bar[]; valueLabel: string; height?: number }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);
  const ticks = [0, Math.round(max / 2), max];
  const active = data.find((d) => d.key === hover);
  return (
    <div>
      <div className="relative" style={{ height }}>
        {/* Recessive gridlines */}
        {ticks.map((t) => (
          <div key={t} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(t / max) * 100}%` }} aria-hidden>
            <span className="w-5 text-right font-mono text-[10px] text-line/80 tabular-nums">{t}</span>
            <span className="h-px flex-1 bg-line/15" />
          </div>
        ))}
        <div className="absolute top-0 right-0 bottom-0 left-7 flex items-end gap-[2px]" role="list" aria-label={`${valueLabel} by decade`}>
          {data.map((d, i) => (
            <div
              key={d.key}
              role="listitem"
              aria-label={`${d.label}: ${d.value} ${valueLabel}`}
              tabIndex={0}
              className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
              onMouseEnter={() => setHover(d.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(d.key)}
              onBlur={() => setHover(null)}
            >
              <motion.div
                className="w-full max-w-11 rounded-t-[4px] group-focus-visible:outline-2 group-focus-visible:outline-accent"
                style={{ background: ACCENT, opacity: hover && hover !== d.key ? 0.45 : 1 }}
                initial={{ height: 0 }}
                whileInView={{ height: `${(d.value / max) * 100}%` }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: reduce ? 0 : 0.8, delay: reduce ? 0 : i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              />
              {d.value === max && !hover && (
                <span className="absolute font-mono text-[10px] text-paper tabular-nums" style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}>
                  {d.value}
                </span>
              )}
            </div>
          ))}
        </div>
        {active && (
          <div className="pointer-events-none absolute top-0 right-0 max-w-64 border border-line/40 bg-ink/95 px-3 py-2 text-left" role="status">
            <p className="font-mono text-[10px] tracking-widest text-line uppercase">{active.label}</p>
            <p className="font-display text-2xl leading-none text-paper">
              {active.value} <span className="font-mono text-[10px] tracking-widest text-line uppercase">{valueLabel}</span>
            </p>
            {active.detail && <p className="mt-1 text-xs text-paper/75">{active.detail}</p>}
          </div>
        )}
      </div>
      <div className="mt-2 ml-7 flex gap-[2px]" aria-hidden>
        {data.map((d) => (
          <span key={d.key} className="flex-1 text-center font-mono text-[10px] tracking-wider text-line">
            {d.label}
          </span>
        ))}
      </div>
      <TableView data={data} valueLabel={valueLabel} />
    </div>
  );
}

/** Ranked horizontal "meter list": name, bar, figure per row. Rows link into the map. */
export function MeterList({ data, valueLabel, total }: { data: Bar[]; valueLabel: string; total?: number }) {
  const reduce = useReducedMotion();
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div>
      <ol className="flex flex-col gap-2.5">
        {data.map((d, i) => {
          const row = (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 text-sm text-paper">
                  {d.color && <span className="size-2 shrink-0 rounded-full" style={{ background: d.color }} aria-hidden />}
                  <span className="truncate group-hover:text-accent">{d.label}</span>
                  {d.detail && <span className="hidden font-mono text-[10px] tracking-widest text-line uppercase sm:inline">{d.detail}</span>}
                </span>
                <span className="shrink-0 font-mono text-[11px] text-paper/85 tabular-nums">
                  {d.value}
                  {total ? <span className="text-line"> · {Math.round((d.value / total) * 100)}%</span> : null}
                </span>
              </div>
              <div className="mt-1 h-1.5 bg-line/10" aria-hidden>
                <motion.div
                  className="h-full rounded-r-[4px]"
                  style={{ background: d.color ?? ACCENT }}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(d.value / max) * 100}%` }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: reduce ? 0 : 0.7, delay: reduce ? 0 : i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </>
          );
          return (
            <li key={d.key} aria-label={`${d.label}: ${d.value} ${valueLabel}`}>
              {d.href ? (
                <Link href={d.href} className="group block focus-visible:outline-2 focus-visible:outline-accent" title={`Show on the map`}>
                  {row}
                </Link>
              ) : (
                <div className="group">{row}</div>
              )}
            </li>
          );
        })}
      </ol>
      <TableView data={data} valueLabel={valueLabel} />
    </div>
  );
}
