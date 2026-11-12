"use client";

import type { ReactNode } from "react";

type Props = {
  /** Smaller placement for embedded maps. */
  compact?: boolean;
  is3D: boolean;
  bearing: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetNorth: () => void;
  onReset: () => void;
  onToggle3D: () => void;
};

function Btn({ label, onClick, children, pressed }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center text-line transition-colors hover:bg-accent/10 hover:text-accent focus-visible:bg-accent/10 focus-visible:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
    >
      {children}
    </button>
  );
}

const Group = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col divide-y divide-line/30 border border-line/40 bg-ink/75 backdrop-blur-md">
    {children}
  </div>
);

export function MapControls({ compact, is3D, bearing, onZoomIn, onZoomOut, onResetNorth, onReset, onToggle3D }: Props) {
  return (
    <div
      className={
        compact
          ? "absolute right-3 bottom-3 z-10 flex flex-col gap-2"
          : // Slides left of the location panel while it's open (desktop).
            "absolute right-5 bottom-28 z-10 flex flex-col gap-3 transition-[right] duration-300 sm:right-10 sm:bottom-48 md:group-data-[panel=open]:right-[452px]"
      }
    >
      <Group>
        <Btn label="Zoom in" onClick={onZoomIn}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Btn>
        <Btn label="Zoom out" onClick={onZoomOut}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M5 12h14" />
          </svg>
        </Btn>
        <Btn label="Reset bearing to north" onClick={onResetNorth}>
          <svg
            viewBox="0 0 24 24"
            className="size-5 transition-transform"
            style={{ transform: `rotate(${-bearing}deg)` }}
            aria-hidden
          >
            <path d="M12 3l3.5 9h-7z" fill="#5CE1FF" />
            <path d="M12 21l-3.5-9h7z" fill="currentColor" opacity=".45" />
          </svg>
        </Btn>
      </Group>
      <Group>
        <Btn label={is3D ? "Switch to 2D view" : "Switch to 3D view"} onClick={onToggle3D} pressed={is3D}>
          <span className="font-mono text-[11px] tracking-wider">{is3D ? "2D" : "3D"}</span>
        </Btn>
        <Btn label="Reset view" onClick={onReset}>
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
            <path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" />
          </svg>
        </Btn>
      </Group>
    </div>
  );
}
