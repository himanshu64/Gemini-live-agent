"use client";
import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when in "system" mode
  useEffect(() => {
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "light" ? "dark" : prev === "dark" ? "system" : "light";
      localStorage.setItem("theme", next);
      return next;
    });
  }, []);

  const label = theme === "light" ? "Light" : theme === "dark" ? "Dark" : "System";
  const icon = theme === "light" ? "☀️" : theme === "dark" ? "🌙" : "💻";

  return (
    <button
      onClick={cycle}
      className="rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
      aria-label={`Theme: ${label}. Click to change.`}
      title={`Theme: ${label}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
