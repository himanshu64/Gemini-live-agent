"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { vibrate } from "@/lib/haptics";
import { speak } from "@/lib/speak";

interface Props {
  onEmergency: () => void;
  sosActive?: boolean;
  onCancelSos?: () => void;
}

export default function EmergencyButton({ onEmergency, sosActive, onCancelSos }: Props) {
  const [countdown, setCountdown] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    setCountdown(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => clearTimers, [clearTimers]);

  const startCountdown = useCallback(() => {
    vibrate("emergency");
    setCountdown(3);
    speak("SOS activating in 3, 2, 1");

    let count = 3;
    timerRef.current = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearTimers();
        onEmergency();
      } else {
        setCountdown(count);
      }
    }, 1000);
  }, [onEmergency, clearTimers]);

  const handlePointerDown = useCallback(() => {
    longPressRef.current = setTimeout(() => {
      startCountdown();
    }, 1500);
  }, [startCountdown]);

  const handlePointerUp = useCallback(() => {
    // Cancel long-press if released too early
    if (longPressRef.current) {
      clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    clearTimers();
    speak("SOS cancelled.");
    onCancelSos?.();
  }, [clearTimers, onCancelSos]);

  // If SOS is active, show cancel banner
  if (sosActive) {
    return (
      <div className="flex flex-col gap-2" role="alert" aria-live="assertive">
        <div className="w-full rounded-full border border-red-500/50 bg-red-500/20 py-3 text-center text-base font-bold text-red-400 uppercase tracking-widest animate-pulse">
          SOS Active
        </div>
        <button
          onClick={handleCancel}
          className="w-full rounded-full border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground"
          aria-label="Cancel SOS emergency"
        >
          Cancel SOS
        </button>
      </div>
    );
  }

  // If countdown is running, show countdown
  if (countdown !== null) {
    return (
      <div className="flex flex-col gap-2" role="alert" aria-live="assertive">
        <div className="w-full rounded-full border border-red-500/50 bg-red-500/20 py-4 text-center text-lg font-bold text-red-400 animate-pulse">
          SOS in {countdown}...
        </div>
        <button
          onClick={clearTimers}
          className="w-full rounded-full border border-border bg-secondary py-3 text-sm font-medium text-secondary-foreground"
          aria-label="Cancel SOS countdown"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      aria-label="Emergency SOS alert — hold for 1.5 seconds to activate"
      className="w-full rounded-full border border-red-500/30 bg-red-500/10 py-4 text-base font-bold text-red-400 uppercase tracking-widest transition-all duration-200 ease-in-out hover:bg-red-500/20 hover:border-red-500/50 active:bg-red-500/30"
    >
      Hold for SOS
    </button>
  );
}
