import { TYPE_COLORS } from "@/lib/map/config";
import { productions } from "@/data";

/** Production-type color key. Only shows types present in the dataset. */
export function Legend() {
  const present = new Set(productions.map((p) => p.type));
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] tracking-wider text-paper/70 uppercase" aria-label="Pin colors">
      {Object.entries(TYPE_COLORS)
        .filter(([t]) => present.has(t as keyof typeof TYPE_COLORS))
        .map(([type, color]) => (
          <li key={type} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} aria-hidden />
            {type}
          </li>
        ))}
    </ul>
  );
}
