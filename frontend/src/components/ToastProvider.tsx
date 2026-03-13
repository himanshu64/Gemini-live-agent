"use client";
import { createContext, useContext, useCallback, useState, type ReactNode } from "react";

interface Toast {
  id: string;
  message: string;
  variant: "info" | "success" | "warning" | "error";
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (message: string, variant?: Toast["variant"]) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const VARIANT_STYLES: Record<Toast["variant"], string> = {
  info: "bg-blue-500/15 border-blue-500/30 text-blue-300",
  success: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
  warning: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  error: "bg-red-500/15 border-red-500/30 text-red-300",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, variant: Toast["variant"] = "info") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-4), { id, message, variant }]);
      setTimeout(() => removeToast(id), 3500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none"
        aria-live="polite"
        role="status"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-xl border backdrop-blur-md px-4 py-3 text-sm font-medium shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${VARIANT_STYLES[toast.variant]}`}
            role="alert"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
