"use client";

interface Props {
  latency: number;
  isConnected: boolean;
}

export default function ConnectionQuality({ latency, isConnected }: Props) {
  if (!isConnected) return null;

  const bars = latency < 0 ? 0 : latency < 150 ? 4 : latency < 300 ? 3 : latency < 600 ? 2 : 1;
  const color = bars >= 3 ? "bg-emerald-400" : bars === 2 ? "bg-amber-400" : "bg-red-400";
  const label = latency < 0 ? "Measuring..." : `${latency}ms`;

  return (
    <div className="flex items-end gap-0.5 h-4" role="status" aria-label={`Connection quality: ${label}`}>
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`w-1 rounded-full transition-all duration-200 ${
            level <= bars ? color : "bg-muted-foreground/20"
          }`}
          style={{ height: `${level * 25}%` }}
        />
      ))}
      <span className="text-[9px] text-muted-foreground/50 ml-0.5">{label}</span>
    </div>
  );
}
