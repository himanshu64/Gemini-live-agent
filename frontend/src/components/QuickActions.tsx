"use client";
import type { Mode } from "@/lib/constants";

interface Props {
  currentMode: Mode;
  onAction: (text: string) => void;
  disabled: boolean;
}

const MODE_ACTIONS: Record<Mode, { label: string; prompt: string }[]> = {
  navigation: [
    { label: "What's ahead?", prompt: "What's ahead of me?" },
    { label: "Read signs", prompt: "Read any signs or text you can see" },
    { label: "Find door", prompt: "Where is the nearest door or exit?" },
    { label: "Describe scene", prompt: "Describe the full scene around me" },
  ],
  reading: [
    { label: "Read this", prompt: "Read the text in front of me" },
    { label: "Summarize", prompt: "Summarize what this document says" },
    { label: "Medicine label", prompt: "Read this medicine label including dosage" },
    { label: "What language?", prompt: "What language is this text written in?" },
  ],
  shopping: [
    { label: "What product?", prompt: "What product am I holding?" },
    { label: "Read price", prompt: "What is the price?" },
    { label: "Nutrition info", prompt: "Read the nutrition facts" },
    { label: "Compare", prompt: "Compare this product to the one before" },
  ],
  social: [
    { label: "Who's here?", prompt: "Describe the people in the room" },
    { label: "Expressions", prompt: "What expressions can you see?" },
    { label: "How many?", prompt: "How many people are there?" },
    { label: "Describe setting", prompt: "Describe the social setting" },
  ],
};

export default function QuickActions({ currentMode, onAction, disabled }: Props) {
  const actions = MODE_ACTIONS[currentMode];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Quick actions">
      {actions.map((action) => (
        <button
          key={action.label}
          onClick={() => onAction(action.prompt)}
          disabled={disabled}
          className="rounded-full border border-border bg-card/60 backdrop-blur-sm px-3.5 py-2 text-xs font-medium text-muted-foreground transition-all duration-150 hover:bg-card hover:text-foreground hover:border-foreground/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
          aria-label={action.prompt}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
