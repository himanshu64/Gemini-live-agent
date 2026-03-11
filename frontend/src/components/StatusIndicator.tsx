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
        label: connectionState === "connecting" ? "Connecting..." : "Disconnected",
        color: connectionState === "connecting" ? "bg-yellow-500" : "bg-red-500",
        pulse: connectionState === "connecting",
      };
    }
    if (isSpeaking) {
      return { label: "Speaking", color: "bg-green-500", pulse: true };
    }
    if (isListening) {
      return { label: "Listening", color: "bg-blue-500", pulse: true };
    }
    return { label: "Ready", color: "bg-green-500", pulse: false };
  };

  const { label, color, pulse } = getStatusInfo();

  return (
    <div className="flex items-center gap-3 px-4 py-3" role="status" aria-live="polite">
      <span className="relative flex h-4 w-4">
        {pulse && (
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${color}`}
          />
        )}
        <span className={`relative inline-flex h-4 w-4 rounded-full ${color}`} />
      </span>
      <span className="text-lg font-medium text-white">{label}</span>
    </div>
  );
}
