"use client";
import { useEffect, useRef } from "react";

interface Props {
  stream: MediaStream | null;
  visible: boolean;
  videoDisabled?: boolean;
}

export default function CameraPreview({ stream, visible, videoDisabled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  if (!visible) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-border bg-black aspect-video"
      role="img"
      aria-label={videoDisabled ? "Camera preview: video paused" : "Camera preview: showing what SightLine sees"}
    >
      {stream && !videoDisabled ? (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 px-2 py-0.5 rounded text-white/70">
            What SightLine sees
          </div>
        </>
      ) : (
        <p className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
          {videoDisabled ? "Video paused" : "Camera off"}
        </p>
      )}
    </div>
  );
}
