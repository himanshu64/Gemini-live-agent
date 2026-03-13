"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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

  // Announce app loaded on first visit
  useEffect(() => {
    if (hasAnnouncedRef.current) return;
    hasAnnouncedRef.current = true;
    // Short delay so voices are loaded
    const t = setTimeout(() => {
      speak(
        "SightLine ready. Tap anywhere on the screen, then tap the Start button at the bottom to begin. " +
        "The app will ask for camera and microphone permission."
      );
    }, 800);
    return () => clearTimeout(t);
  }, []);

  const { isPlaying, play: playAudio, stopAll: stopAudioPlayback } = useAudioPlayback();

  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "audio":
          stopSpeaking(); // stop TTS when agent speaks
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
          if (msg.status === "listening") {
            setIsListening(true);
          } else if (msg.status === "processing") {
            setIsListening(false);
          }
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

  const { connectionState, connect, disconnect, send } = useWebSocket(handleMessage);

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

    // Step 1: Request permissions FIRST with audio guidance
    speak("Requesting camera and microphone access. Please allow when prompted.");

    try {
      // Pre-request permissions so the user gets the browser dialog
      // before we try to connect to the server
      const camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      // Release the test streams immediately
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

  return (
    <main className="flex min-h-dvh flex-col">
      {/* Hidden video element for camera — fully invisible */}
      <video ref={videoRef} className="sr-only-video" playsInline muted aria-hidden="true" />

      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h1 className="text-2xl font-bold text-white">SightLine</h1>
        <StatusIndicator
          connectionState={connectionState}
          isListening={isListening}
          isSpeaking={isPlaying}
        />
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col justify-between p-4 gap-4">
        {/* Transcript / error area */}
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

        {/* Mode selector */}
        <ModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

        {/* Bottom controls */}
        <div className="flex flex-col gap-3">
          {/* Start/Stop button */}
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

          {/* Emergency button */}
          <EmergencyButton onEmergency={handleEmergency} />
        </div>
      </div>
    </main>
  );
}
