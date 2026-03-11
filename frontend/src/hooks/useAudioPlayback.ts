"use client";
import { useCallback, useRef, useState } from "react";
import { SAMPLE_RATE_OUT } from "@/lib/constants";
import { base64ToFloat32 } from "@/lib/audioUtils";

export function useAudioPlayback() {
  const contextRef = useRef<AudioContext | null>(null);
  const queueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextTimeRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const getContext = useCallback(() => {
    if (!contextRef.current || contextRef.current.state === "closed") {
      contextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE_OUT });
    }
    return contextRef.current;
  }, []);

  const play = useCallback((base64Audio: string) => {
    const ctx = getContext();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const float32 = base64ToFloat32(base64Audio);
    const buffer = ctx.createBuffer(1, float32.length, SAMPLE_RATE_OUT);
    buffer.copyToChannel(float32, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);

    const now = ctx.currentTime;
    const startTime = Math.max(now, nextTimeRef.current);
    source.start(startTime);
    nextTimeRef.current = startTime + buffer.duration;

    queueRef.current.push(source);
    setIsPlaying(true);

    source.onended = () => {
      queueRef.current = queueRef.current.filter((s) => s !== source);
      if (queueRef.current.length === 0) {
        setIsPlaying(false);
      }
    };
  }, [getContext]);

  const stopAll = useCallback(() => {
    queueRef.current.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    queueRef.current = [];
    nextTimeRef.current = 0;
    setIsPlaying(false);
  }, []);

  return { isPlaying, play, stopAll };
}
