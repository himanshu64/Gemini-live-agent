"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthContext } from "@/lib/auth/auth-provider";
import { useWebSocket, type WSMessage } from "@/hooks/useWebSocket";
import { useCamera } from "@/hooks/useCamera";
import { useScreenShare } from "@/hooks/useScreenShare";
import { useMicrophone } from "@/hooks/useMicrophone";
import { useAudioPlayback } from "@/hooks/useAudioPlayback";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTurnstile } from "@/hooks/useTurnstile";
import { useVideoRecorder } from "@/hooks/useVideoRecorder";
import { speak, stopSpeaking } from "@/lib/speak";
import { vibrate } from "@/lib/haptics";
import { soundConnected, soundDisconnected, soundModeChange, soundError, soundReconnecting, soundNotification } from "@/lib/sounds";
import { exportAsText } from "@/lib/exportTranscript";
import { MODES, type Mode } from "@/lib/constants";
import StatusIndicator from "@/components/StatusIndicator";
import ModeSelector from "@/components/ModeSelector";
import EmergencyButton from "@/components/EmergencyButton";
import AudioVisualizer from "@/components/AudioVisualizer";
import ConversationLog, { type ConversationEntry } from "@/components/ConversationLog";
import QuickActions from "@/components/QuickActions";
import OnboardingModal from "@/components/OnboardingModal";
import CameraPreview from "@/components/CameraPreview";
import CameraControls from "@/components/CameraControls";
import ConnectionQuality from "@/components/ConnectionQuality";
import { useToast } from "@/components/ToastProvider";
import Link from "next/link";


let entryCounter = 0;
function makeEntry(role: ConversationEntry["role"], text: string): ConversationEntry {
  return { id: `${++entryCounter}`, role, text, timestamp: Date.now() };
}

export default function Home() {
  const [currentMode, setCurrentMode] = useState<Mode>("navigation");
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [startError, setStartError] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [lowPowerMode, setLowPowerMode] = useState(false);
  const [videoDisabled, setVideoDisabled] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [inputSource, setInputSource] = useState<"camera" | "screen">("camera");
  const [recordSession, setRecordSession] = useState(false);
  const isSpeakingRef = useRef(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const hasAnnouncedRef = useRef(false);
  const audioMutedRef = useRef(false);
  const videoDisabledRef = useRef(false);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const { containerRef: turnstileRef, verify: verifyCaptcha } = useTurnstile();

  const { user, loading: authLoading, getToken, logout } = useAuthContext();
  const uid = user?.id;

  // Keep refs in sync with state
  useEffect(() => { audioMutedRef.current = audioMuted; }, [audioMuted]);
  useEffect(() => { videoDisabledRef.current = videoDisabled; }, [videoDisabled]);

  // Welcome announcement (only once)
  useEffect(() => {
    if (hasAnnouncedRef.current || authLoading || !uid) return;
    hasAnnouncedRef.current = true;
    const t = setTimeout(() => {
      speak(
        "SightLine ready. Tap Start to begin, or swipe left and right to change modes. Keyboard shortcuts: Escape to stop, M to switch mode, E for emergency."
      );
    }, 800);
    return () => clearTimeout(t);
  }, [authLoading, uid]);

  const { isPlaying, play: playAudio, stopAll: stopAudioPlayback } = useAudioPlayback();

  // --- Message handler ---
  const handleMessage = useCallback(
    (msg: WSMessage) => {
      switch (msg.type) {
        case "audio":
          if (audioMutedRef.current) return;
          stopSpeaking();
          isSpeakingRef.current = true;
          playAudio(msg.data);
          break;
        case "transcript":
          setConversation((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant") {
              return [...prev.slice(0, -1), { ...last, text: msg.text }];
            }
            return [...prev, makeEntry("assistant", msg.text)];
          });
          break;
        case "interrupted":
          stopAudioPlayback();
          isSpeakingRef.current = false;
          break;
        case "status":
          if (msg.status === "listening") setIsListening(true);
          else if (msg.status === "processing") setIsListening(false);
          break;
        case "mode":
          addToast(`Mode: ${msg.mode}`, "success");
          break;
        case "story_image":
          setConversation((prev) => {
            const last = prev[prev.length - 1];
            if (last && last.role === "assistant") {
              const images = [...(last.images || []), msg.data];
              return [...prev.slice(0, -1), { ...last, images }];
            }
            return [...prev, { ...makeEntry("assistant", msg.caption || ""), images: [msg.data] }];
          });
          break;
        case "sos_active":
          setSosActive(true);
          addToast("Emergency mode active", "error");
          break;
        case "usage_warning": {
          const warnMsg = `${msg.minutes_remaining} minutes remaining today`;
          speak(warnMsg);
          addToast(warnMsg, "warning");
          setConversation((prev) => [...prev, makeEntry("system", warnMsg)]);
          break;
        }
        case "error":
          console.error("[Agent Error]", msg.message);
          soundError();
          addToast(`Error: ${msg.message}`, "error");
          setConversation((prev) => [...prev, makeEntry("system", `Error: ${msg.message}`)]);
          speak(`Error: ${msg.message}`);
          break;
      }
    },
    [playAudio, stopAudioPlayback, addToast]
  );

  const handleReconnecting = useCallback(
    (attempt: number) => {
      soundReconnecting();
      addToast(`Reconnecting... (attempt ${attempt})`, "warning");
    },
    [addToast]
  );

  const handleReconnected = useCallback(() => {
    soundConnected();
    vibrate("connected");
    addToast("Reconnected!", "success");
    speak("Reconnected.");
  }, [addToast]);

  const { connectionState, connect, disconnect, send, setTokenProvider, setCaptchaNonce, latency } = useWebSocket({
    onMessage: handleMessage,
    onReconnecting: handleReconnecting,
    onReconnected: handleReconnected,
    autoReconnect: true,
  });

  useEffect(() => {
    if (uid) setTokenProvider(getToken);
  }, [uid, getToken, setTokenProvider]);

  // --- Offline detection ---
  useEffect(() => {
    if (!isOnline) {
      addToast("You're offline", "warning");
      speak("You are offline. Reconnecting when network returns.");
    } else if (connectionState === "disconnected") {
      addToast("Back online", "success");
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Audio/Video handlers ---
  const handleAudioChunk = useCallback(
    (base64: string) => {
      if (!isPlaying && !audioMutedRef.current) send({ type: "audio", data: base64 });
    },
    [send, isPlaying]
  );

  const handleVideoFrame = useCallback(
    (base64: string) => {
      if (!videoDisabledRef.current) send({ type: "video", data: base64 });
    },
    [send]
  );

  const {
    videoRef, streamRef, isActive: cameraActive, start: startCamera, stop: stopCamera,
    flip: flipCamera, facing: cameraFacing, torchSupported, torchOn, toggleTorch,
  } = useCamera(handleVideoFrame, { lowPower: lowPowerMode });
  const { isActive: micActive, start: startMic, stop: stopMic } = useMicrophone(handleAudioChunk);
  const { isActive: screenActive, start: startScreenShare, stop: stopScreenShare, streamRef: screenStreamRef, videoRef: screenVideoRef } = useScreenShare(handleVideoFrame);

  const {
    startRecording, stopRecording, isRecording, isSupported: isRecorderSupported,
  } = useVideoRecorder();

  // Start/stop recording in sync with the camera when the record toggle is on.
  // This also handles the flip() case: camera becomes inactive then active again,
  // producing a new recording for the new stream automatically.
  useEffect(() => {
    if (recordSession && cameraActive && streamRef.current) {
      startRecording(streamRef.current);
    } else {
      stopRecording();
    }
  // streamRef is a stable ref object — access .current inside the effect to
  // read the latest stream without adding it to the dependency array.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, recordSession, startRecording, stopRecording]);

  // Sync streamRef into state so we can safely pass it during render
  useEffect(() => {
    if (inputSource === "screen") {
      setActiveStream(screenStreamRef.current);
    } else {
      setActiveStream(streamRef.current);
    }
  }, [cameraActive, screenActive, streamRef, screenStreamRef, inputSource]);

  // --- Send text message via WebSocket ---
  const handleSendText = useCallback(
    (text: string) => {
      if (connectionState !== "connected" || !text.trim()) return;
      const trimmed = text.trim();
      setConversation((prev) => [...prev, makeEntry("user", trimmed)]);
      send({ type: "text", text: trimmed });
    },
    [connectionState, send]
  );

  // --- Quick action: send text as user speech ---
  const handleQuickAction = useCallback(
    (text: string) => {
      if (connectionState !== "connected") return;
      setConversation((prev) => [...prev, makeEntry("user", text)]);
      speak(text);
    },
    [connectionState]
  );

  // --- Start / Stop ---
  const handleStart = useCallback(async () => {
    setStartError("");
    stopSpeaking();

    const useScreen = inputSource === "screen";

    if (!useScreen) {
      speak("Requesting camera and microphone access.");
      try {
        const camStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: true,
        });
        camStream.getTracks().forEach((t) => t.stop());
      } catch (err) {
        const msg =
          err instanceof DOMException && err.name === "NotAllowedError"
            ? "Camera and microphone permission denied. Please allow in browser settings and try again."
            : err instanceof DOMException && err.name === "AbortError"
            ? "Camera timed out. Close other apps using the camera and try again."
            : `Permission error: ${err instanceof Error ? err.message : err}`;
        setStartError(msg);
        speak(msg);
        soundError();
        addToast("Permission denied", "error");
        return;
      }
    } else {
      speak("Requesting screen share access.");
    }

    speak("Permissions granted. Connecting.");

    try {
      const captchaNonce = await verifyCaptcha();
      setCaptchaNonce(captchaNonce);
    } catch {
      setStartError("Captcha verification failed. Please try again.");
      soundError();
      return;
    }

    try {
      await connect();
      soundConnected();
      vibrate("connected");
      addToast("Connected to SightLine", "success");

      if (useScreen) {
        speak("Connected. Starting screen share and microphone.");
        await startScreenShare();
      } else {
        speak("Connected. Starting camera and microphone.");
        await startCamera();
      }
      await startMic();
      setIsListening(true);
      setConversation([makeEntry("system", `Session started — ${currentMode} mode${useScreen ? " (screen share)" : ""}`)]);
      if (useScreen) {
        speak("Screen share is active. SightLine is analyzing your screen.");
      } else {
        speak("Camera is active. SightLine is analyzing what your camera sees.");
      }
    } catch (err) {
      const msg = `Failed to connect: ${err instanceof Error ? err.message : err}`;
      setStartError(msg);
      speak(msg);
      soundError();
      addToast("Connection failed", "error");
    }
  }, [connect, startCamera, startScreenShare, startMic, addToast, currentMode, verifyCaptcha, setCaptchaNonce, inputSource]);

  const handleStop = useCallback(() => {
    soundDisconnected();
    vibrate("disconnected");
    stopMic();
    stopCamera();
    stopScreenShare();
    disconnect();
    stopAudioPlayback();
    stopSpeaking();
    setIsListening(false);
    setStartError("");
    setSosActive(false);
    setVideoDisabled(false);
    setAudioMuted(false);

    const assistantMsgs = conversation.filter((e) => e.role === "assistant").length;
    const bookmarked = conversation.filter((e) => e.bookmarked).length;
    const startEntry = conversation.find((e) => e.role === "system" && e.text.includes("Session started"));
    const duration = startEntry ? Math.round((Date.now() - startEntry.timestamp) / 60000) : 0;
    const summary = `Session ended: ${assistantMsgs} descriptions, ${duration} min${bookmarked > 0 ? `, ${bookmarked} bookmarked` : ""}`;
    setConversation((prev) => [...prev, makeEntry("system", summary)]);

    addToast("Session ended", "info");
    speak(summary);
  }, [stopMic, stopCamera, stopScreenShare, disconnect, stopAudioPlayback, addToast, conversation]);

  // --- Bookmark & Export ---
  const handleBookmark = useCallback((id: string) => {
    setConversation((prev) =>
      prev.map((e) => (e.id === id ? { ...e, bookmarked: !e.bookmarked } : e))
    );
    soundNotification();
    addToast("Bookmark toggled", "info");
  }, [addToast]);

  const handleExport = useCallback(() => {
    exportAsText(conversation);
    addToast("Conversation exported", "success");
  }, [conversation, addToast]);

  // --- Camera control handlers ---
  const handleFlipCamera = useCallback(() => {
    flipCamera();
    addToast(`Camera: ${cameraFacing === "user" ? "rear" : "front"}`, "info");
    speak(cameraFacing === "user" ? "Switched to rear camera" : "Switched to front camera");
  }, [flipCamera, cameraFacing, addToast]);

  const handleToggleTorch = useCallback(() => {
    toggleTorch();
    addToast(torchOn ? "Flashlight off" : "Flashlight on", "info");
    speak(torchOn ? "Flashlight off" : "Flashlight on");
  }, [toggleTorch, torchOn, addToast]);

  const handleToggleLowPower = useCallback(() => {
    setLowPowerMode((prev) => !prev);
    addToast(lowPowerMode ? "Normal power mode" : "Low power mode", "info");
    speak(lowPowerMode ? "Normal power mode" : "Low power mode enabled");
  }, [lowPowerMode, addToast]);

  // --- Video disable toggle ---
  const handleToggleVideo = useCallback(() => {
    if (videoDisabled) {
      setVideoDisabled(false);
      startCamera();
      speak("Video re-enabled.");
      addToast("Video enabled", "info");
    } else {
      setVideoDisabled(true);
      stopCamera();
      speak("Video disabled. SightLine is audio-only.");
      addToast("Video disabled", "warning");
    }
  }, [videoDisabled, startCamera, stopCamera, addToast]);

  // --- Audio mute toggle ---
  const handleToggleMute = useCallback(() => {
    if (audioMuted) {
      setAudioMuted(false);
      speak("Audio unmuted.");
      addToast("Audio unmuted", "info");
    } else {
      speak("Audio muted.");
      stopAudioPlayback();
      setAudioMuted(true);
      addToast("Audio muted", "warning");
    }
  }, [audioMuted, stopAudioPlayback, addToast]);

  // --- Mode switching ---
  const handleModeChange = useCallback(
    (mode: Mode) => {
      setCurrentMode(mode);
      send({ type: "mode", mode });
      soundModeChange();
      speak(`Switched to ${mode} mode.`);
      addToast(`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`, "info");
    },
    [send, addToast]
  );

  // --- Swipe gesture for mode cycling ---
  const swipeRef = useSwipeGesture<HTMLDivElement>({
    onSwipeLeft: () => {
      const idx = MODES.indexOf(currentMode);
      const next = MODES[(idx + 1) % MODES.length];
      handleModeChange(next);
    },
    onSwipeRight: () => {
      const idx = MODES.indexOf(currentMode);
      const prev = MODES[(idx - 1 + MODES.length) % MODES.length];
      handleModeChange(prev);
    },
  });

  // --- Emergency SOS handler ---
  const handleEmergency = useCallback(() => {
    speak("Emergency SOS activated. Describing surroundings with high priority.");
    soundError();
    vibrate("emergency");
    setSosActive(true);
    setConversation((prev) => [...prev, makeEntry("system", "Emergency SOS activated")]);

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          send({
            type: "emergency",
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            timestamp: Date.now(),
          });
        },
        () => {
          send({ type: "emergency", timestamp: Date.now() });
        },
        { timeout: 3000, enableHighAccuracy: false }
      );
    } else {
      send({ type: "emergency", timestamp: Date.now() });
    }

    addToast("Emergency SOS activated", "error");
  }, [send, addToast]);

  const handleCancelSos = useCallback(() => {
    setSosActive(false);
    send({ type: "mode", mode: currentMode });
    speak("Emergency cancelled. Returning to normal mode.");
    addToast("SOS cancelled", "info");
    setConversation((prev) => [...prev, makeEntry("system", "SOS cancelled")]);
  }, [send, currentMode, addToast]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape" && isRunning) {
        e.preventDefault();
        handleStop();
      } else if (e.key === "m" && !e.ctrlKey && !e.metaKey && isRunning) {
        e.preventDefault();
        const idx = MODES.indexOf(currentMode);
        const next = MODES[(idx + 1) % MODES.length];
        handleModeChange(next);
      } else if (e.key === "e" && !e.ctrlKey && !e.metaKey && isRunning) {
        e.preventDefault();
        handleEmergency();
      } else if (e.key === "f" && !e.ctrlKey && !e.metaKey && isRunning) {
        e.preventDefault();
        handleFlipCamera();
      } else if (e.key === "v" && !e.ctrlKey && !e.metaKey && isRunning) {
        e.preventDefault();
        handleToggleVideo();
      } else if (e.key === "m" && e.ctrlKey && isRunning) {
        e.preventDefault();
        handleToggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }); // intentionally no deps — uses latest closure values via isRunning

  const isRunning = connectionState === "connected" && (cameraActive || screenActive) && micActive;
  const isReconnecting = connectionState === "reconnecting";

  // --- Visualizer state ---
  const vizState = !isRunning && !isReconnecting
    ? "disconnected" as const
    : isPlaying
    ? "speaking" as const
    : isListening
    ? "listening" as const
    : isReconnecting
    ? "processing" as const
    : "idle" as const;

  // --- Loading state ---
  if (authLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center" aria-busy="true">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
          <p className="text-sm text-muted-foreground">Loading SightLine...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col" ref={swipeRef} aria-roledescription="AI vision assistant">
      <a href="#main-controls" className="skip-link">Skip to controls</a>
      <video ref={videoRef} className="sr-only-video" playsInline muted aria-hidden="true" />
      <video ref={screenVideoRef} className="sr-only-video" playsInline muted aria-hidden="true" />

      <OnboardingModal onComplete={() => {}} />

      {/* Header — responsive */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/70 border-b border-border/50">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-5 py-3 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
            <span className="text-xs font-bold text-primary">S</span>
          </div>
          <span className="text-lg font-bold text-primary tracking-tight">SightLine</span>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          {audioMuted && (
            <span className="text-[10px] sm:text-xs text-red-400 font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 shrink-0" aria-label="Audio is muted">
              🔇
            </span>
          )}

          {isRecording && (
            <span className="text-[10px] sm:text-xs text-red-400 font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 shrink-0 flex items-center gap-1" aria-label="Session is being recorded">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
              REC
            </span>
          )}

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1" aria-label="Main navigation">
            <Link href="/guide" aria-label="User guide" className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
              Guide
            </Link>
            <Link href="/settings" aria-label="Settings" className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
              Settings
            </Link>
            <Link href="/rewards" aria-label="Rewards" className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
              Rewards
            </Link>
            <Link href="/dashboard" aria-label="Dashboard" className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
              Dashboard
            </Link>
            <Link href="/legal" aria-label="Legal information" className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors">
              Legal
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-full px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Logout
            </button>
          </nav>

          {/* Mobile menu button */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setMenuOpen((p) => !p)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary/50 text-sm"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              {menuOpen ? "✕" : "☰"}
            </button>

            {menuOpen && (
              <nav
                className="absolute right-0 top-11 z-50 flex flex-col gap-1 rounded-2xl border border-border ring-1 ring-border/50 bg-card/95 backdrop-blur-xl p-2 shadow-xl min-w-[140px]"
                aria-label="Main navigation"
              >
                {[
                  { href: "/guide", label: "Guide" },
                  { href: "/settings", label: "Settings" },
                  { href: "/rewards", label: "Rewards" },
                  { href: "/dashboard", label: "Dashboard" },
                  { href: "/legal", label: "Legal" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-xl px-4 py-2.5 text-sm text-foreground hover:bg-secondary/50 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="rounded-xl px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
                >
                  Logout
                </button>
              </nav>
            )}
          </div>

          <ConnectionQuality latency={latency} isConnected={connectionState === "connected"} />
          <StatusIndicator
            connectionState={connectionState === "reconnecting" ? "connecting" : connectionState}
            isListening={isListening}
            isSpeaking={isPlaying}
          />
        </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col px-4 sm:px-5 pb-4 gap-3 sm:gap-4">
        {/* Camera Preview — prominent, inline */}
        {isRunning && (
          <CameraPreview
            stream={activeStream}
            visible={showPreview}
            videoDisabled={videoDisabled}
          />
        )}

        {/* Audio Visualizer */}
        {(isRunning || isReconnecting) && (
          <div className="flex justify-center -my-1 sm:-my-2">
            <AudioVisualizer state={vizState} />
          </div>
        )}

        {/* Camera Controls */}
        {isRunning && (
          <CameraControls
            isActive={cameraActive}
            facing={cameraFacing}
            torchSupported={torchSupported}
            torchOn={torchOn}
            showPreview={showPreview}
            lowPower={lowPowerMode}
            videoDisabled={videoDisabled}
            audioMuted={audioMuted}
            onFlip={handleFlipCamera}
            onToggleTorch={handleToggleTorch}
            onTogglePreview={() => setShowPreview((p) => !p)}
            onToggleLowPower={handleToggleLowPower}
            onToggleVideo={handleToggleVideo}
            onToggleMute={handleToggleMute}
          />
        )}

        {/* Offline banner */}
        {!isOnline && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-amber-300 flex items-center gap-2" role="alert">
            <span>📡</span> You&apos;re offline. Waiting for network...
          </div>
        )}

        {/* Error banner */}
        {startError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-red-300" role="alert">
            {startError}
          </div>
        )}

        {/* Conversation Log */}
        <ConversationLog
          entries={conversation}
          isRunning={isRunning || isReconnecting}
          onBookmark={handleBookmark}
          onExport={handleExport}
        />

        {/* Text Input */}
        {isRunning && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendText(textInput);
              setTextInput("");
            }}
            className="flex gap-2"
            role="search"
            aria-label="Send a text message"
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-full border border-border bg-card/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              aria-label="Type a message to send"
            />
            <button
              type="submit"
              disabled={!textInput.trim()}
              className="shrink-0 rounded-full bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity disabled:opacity-30"
              aria-label="Send message"
            >
              Send
            </button>
          </form>
        )}

        {/* Quick Actions */}
        {isRunning && (
          <QuickActions currentMode={currentMode} onAction={handleQuickAction} disabled={!isRunning} />
        )}

        {/* Mode Selector */}
        <ModeSelector currentMode={currentMode} onModeChange={handleModeChange} />

        {/* Swipe hint */}
        {isRunning && (
          <p className="text-center text-[10px] text-muted-foreground/40">
            Swipe left/right to switch modes
          </p>
        )}

        {/* Input source toggle */}
        {!isRunning && !isReconnecting && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex justify-center gap-2">
              <button
                onClick={() => setInputSource("camera")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  inputSource === "camera"
                    ? "bg-foreground text-background"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
                aria-pressed={inputSource === "camera"}
              >
                📷 Camera
              </button>
              <button
                onClick={() => setInputSource("screen")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  inputSource === "screen"
                    ? "bg-foreground text-background"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
                aria-pressed={inputSource === "screen"}
              >
                🖥️ Screen
              </button>
            </div>

            {isRecorderSupported && (
              <button
                onClick={() => setRecordSession((p) => !p)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5 ${
                  recordSession
                    ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
                aria-pressed={recordSession}
                aria-label={recordSession ? "Disable session recording" : "Enable session recording"}
              >
                📹 {recordSession ? "Recording: ON" : "Record Session"}
              </button>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col gap-3 mt-auto" id="main-controls">
          <button
            onClick={isRunning ? handleStop : handleStart}
            disabled={isReconnecting || !isOnline}
            className={`group relative w-full overflow-hidden rounded-full py-4 sm:py-5 text-base sm:text-lg font-semibold tracking-wide transition-all duration-200 ease-in-out ${
              isReconnecting
                ? "bg-amber-500/20 text-amber-300 cursor-wait"
                : !isOnline
                ? "bg-secondary/30 text-secondary-foreground/40 cursor-not-allowed"
                : isRunning
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-foreground text-background hover:opacity-90"
            }`}
            aria-label={isRunning ? "Stop assistant" : isReconnecting ? "Reconnecting..." : !isOnline ? "Offline" : "Start assistant"}
          >
            {isReconnecting ? "Reconnecting..." : !isOnline ? "Offline" : isRunning ? "Stop" : "Start"}
          </button>

          <EmergencyButton
            onEmergency={handleEmergency}
            sosActive={sosActive}
            onCancelSos={handleCancelSos}
          />
        </div>
      </div>
      <div ref={turnstileRef} className="hidden" aria-hidden="true" />
    </main>
  );
}
