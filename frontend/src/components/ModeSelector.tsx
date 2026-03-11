"use client";
import { MODES, MODE_LABELS, MODE_COLORS, MODE_ICONS, type Mode } from "@/lib/constants";

interface Props {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({ currentMode, onModeChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-3 p-4" role="radiogroup" aria-label="Assistant mode">
      {MODES.map((mode) => (
        <button
          key={mode}
          role="radio"
          aria-checked={currentMode === mode}
          aria-label={`${MODE_LABELS[mode]} mode`}
          onClick={() => onModeChange(mode)}
          className={`flex flex-col items-center justify-center gap-2 rounded-2xl p-4 text-white transition-all min-h-[80px] ${
            MODE_COLORS[mode]
          } ${
            currentMode === mode
              ? "ring-4 ring-white ring-offset-2 ring-offset-gray-900 scale-105"
              : "opacity-70"
          }`}
        >
          <span className="text-3xl" aria-hidden="true">
            {MODE_ICONS[mode]}
          </span>
          <span className="text-lg font-bold">{MODE_LABELS[mode]}</span>
        </button>
      ))}
    </div>
  );
}
