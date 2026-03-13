"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP-powered scroll-reveal animations for the landing page.
 * Animates elements with data-gsap attributes when they enter the viewport.
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
      gsap.from("[data-gsap='nav']", {
        y: -60,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
      });

      // --- Hero stagger ---
      gsap.from("[data-gsap='hero']", {
        y: 40,
        opacity: 0,
        scale: 0.96,
        duration: 1,
        ease: "power3.out",
        stagger: 0.15,
      });

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
      gsap.to("[data-gsap='pulse']", {
        boxShadow: "0 0 24px 6px rgba(0, 128, 96, 0.2)",
        duration: 1.5,
        ease: "power1.inOut",
        yoyo: true,
        repeat: -1,
      });

      // --- Preview cards: stagger fade-up + float ---
      gsap.from("[data-gsap='card']", {
        scrollTrigger: {
          trigger: "[data-gsap-section='cards']",
          start: "top 80%",
          once: true,
        },
        y: 60,
        opacity: 0,
        scale: 0.95,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.15,
      });

      // Floating effect on cards
      container.querySelectorAll("[data-gsap='card']").forEach((card, i) => {
        gsap.to(card, {
          y: -8,
          duration: 3 + i * 0.5,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 0.6,
        });
      });

      // --- Feature cards: stagger from bottom ---
      gsap.from("[data-gsap='feature']", {
        scrollTrigger: {
          trigger: "[data-gsap-section='features']",
          start: "top 75%",
          once: true,
        },
        y: 50,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
      });

      // --- Section headings: fade up ---
      gsap.utils.toArray("[data-gsap='heading']").forEach((el) => {
        gsap.from(el as HTMLElement, {
          scrollTrigger: {
            trigger: el as HTMLElement,
            start: "top 85%",
            once: true,
          },
          y: 30,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
        });
      });

      // --- Section subtitles: fade up with delay ---
      gsap.utils.toArray("[data-gsap='subtitle']").forEach((el) => {
        gsap.from(el as HTMLElement, {
          scrollTrigger: {
            trigger: el as HTMLElement,
            start: "top 85%",
            once: true,
          },
          y: 20,
          opacity: 0,
          duration: 0.6,
          delay: 0.15,
          ease: "power3.out",
        });
      });

      // --- How it works steps: slide from left ---
      gsap.from("[data-gsap='step']", {
        scrollTrigger: {
          trigger: "[data-gsap-section='steps']",
          start: "top 75%",
          once: true,
        },
        x: -40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
      });

      // --- Step number circles: scale bounce ---
      gsap.from("[data-gsap='step-num']", {
        scrollTrigger: {
          trigger: "[data-gsap-section='steps']",
          start: "top 75%",
          once: true,
        },
        scale: 0,
        rotation: -180,
        duration: 0.6,
        ease: "back.out(1.7)",
        stagger: 0.12,
      });

      // --- Tech stack pills: scale + pop ---
      gsap.from("[data-gsap='pill']", {
        scrollTrigger: {
          trigger: "[data-gsap-section='tech']",
          start: "top 80%",
          once: true,
        },
        scale: 0,
        opacity: 0,
        duration: 0.4,
        ease: "back.out(2)",
        stagger: 0.06,
      });

      // --- CTA section: fade up ---
      gsap.from("[data-gsap='cta']", {
        scrollTrigger: {
          trigger: "[data-gsap-section='cta']",
          start: "top 80%",
          once: true,
        },
        y: 40,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: 0.12,
      });

      // --- Footer: fade in ---
      gsap.from("[data-gsap='footer']", {
        scrollTrigger: {
          trigger: "[data-gsap='footer']",
          start: "top 95%",
          once: true,
        },
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      });

    }, container);

    return () => ctx.revert();
  }, []);

  return ref;
}
