"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, API_TOKEN, RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY } from "@/lib/constants";

export type WSMessage =
  | { type: "audio"; data: string }
  | { type: "video"; data: string }
  | { type: "transcript"; text: string }
  | { type: "interrupted" }
  | { type: "status"; status: string }
  | { type: "mode"; mode: string }
  | { type: "error"; message: string };

type ConnectionState = "connecting" | "connected" | "disconnected";

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const retriesRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connectRef = useRef<() => void>(undefined);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionState("connecting");
    const wsUrl = API_TOKEN ? `${WS_URL}?token=${encodeURIComponent(API_TOKEN)}` : WS_URL;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnectionState("connected");
      retriesRef.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        onMessageRef.current(msg);
      } catch {
        console.error("Failed to parse WS message");
      }
    };

    ws.onclose = () => {
      setConnectionState("disconnected");
      wsRef.current = null;
      // Reconnect with exponential backoff
      const delay = Math.min(
        RECONNECT_BASE_DELAY * Math.pow(2, retriesRef.current),
        RECONNECT_MAX_DELAY
      );
      retriesRef.current++;
      setTimeout(() => connectRef.current?.(), delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    retriesRef.current = Infinity; // prevent reconnect
    wsRef.current?.close();
    wsRef.current = null;
    setConnectionState("disconnected");
  }, []);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    return () => {
      retriesRef.current = Infinity;
      wsRef.current?.close();
    };
  }, []);

  return { connectionState, connect, disconnect, send };
}
