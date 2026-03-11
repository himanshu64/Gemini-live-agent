"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { SAMPLE_RATE_IN } from "@/lib/constants";
import { float32ToInt16Base64 } from "@/lib/audioUtils";

const BUFFER_SIZE = 4096;

export function useMicrophone(onAudioChunk: (base64: string) => void) {
  const [isActive, setIsActive] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const onChunkRef = useRef(onAudioChunk);
  onChunkRef.current = onAudioChunk;

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE_IN,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      const audioCtx = new AudioContext({ sampleRate: SAMPLE_RATE_IN });
      contextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(BUFFER_SIZE, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const base64 = float32ToInt16Base64(inputData);
        onChunkRef.current(base64);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);
      setIsActive(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    contextRef.current?.close();
    contextRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isActive, start, stop };
}
