"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTURE_FPS, JPEG_QUALITY, CAPTURE_FPS_LOW, JPEG_QUALITY_LOW } from "@/lib/constants";

export interface CameraOptions {
  facingMode?: "user" | "environment";
  lowPower?: boolean;
}

export function useCamera(onFrame: (base64: string) => void, options?: CameraOptions) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [facing, setFacing] = useState<"user" | "environment">(options?.facingMode ?? "environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const onFrameRef = useRef(onFrame);
  const facingRef = useRef(facing);
  const lowPowerRef = useRef(options?.lowPower ?? false);

  useEffect(() => { onFrameRef.current = onFrame; }, [onFrame]);
  useEffect(() => { facingRef.current = facing; }, [facing]);
  useEffect(() => { lowPowerRef.current = options?.lowPower ?? false; }, [options?.lowPower]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
    setTorchOn(false);
  }, []);

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingRef.current },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      streamRef.current = stream;

      // Check torch support
      const track = stream.getVideoTracks()[0];
      if (track) {
        const caps = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps?.torch);
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      const fps = lowPowerRef.current ? CAPTURE_FPS_LOW : CAPTURE_FPS;
      const quality = lowPowerRef.current ? JPEG_QUALITY_LOW : JPEG_QUALITY;

      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const base64 = dataUrl.split(",")[1];
        onFrameRef.current(base64);
      }, 1000 / fps);

      setIsActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  }, []);

  const flip = useCallback(async () => {
    stop();
    const newFacing = facingRef.current === "user" ? "environment" : "user";
    setFacing(newFacing);
    facingRef.current = newFacing;
    // Restart with new facing
    setTimeout(() => start(), 100);
  }, [stop, start]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const newVal = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newVal } as MediaTrackConstraintSet] });
      setTorchOn(newVal);
    } catch {
      // Torch not supported on this device/browser
    }
  }, [torchOn]);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return {
    videoRef,
    streamRef,
    isActive,
    start,
    stop,
    flip,
    facing,
    torchSupported,
    torchOn,
    toggleTorch,
  };
}
