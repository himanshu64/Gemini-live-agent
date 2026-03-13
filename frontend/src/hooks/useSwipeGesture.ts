"use client";
import { useRef, useEffect, useCallback } from "react";

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

const SWIPE_THRESHOLD = 60;
const SWIPE_MAX_TIME = 400;

/**
 * Detects horizontal/vertical swipe gestures on a target element.
 * Returns a ref to attach to the swipeable container.
 */
export function useSwipeGesture<T extends HTMLElement>(callbacks: SwipeCallbacks) {
  const ref = useRef<T>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);

  const cbRef = useRef(callbacks);
  useEffect(() => {
    cbRef.current = callbacks;
  }, [callbacks]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    startX.current = touch.clientX;
    startY.current = touch.clientY;
    startTime.current = Date.now();
  }, []);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    const touch = e.changedTouches[0];
    const dx = touch.clientX - startX.current;
    const dy = touch.clientY - startY.current;
    const dt = Date.now() - startTime.current;

    if (dt > SWIPE_MAX_TIME) return;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > absDy && absDx > SWIPE_THRESHOLD) {
      if (dx > 0) cbRef.current.onSwipeRight?.();
      else cbRef.current.onSwipeLeft?.();
    } else if (absDy > absDx && absDy > SWIPE_THRESHOLD) {
      if (dy > 0) cbRef.current.onSwipeDown?.();
      else cbRef.current.onSwipeUp?.();
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchEnd]);

  return ref;
}
