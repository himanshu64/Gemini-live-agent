"use client";
import { useCallback, useEffect, useRef, useState } from "react";

function getSupportedMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) return "video/webm;codecs=vp9";
  if (MediaRecorder.isTypeSupported("video/webm")) return "video/webm";
  return "";
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  // Delay revocation to give the browser time to initiate the download
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function useVideoRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const isSupported =
    typeof window !== "undefined" && typeof MediaRecorder !== "undefined";

  const startRecording = useCallback(async (videoStream: MediaStream) => {
    if (!isSupported) return;
    // Prevent starting a new recording while one is already active
    if (recorderRef.current && recorderRef.current.state !== "inactive") return;

    const mimeType = getSupportedMimeType();
    if (!mimeType) return;

    const chunks: Blob[] = [];

    // Capture audioStream locally so the onstop closure references the correct
    // instance even if another recording starts before this one's onstop fires.
    let localAudioStream: MediaStream | null = null;
    let combinedStream: MediaStream;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localAudioStream = audioStream;
      audioStreamRef.current = audioStream;
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioStream.getAudioTracks(),
      ]);
    } catch {
      // If audio permission is denied or unavailable, record video only
      combinedStream = videoStream;
    }

    const options: MediaRecorderOptions = { mimeType, videoBitsPerSecond: 2_500_000 };
    const recorder = new MediaRecorder(combinedStream, options);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "video/webm" });
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "");
      triggerDownload(blob, `sightline-session-${timestamp}.webm`);

      // Use the locally-captured audio stream so we don't accidentally stop a
      // stream that belongs to a subsequent recording.
      localAudioStream?.getTracks().forEach((t) => t.stop());
      localAudioStream = null;
      setIsRecording(false);
    };

    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop();
      }
      recorderRef.current = null;
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    };
  }, []);

  return { startRecording, stopRecording, isRecording, isSupported };
}
