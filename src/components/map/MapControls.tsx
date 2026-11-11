"use client";

import type { ReactNode } from "react";

type Props = {
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
      className="grid size-10 place-items-center text-paper/80 transition-colors hover:bg-white/10 hover:text-amber focus-visible:bg-white/10 focus-visible:text-amber focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-amber"
    >
      {children}
    </button>
  );
}

const Group = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col divide-y divide-white/10 overflow-hidden rounded-lg border border-white/10 bg-ink/75 shadow-lg backdrop-blur-md">
    {children}
  </div>
);

export function MapControls({ is3D, bearing, onZoomIn, onZoomOut, onResetNorth, onReset, onToggle3D }: Props) {
  return (
    <div className="absolute right-4 bottom-24 z-10 flex flex-col gap-3 sm:right-6 sm:bottom-16">
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
            <path d="M12 3l3.5 9h-7z" fill="#F5A524" />
            <path d="M12 21l-3.5-9h7z" fill="currentColor" opacity=".45" />
          </svg>
        </Btn>
      </Group>
      <Group>
        <Btn label={is3D ? "Switch to 2D view" : "Switch to 3D view"} onClick={onToggle3D} pressed={is3D}>
          <span className="font-display text-sm tracking-wider">{is3D ? "2D" : "3D"}</span>
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
