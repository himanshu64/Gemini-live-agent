"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * Reusable GSAP page-level animations for secondary pages.
 * Animates elements tagged with data-gsap attributes:
 *   - `page-header`  : slides down from top
 *   - `page-content`  : fades up with slight scale
 *   - `fade-up`       : fade-up on scroll with stagger
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
      gsap.from("[data-gsap='page-header']", {
        y: -24,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

      // --- Page content wrapper: fade up with scale ---
      gsap.from("[data-gsap='page-content']", {
        y: 20,
        opacity: 0,
        scale: 0.98,
        duration: 0.7,
        delay: 0.15,
        ease: "power3.out",
      });

      // --- Fade-up elements: scroll-triggered stagger ---
      gsap.utils
        .toArray<HTMLElement>("[data-gsap='fade-up']")
        .forEach((el) => {
          gsap.from(el, {
            scrollTrigger: {
              trigger: el,
              start: "top 90%",
              once: true,
            },
            y: 30,
            opacity: 0,
            duration: 0.6,
            ease: "power3.out",
          });
        });
    }, container);

    return () => ctx.revert();
  }, []);

  return ref;
}
