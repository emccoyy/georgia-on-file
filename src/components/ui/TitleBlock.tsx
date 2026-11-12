/**
 * Architectural-drawing title block. On small screens it collapses to just the
 * disclaimer line.
 */
export function TitleBlock({ locations, productions }: { locations: number; productions: number }) {
  const disclaimer =
    "Unofficial fan project. Not affiliated with any studio, network or the Georgia Film Office. Public places only.";
  const cell = "border-line/30 px-2.5 py-1.5";
  const label = "block text-[8px] tracking-[0.25em] text-line/60";
  return (
    <div className="font-mono uppercase">
      <p className="max-w-md text-[10px] leading-snug tracking-wide text-paper/55 normal-case sm:hidden">{disclaimer}</p>
      <div className="hidden w-[23rem] border border-line/40 bg-ink/70 text-[11px] tracking-[0.12em] text-paper backdrop-blur-sm sm:block">
        <div className={`flex items-end justify-between border-b ${cell}`}>
          <div>
            <span className={label}>Project</span>
            <span className="font-display text-xl leading-none tracking-wider">Georgia on Film</span>
          </div>
          <div className="text-right">
            <span className={label}>Sheet</span>
            01 / 01
          </div>
        </div>
        <div className="grid grid-cols-3">
          <div className={`border-r ${cell}`}>
            <span className={label}>Locations</span>
            {locations}
          </div>
          <div className={`border-r ${cell}`}>
            <span className={label}>Productions</span>
            {productions}
          </div>
          <div className={cell}>
            <span className={label}>Datum</span>
            WGS 84
          </div>
        </div>
        <p className={`border-t text-[9px] leading-snug tracking-wide text-paper/55 normal-case ${cell}`}>{disclaimer}</p>
      </div>
    </div>
  );
}
