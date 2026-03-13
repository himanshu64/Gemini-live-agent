"use client";

interface Props {
  isActive: boolean;
  facing: "user" | "environment";
  torchSupported: boolean;
  torchOn: boolean;
  showPreview: boolean;
  lowPower: boolean;
  videoDisabled: boolean;
  audioMuted: boolean;
  onFlip: () => void;
  onToggleTorch: () => void;
  onTogglePreview: () => void;
  onToggleLowPower: () => void;
  onToggleVideo: () => void;
  onToggleMute: () => void;
}

export default function CameraControls({
  isActive,
  facing,
  torchSupported,
  torchOn,
  showPreview,
  lowPower,
  videoDisabled,
  audioMuted,
  onFlip,
  onToggleTorch,
  onTogglePreview,
  onToggleLowPower,
  onToggleVideo,
  onToggleMute,
}: Props) {
  if (!isActive) return null;

  const btnBase =
    "flex items-center justify-center min-w-[48px] min-h-[48px] rounded-xl text-sm font-medium transition-all duration-150";
  const btnOff = "bg-secondary/50 text-secondary-foreground/70 hover:bg-secondary/80";
  const btnOn = "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40";
  const btnDanger = "bg-red-500/20 text-red-300 ring-1 ring-red-500/40";

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap" role="toolbar" aria-label="Camera controls">
      <button
        onClick={onFlip}
        className={`${btnBase} ${btnOff}`}
        aria-label={`Flip camera (currently ${facing === "user" ? "front" : "rear"})`}
      >
        🔄
      </button>

      {torchSupported && (
        <button
          onClick={onToggleTorch}
          className={`${btnBase} ${torchOn ? btnOn : btnOff}`}
          aria-label={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
        >
          🔦
        </button>
      )}

      <button
        onClick={onTogglePreview}
        className={`${btnBase} ${showPreview ? btnOn : btnOff}`}
        aria-label={showPreview ? "Hide camera preview" : "Show camera preview"}
      >
        👁
      </button>

      <button
        onClick={onToggleVideo}
        className={`${btnBase} ${videoDisabled ? btnDanger : btnOff}`}
        aria-label={videoDisabled ? "Enable video" : "Disable video"}
        aria-pressed={videoDisabled}
      >
        {videoDisabled ? "📵" : "📹"}
      </button>

      <button
        onClick={onToggleMute}
        className={`${btnBase} ${audioMuted ? btnDanger : btnOff}`}
        aria-label={audioMuted ? "Unmute audio" : "Mute audio"}
        aria-pressed={audioMuted}
      >
        {audioMuted ? "🔇" : "🔊"}
      </button>

      <button
        onClick={onToggleLowPower}
        className={`${btnBase} ${lowPower ? btnOn : btnOff}`}
        aria-label={lowPower ? "Disable low power mode" : "Enable low power mode"}
      >
        🔋
      </button>
    </div>
  );
}
