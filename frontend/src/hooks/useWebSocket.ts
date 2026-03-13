"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { WS_URL, API_TOKEN, RECONNECT_BASE_DELAY, RECONNECT_MAX_DELAY } from "@/lib/constants";

export type WSMessage =
  | { type: "audio"; data: string }
  | { type: "video"; data: string }
  | { type: "text"; text: string }
  | { type: "transcript"; text: string }
  | { type: "interrupted" }
  | { type: "status"; status: string }
  | { type: "mode"; mode: string }
  | { type: "error"; message: string }
  | { type: "usage_warning"; minutes_remaining: number }
  | { type: "sos_active"; message: string }
  | { type: "emergency"; location?: { lat: number; lng: number }; timestamp: number }
  | { type: "story_image"; data: string; caption?: string }
  | { type: "ping" }
  | { type: "pong" };

type ConnectionState = "connecting" | "connected" | "disconnected" | "reconnecting";

interface UseWebSocketOptions {
  onMessage: (msg: WSMessage) => void;
  onReconnecting?: (attempt: number) => void;
  onReconnected?: () => void;
  autoReconnect?: boolean;
}

export function useWebSocket({
  onMessage,
  onReconnecting,
  onReconnected,
  autoReconnect = true,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const onMessageRef = useRef(onMessage);
  const onReconnectingRef = useRef(onReconnecting);
  const onReconnectedRef = useRef(onReconnected);
  const getTokenRef = useRef<(() => Promise<string>) | null>(null);
  const captchaNonceRef = useRef<string>("");
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const intentionalCloseRef = useRef(false);
  const wasConnectedRef = useRef(false);
  const pingTimestampRef = useRef(0);
  const [latency, setLatency] = useState(-1);
  const scheduleReconnectRef = useRef<() => void>(() => {});

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onReconnectingRef.current = onReconnecting; }, [onReconnecting]);
  useEffect(() => { onReconnectedRef.current = onReconnected; }, [onReconnected]);

  const setTokenProvider = useCallback((provider: () => Promise<string>) => {
    getTokenRef.current = provider;
  }, []);

  const setCaptchaNonce = useCallback((nonce: string) => {
    captchaNonceRef.current = nonce;
  }, []);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }
  }, []);

  const connectInternal = useCallback(async (): Promise<void> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    let token = API_TOKEN;
    if (getTokenRef.current) {
      try { token = await getTokenRef.current(); } catch { /* fallback */ }
    }

    return new Promise<void>((resolve, reject) => {
      setConnectionState(wasConnectedRef.current ? "reconnecting" : "connecting");
      let wsUrl = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
      if (captchaNonceRef.current) {
        const sep = wsUrl.includes("?") ? "&" : "?";
        wsUrl += `${sep}captcha=${encodeURIComponent(captchaNonceRef.current)}`;
      }
      console.log("[WS] Connecting to:", wsUrl.replace(/token=.*/, "token=***"));
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      let resolved = false;

      const timeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error("[WS] Connection timeout after 10s");
          ws.close();
          if (!resolved) { resolved = true; reject(new Error("WebSocket connection timeout")); }
        }
      }, 10000);

      ws.onopen = () => {
        clearTimeout(timeout);
        console.log("[WS] Connected, waiting for server ready signal...");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage;
          if (msg.type === "ping") {
            pingTimestampRef.current = Date.now();
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "pong" }));
            return;
          }
          if (msg.type === "pong") {
            if (pingTimestampRef.current > 0) {
              setLatency(Date.now() - pingTimestampRef.current);
              pingTimestampRef.current = 0;
            }
            return;
          }
          if (msg.type === "status" && msg.status === "ready") {
            console.log("[WS] Server ready — session initialized");
            const isReconnect = wasConnectedRef.current;
            setConnectionState("connected");
            wasConnectedRef.current = true;
            reconnectAttemptRef.current = 0;
            if (!resolved) { resolved = true; resolve(); }
            if (isReconnect) onReconnectedRef.current?.();
          }
          onMessageRef.current(msg);
        } catch {
          console.error("[WS] Failed to parse message:", event.data?.slice?.(0, 100));
        }
      };

      ws.onclose = (event) => {
        clearTimeout(timeout);
        console.log(`[WS] Closed: code=${event.code} reason=${event.reason}`);
        wsRef.current = null;

        if (!resolved) { resolved = true; reject(new Error(event.reason || "Connection closed")); }

        // Auto-reconnect if not intentionally closed
        if (!intentionalCloseRef.current && autoReconnect && wasConnectedRef.current) {
          scheduleReconnectRef.current();
        } else {
          setConnectionState("disconnected");
        }
      };

      ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error("[WS] Error:", err);
        ws.close();
      };
    });
  }, [autoReconnect]);

  const scheduleReconnect = useCallback(() => {
    clearReconnectTimer();
    const attempt = reconnectAttemptRef.current;
    if (attempt >= 10) {
      console.error("[WS] Max reconnect attempts reached");
      setConnectionState("disconnected");
      wasConnectedRef.current = false;
      return;
    }

    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempt), RECONNECT_MAX_DELAY);
    const jitter = delay * (0.5 + Math.random() * 0.5);
    console.log(`[WS] Reconnecting in ${Math.round(jitter)}ms (attempt ${attempt + 1}/10)`);
    setConnectionState("reconnecting");
    onReconnectingRef.current?.(attempt + 1);

    reconnectTimerRef.current = setTimeout(async () => {
      reconnectAttemptRef.current = attempt + 1;
      try {
        await connectInternal();
      } catch {
        // onclose handler will schedule next attempt
      }
    }, jitter);
  }, [connectInternal, clearReconnectTimer]);

  // Keep the ref in sync so connectInternal's onclose can call it
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  const connect = useCallback(async () => {
    intentionalCloseRef.current = false;
    wasConnectedRef.current = false;
    reconnectAttemptRef.current = 0;
    return connectInternal();
  }, [connectInternal]);

  const disconnect = useCallback(() => {
    intentionalCloseRef.current = true;
    clearReconnectTimer();
    wsRef.current?.close();
    wsRef.current = null;
    wasConnectedRef.current = false;
    reconnectAttemptRef.current = 0;
    setConnectionState("disconnected");
  }, [clearReconnectTimer]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    return () => {
      clearReconnectTimer();
      wsRef.current?.close();
    };
  }, [clearReconnectTimer]);

  return { connectionState, connect, disconnect, send, setTokenProvider, setCaptchaNonce, latency };
}
