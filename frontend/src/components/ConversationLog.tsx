"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";

export interface ConversationEntry {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  timestamp: number;
  bookmarked?: boolean;
  images?: string[];
}

interface Props {
  entries: ConversationEntry[];
  isRunning: boolean;
  onBookmark?: (id: string) => void;
  onExport?: () => void;
}

export default function ConversationLog({ entries, isRunning, onBookmark, onExport }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries]);

  if (!isRunning && entries.length === 0) {
    return (
      <div
        className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-5 min-h-[140px] flex items-center justify-center"
        role="log"
        aria-label="Conversation"
      >
        <p className="text-base text-muted-foreground/60 text-center leading-relaxed">
          Tap Start to begin your session
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="rounded-2xl border border-border bg-card/50 backdrop-blur-sm p-4 min-h-[140px] max-h-[50vh] overflow-y-auto scroll-smooth"
      role="log"
      aria-live="polite"
      aria-label="Conversation history"
    >
      {entries.length > 0 && onExport && (
        <div className="flex justify-end mb-2">
          <button
            onClick={onExport}
            className="text-[10px] text-muted-foreground/50 hover:text-foreground transition-colors"
            aria-label="Export conversation"
          >
            📤 Export
          </button>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex flex-col gap-0.5 ${entry.role === "user" ? "items-end" : "items-start"}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {entry.role === "user" ? "You" : entry.role === "system" ? "System" : "SightLine"}
            </span>
            <div className={`flex items-start gap-1.5 max-w-[85%] ${entry.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`text-sm leading-relaxed rounded-xl px-3 py-2 ${
                  entry.role === "user"
                    ? "bg-blue-500/10 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300"
                    : entry.role === "system"
                    ? "bg-amber-500/10 text-amber-600/80 dark:text-amber-400/80 text-xs italic"
                    : "bg-card text-card-foreground/80"
                } ${entry.bookmarked ? "border-l-2 border-amber-400" : ""}`}
              >
                <p>{entry.text}</p>
                {entry.images && entry.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {entry.images.map((src, i) => (
                      <Image
                        key={i}
                        src={src}
                        alt={`Story illustration ${i + 1}`}
                        width={200}
                        height={200}
                        className="rounded-lg object-cover border border-border"
                        unoptimized
                      />
                    ))}
                  </div>
                )}
              </div>
              {entry.role === "assistant" && onBookmark && (
                <button
                  onClick={() => onBookmark(entry.id)}
                  className="shrink-0 mt-1 text-xs opacity-40 hover:opacity-100 transition-opacity"
                  aria-label={entry.bookmarked ? "Remove bookmark" : "Bookmark this description"}
                >
                  {entry.bookmarked ? "★" : "☆"}
                </button>
              )}
            </div>
          </div>
        ))}
        {isRunning && entries.length > 0 && entries[entries.length - 1].role !== "system" && (
          <div className="flex items-center gap-1.5 px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-muted-foreground/50">Listening...</span>
          </div>
        )}
      </div>
    </div>
  );
}
