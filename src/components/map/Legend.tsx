import { TYPE_COLORS } from "@/lib/map/config";
import { productions } from "@/data";

/** Production-type color key. Only shows types present in the dataset. */
export function Legend() {
  const present = new Set(productions.map((p) => p.type));
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.15em] text-line uppercase" aria-label="Pin colors">
      {Object.entries(TYPE_COLORS)
        .filter(([t]) => present.has(t as keyof typeof TYPE_COLORS))
        .map(([type, color]) => (
          <li key={type} className="flex items-center gap-1.5">
            <span className="grid size-2.5 place-items-center rounded-full border" style={{ borderColor: color }} aria-hidden>
              <span className="size-1 rounded-full" style={{ background: color }} />
            </span>
            {type}
          </li>
        ))}
    </ul>
  );
}
