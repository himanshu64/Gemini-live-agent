"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, API_TOKEN } from "@/lib/constants";

export type WSMessage =
  | { type: "audio"; data: string }
  | { type: "video"; data: string }
  | { type: "transcript"; text: string }
  | { type: "interrupted" }
  | { type: "status"; status: string }
  | { type: "mode"; mode: string }
  | { type: "error"; message: string }
  | { type: "ping" }
  | { type: "pong" };

type ConnectionState = "connecting" | "connected" | "disconnected";

export function useWebSocket(onMessage: (msg: WSMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const onMessageRef = useRef(onMessage);
  const gotErrorRef = useRef(false);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return Promise.resolve();

    gotErrorRef.current = false;

    return new Promise<void>((resolve, reject) => {
      setConnectionState("connecting");
      const wsUrl = API_TOKEN ? `${WS_URL}?token=${encodeURIComponent(API_TOKEN)}` : WS_URL;
      console.log("[WS] Connecting to:", wsUrl.replace(/token=.*/, "token=***"));
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error("[WS] Connection timeout after 10s");
          ws.close();
          if (!resolved) {
            resolved = true;
            reject(new Error("WebSocket connection timeout"));
          }
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log("[WS] Connected, waiting for server ready signal...");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;

          // Handle keepalive pings from server
          if (msg.type === "ping") {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "pong" }));
            }
            return;
          }

          // Handle the "ready" signal — session is fully initialized
          if (msg.type === "status" && msg.status === "ready") {
            console.log("[WS] Server ready — session initialized");
            setConnectionState("connected");
            if (!resolved) {
              resolved = true;
              resolve();
            }
          }

          // Track if we got a server error (don't reconnect)
          if (msg.type === "error") {
            gotErrorRef.current = true;
          }

          onMessageRef.current(msg);
        } catch {
          console.error("[WS] Failed to parse message:", event.data?.slice?.(0, 100));
        }
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log(`[WS] Closed: code=${event.code} reason=${event.reason}`);
        setConnectionState("disconnected");
        wsRef.current = null;

        // Do NOT auto-reconnect. The user must tap Start again.
        // This prevents infinite reconnect loops on server errors.
        if (!resolved) {
          resolved = true;
          reject(new Error(event.reason || "Connection closed"));
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error("[WS] Error:", err);
        ws.close();
      };
    });
  }, []);

  const disconnect = useCallback(() => {
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
      wsRef.current?.close();
    };
  }, []);

  return { connectionState, connect, disconnect, send };
}
