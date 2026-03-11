"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTURE_FPS, JPEG_QUALITY } from "@/lib/constants";

export function useCamera(onFrame: (base64: string) => void) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isActive, setIsActive] = useState(false);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Create offscreen canvas for frame capture
      if (!canvasRef.current) {
        canvasRef.current = document.createElement("canvas");
      }

      intervalRef.current = setInterval(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
        const base64 = dataUrl.split(",")[1];
        onFrameRef.current(base64);
      }, 1000 / CAPTURE_FPS);

      setIsActive(true);
    } catch (err) {
      console.error("Camera access denied:", err);
    }
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, isActive, start, stop };
}
