"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP-powered scroll-reveal animations for the landing page.
 * Uses fromTo() to avoid elements getting stuck at opacity:0.
 */
export function useGsapAnimations<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      // --- Navbar slide down ---
      gsap.fromTo(
        "[data-gsap='nav']",
        { y: -60, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      );

      // --- Hero stagger ---
      gsap.fromTo(
        "[data-gsap='hero']",
        { y: 40, opacity: 0, scale: 0.96 },
        { y: 0, opacity: 1, scale: 1, duration: 1, ease: "power3.out", stagger: 0.15 }
      );

      // --- Shimmer text continuous animation ---
      const shimmerEl = container.querySelector("[data-gsap='shimmer']") as HTMLElement | null;
      if (shimmerEl) {
        gsap.to(shimmerEl, {
          backgroundPosition: "-200% center",
          duration: 4,
          ease: "none",
          repeat: -1,
        });
      }

      // --- CTA button pulse glow ---
      gsap.fromTo(
        "[data-gsap='pulse']",
        { boxShadow: "0 0 0 0 rgba(0, 128, 96, 0)" },
        {
          boxShadow: "0 0 24px 6px rgba(0, 128, 96, 0.2)",
          duration: 1.5,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        }
      );

      // --- Preview cards: stagger fade-up + float ---
      gsap.fromTo(
        "[data-gsap='card']",
        { y: 60, opacity: 0, scale: 0.95 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.15,
          scrollTrigger: {
            trigger: "[data-gsap-section='cards']",
            start: "top 80%",
            once: true,
          },
        }
      );

      // Floating effect on cards (runs after initial reveal)
      container.querySelectorAll("[data-gsap='card']").forEach((card, i) => {
        gsap.to(card, {
          y: -8,
          duration: 3 + i * 0.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: 1 + i * 0.6,
        });
      });

      // --- Feature cards: stagger from bottom ---
      gsap.fromTo(
        "[data-gsap='feature']",
        { y: 50, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: "[data-gsap-section='features']",
            start: "top 75%",
            once: true,
          },
        }
      );

      // --- Section headings: fade up ---
      gsap.utils.toArray<HTMLElement>("[data-gsap='heading']").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 30, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }
        );
      });

      // --- Section subtitles: fade up with delay ---
      gsap.utils.toArray<HTMLElement>("[data-gsap='subtitle']").forEach((el) => {
        gsap.fromTo(
          el,
          { y: 20, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: 0.15,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          }
        );
      });

      // --- How it works steps: slide from left ---
      gsap.fromTo(
        "[data-gsap='step']",
        { x: -40, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: "[data-gsap-section='steps']",
            start: "top 75%",
            once: true,
          },
        }
      );

      // --- Step number circles: scale bounce ---
      gsap.fromTo(
        "[data-gsap='step-num']",
        { scale: 0, rotation: -180 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.6,
          ease: "back.out(1.7)",
          stagger: 0.12,
          scrollTrigger: {
            trigger: "[data-gsap-section='steps']",
            start: "top 75%",
            once: true,
          },
        }
      );

      // --- Tech stack pills: scale + pop ---
      gsap.fromTo(
        "[data-gsap='pill']",
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.4,
          ease: "back.out(2)",
          stagger: 0.06,
          scrollTrigger: {
            trigger: "[data-gsap-section='tech']",
            start: "top 80%",
            once: true,
          },
        }
      );

      // --- CTA section: fade up ---
      gsap.fromTo(
        "[data-gsap='cta']",
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: "[data-gsap-section='cta']",
            start: "top 80%",
            once: true,
          },
        }
      );

      // --- Footer: fade in ---
      gsap.fromTo(
        "[data-gsap='footer']",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.6,
          ease: "power3.out",
          scrollTrigger: {
            trigger: "[data-gsap='footer']",
            start: "top 95%",
            once: true,
          },
        }
      );
    }, container);

    return () => ctx.revert();
  }, []);

  return ref;
}
