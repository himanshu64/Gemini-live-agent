"use client";
import { MODES, MODE_LABELS, MODE_ICONS, MODE_DESCRIPTIONS, type Mode } from "@/lib/constants";
import { vibrate } from "@/lib/haptics";

const MODE_STYLES: Record<Mode, { active: string; inactive: string }> = {
  navigation: {
    active: "bg-blue-500/20 border-blue-500/50 text-blue-400",
    inactive: "bg-card/50 border-border text-muted-foreground hover:border-blue-500/30",
  },
  reading: {
    active: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
    inactive: "bg-card/50 border-border text-muted-foreground hover:border-emerald-500/30",
  },
  shopping: {
    active: "bg-amber-500/20 border-amber-500/50 text-amber-400",
    inactive: "bg-card/50 border-border text-muted-foreground hover:border-amber-500/30",
  },
  social: {
    active: "bg-purple-500/20 border-purple-500/50 text-purple-400",
    inactive: "bg-card/50 border-border text-muted-foreground hover:border-purple-500/30",
  },
  screen: {
    active: "bg-violet-500/20 border-violet-500/50 text-violet-400",
    inactive: "bg-card/50 border-border text-muted-foreground hover:border-violet-500/30",
  },
  story: {
    active: "bg-rose-500/20 border-rose-500/50 text-rose-400",
    inactive: "bg-card/50 border-border text-muted-foreground hover:border-rose-500/30",
  },
};

interface Props {
  currentMode: Mode;
  onModeChange: (mode: Mode) => void;
}

export default function ModeSelector({ currentMode, onModeChange }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-label="Assistant mode">
      {MODES.map((mode) => {
        const isActive = currentMode === mode;
        const style = MODE_STYLES[mode];
        return (
          <button
            key={mode}
            role="radio"
            aria-checked={isActive}
            aria-label={`${MODE_LABELS[mode]} mode`}
            onClick={() => {
              vibrate("modeSwitch");
              onModeChange(mode);
            }}
            className={`flex flex-col items-center justify-center gap-1.5 rounded-2xl border backdrop-blur-sm p-4 transition-all duration-200 ease-in-out ${
              isActive ? style.active : style.inactive
            }`}
          >
            <span className="text-2xl" aria-hidden="true">{MODE_ICONS[mode]}</span>
            <span className="text-sm font-medium">{MODE_LABELS[mode]}</span>
            <span className="text-[10px] opacity-70">{MODE_DESCRIPTIONS[mode]}</span>
          </button>
        );
      })}
    </div>
  );
}
