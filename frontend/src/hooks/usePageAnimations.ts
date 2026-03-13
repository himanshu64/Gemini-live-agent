"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reusable GSAP page-level animations for secondary pages.
 * Uses fromTo() to avoid elements getting stuck at opacity:0.
 */
export function usePageAnimations<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // --- Page header: slide down ---
      gsap.fromTo(
        "[data-gsap='page-header']",
        { y: -24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power3.out" }
      );

      // --- Page content wrapper: fade up with scale ---
      gsap.fromTo(
        "[data-gsap='page-content']",
        { y: 20, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, delay: 0.15, ease: "power3.out" }
      );

      // --- Fade-up elements: scroll-triggered ---
      gsap.utils
        .toArray<HTMLElement>("[data-gsap='fade-up']")
        .forEach((el) => {
          gsap.fromTo(
            el,
            { y: 30, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              ease: "power3.out",
              scrollTrigger: {
                trigger: el,
                start: "top 90%",
                once: true,
              },
            }
          );
        });
    }, container);

    return () => ctx.revert();
  }, []);

  return ref;
}
