"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket, type WSMessage } from "@/hooks/useWebSocket";
import { useCamera } from "@/hooks/useCamera";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { speak, stopSpeaking } from "@/lib/speak";
import StatusIndicator from "@/components/StatusIndicator";
import ModeSelector from "@/components/ModeSelector";
import EmergencyButton from "@/components/EmergencyButton";
import type { Mode } from "@/lib/constants";

export default function Home() {
  const [currentMode, setCurrentMode] = useState<Mode>("navigation");
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [startError, setStartError] = useState("");
  const isSpeakingRef = useRef(false);
  const hasAnnouncedRef = useRef(false);

  const { uid, isAnonymous, loading: authLoading, getToken, signInWithGoogle } = useAuth();

  // Announce app loaded on first visit
  useEffect(() => {
    if (hasAnnouncedRef.current || authLoading) return;
    hasAnnouncedRef.current = true;
    const t = setTimeout(() => {
      speak(
        "SightLine ready. Tap anywhere on the screen, then tap the Start button at the bottom to begin. " +
        "The app will ask for camera and microphone permission."
      );
    }, 800);
    return () => clearTimeout(t);
  }, [authLoading]);

  const { isPlaying, play: playAudio, stopAll: stopAudioPlayback } = useAudioPlayback();

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "audio":
          stopSpeaking();
          isSpeakingRef.current = true;
          playAudio(msg.data);
          break;
        case "transcript":
          setTranscript(msg.text);
          break;
        case "interrupted":
          stopAudioPlayback();
          isSpeakingRef.current = false;
          break;
        case "status":
          if (msg.status === "listening") setIsListening(true);
          else if (msg.status === "processing") setIsListening(false);
          break;
        case "usage_warning":
          speak(`You have ${msg.minutes_remaining} minutes remaining today.`);
          break;
        case "error":
          console.error("[Agent Error]", msg.message);
          setTranscript(`Error: ${msg.message}`);
          speak(`Error: ${msg.message}`);
          break;
      }
    },
    [playAudio, stopAudioPlayback]
  );

  const { connectionState, connect, disconnect, send, setTokenProvider } = useWebSocket(handleMessage);

  // Wire up Firebase token provider
  useEffect(() => {
    if (uid) {
      setTokenProvider(getToken);
    }
  }, [uid, getToken, setTokenProvider]);

  const handleAudioChunk = useCallback(
    (base64: string) => {
      if (!isPlaying) {
        send({ type: "audio", data: base64 });
      }
    },
    [send, isPlaying]
  );

  const handleVideoFrame = useCallback(
    (base64: string) => {
      send({ type: "video", data: base64 });
    },
    [send]
  );

  const { videoRef, isActive: cameraActive, start: startCamera, stop: stopCamera } = useCamera(handleVideoFrame);
  const { isActive: micActive, start: startMic, stop: stopMic } = useMicrophone(handleAudioChunk);

  const handleStart = useCallback(async () => {
    setStartError("");
    stopSpeaking();

    speak("Requesting camera and microphone access. Please allow when prompted.");

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      camStream.getTracks().forEach((t) => t.stop());
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera and microphone permission denied. Please go to your browser settings, allow camera and microphone for this site, then try again."
          : err instanceof DOMException && err.name === "AbortError"
          ? "Camera timed out. Please close other apps using the camera and try again."
          : `Permission error: ${err instanceof Error ? err.message : err}`;
      setStartError(msg);
      speak(msg);
      console.error("Permission error:", err);
      return;
    }

    speak("Permissions granted. Connecting to assistant.");

    try {
      await connect();
      speak("Connected. Starting camera and microphone.");
      await startCamera();
      await startMic();
      setIsListening(true);
      speak("SightLine is active. Point your camera and speak.");
    } catch (err) {
      const msg = `Failed to connect: ${err instanceof Error ? err.message : err}`;
      setStartError(msg);
      speak(msg);
      console.error("Start error:", err);
    }
  }, [connect, startCamera, startMic]);

  const handleStop = useCallback(() => {
    stopMic();
    stopCamera();
    disconnect();
    stopAudioPlayback();
    stopSpeaking();
    setIsListening(false);
    setTranscript("");
    setStartError("");
    speak("SightLine stopped.");
  }, [stopMic, stopCamera, disconnect, stopAudioPlayback]);

  const handleModeChange = useCallback(
    (mode: Mode) => {
      setCurrentMode(mode);
      send({ type: "mode", mode });
      speak(`Switched to ${mode} mode.`);
    },
    [send]
  );

  const handleEmergency = useCallback(() => {
    send({ type: "mode", mode: "emergency" });
    speak("Emergency alert sent.");
  }, [send]);

  const isRunning = connectionState === "connected" && cameraActive && micActive;

  if (authLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <p className="text-xl text-gray-400">Loading SightLine...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <video ref={videoRef} className="sr-only-video" playsInline muted aria-hidden="true" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h1 className="text-2xl font-bold text-white">SightLine</h1>
        <div className="flex items-center gap-2">
          {isAnonymous && (
            <button
              onClick={signInWithGoogle}
              className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 min-h-[44px] min-w-[44px]"
              aria-label="Sign in with Google to save your preferences"
            >
              Sign in
            </button>
          )}
          <StatusIndicator
            connectionState={connectionState}
            isListening={isListening}
            isSpeaking={isPlaying}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col justify-between p-4 gap-4">
        <div
          className="rounded-2xl bg-gray-900 p-4 min-h-[120px] border border-gray-800"
          role="log"
          aria-live="assertive"
          aria-label="Assistant transcript"
        >
          <p className="text-lg text-gray-300">
            {startError
              ? startError
              : transcript || (isRunning ? "Listening... speak or point your camera" : "Tap Start to begin")}
          </p>
        </div>

        <ModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

        <div className="flex flex-col gap-3">
          <button
            onClick={isRunning ? handleStop : handleStart}
            className={`w-full rounded-2xl px-6 py-5 text-2xl font-bold text-white transition-colors ${
              isRunning
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            aria-label={isRunning ? "Stop assistant" : "Start assistant"}
          >
            {isRunning ? "Stop" : "Start"}
          </button>

          <EmergencyButton onEmergency={handleEmergency} />
        </div>
      </div>
    </main>
  );
}
