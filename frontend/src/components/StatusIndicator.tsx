"use client";

type Status = "disconnected" | "connecting" | "connected";

interface Props {
  connectionState: Status;
  isListening: boolean;
  isSpeaking: boolean;
}

export default function StatusIndicator({ connectionState, isListening, isSpeaking }: Props) {
  const getStatusInfo = () => {
    if (connectionState !== "connected") {
      return {
        label: connectionState === "connecting" ? "Connecting" : "Offline",
        color: connectionState === "connecting" ? "bg-amber-400" : "bg-red-400",
        pulse: connectionState === "connecting",
      };
    }
    if (isSpeaking) return { label: "Speaking", color: "bg-green-400", pulse: true };
    if (isListening) return { label: "Listening", color: "bg-blue-400", pulse: true };
    return { label: "Ready", color: "bg-green-400", pulse: false };
  };

  const { label, color, pulse } = getStatusInfo();

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-border bg-card/50 backdrop-blur-sm px-3 py-1.5"
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
}
