# What If Your Phone Could See For You? Building SightLine with Gemini Live API

*Building a real-time AI vision assistant for the visually impaired using Google's Gemini Live API, ADK, and Cloud Run*

**#GeminiLiveAgentChallenge**

---

## The Problem Nobody Talks About

What if you couldn't read the label on your medication? What if crossing the street meant trusting that the signal changed? What if every restaurant menu was a mystery?

For **285 million visually impaired people worldwide**, these aren't hypotheticals — they're daily realities. And the existing solutions? Aira charges $99/month for human agents. Be My Eyes depends on volunteer availability. OrCam requires $4,500 hardware. None of them offer what people actually need: a real-time, always-available, context-aware AI companion that simply tells you what it sees.

That's why I built **SightLine** — a voice-driven AI vision assistant that uses your phone's camera and Gemini's Live API to describe the world around you, in real time, through natural conversation.

---

## Beyond the Text Box

Most AI apps are glorified text boxes. You type a question, wait for a response, type another question. That paradigm fails completely for someone who can't see the screen.

SightLine has **zero text input**. The entire interface is voice and camera. You speak, it listens. You point your camera, it sees. It responds with natural audio — not robotic TTS, but Gemini's native audio output. And critically, you can **interrupt it at any time**. Say "wait, what's that on the left?" mid-sentence, and it stops and redirects immediately.

This is what Google means by "beyond the text box" — AI that works like a real conversation, not a chat window.

---

## The Architecture: ADK + LiveRequestQueue + Vertex AI

SightLine's architecture centers on Google's **Agent Development Kit (ADK)** and the **Gemini Live API** via Vertex AI. Here's how the pieces fit together:

```
Phone (Camera + Mic)
    │
    ▼ WebSocket (wss://)
    │
Cloud Run (FastAPI + ADK)
    │
    ├── LiveRequestQueue
    │   ├── Buffers audio chunks (PCM 16kHz)
    │   ├── Buffers video frames (JPEG 1fps)
    │   └── Handles barge-in
    │
    ├── SightLine Agent (gemini-2.5-flash-native-audio-preview)
    │   └── 5 function calling tools
    │
    ├── Firestore (sessions, preferences)
    └── Cloud Storage (captured frames)
```

The frontend is a **Next.js PWA** that captures camera frames at 1fps and mic audio at 16kHz, sending both over a single WebSocket. The backend runs on **Cloud Run** with a FastAPI server that feeds everything into ADK's `LiveRequestQueue`.

The `LiveRequestQueue` is the unsung hero here. It manages the bidirectional stream to Gemini, buffers incoming media, and handles barge-in natively — when the user starts speaking, it signals Gemini to stop generating and process the new input.

---

## Building with the Gemini Live API: Challenges and Solutions

### Challenge 1: Barge-In Without Echo

The biggest technical challenge was echo prevention. When Gemini speaks through the phone speaker and the mic picks it up, you get a feedback loop. The solution: the frontend mutes the microphone during agent speech and unmutes it the moment audio playback ends. Simple, but critical for usability.

### Challenge 2: Frame Quality for Reading

When a visually impaired user holds a medicine bottle up to their camera, the frame quality matters. Blurry frames produce hallucinated text. SightLine's agent prompt instructs Gemini to ask the user to "hold the camera closer" or "hold steady" when it detects low-confidence text recognition, rather than guessing.

### Challenge 3: Latency

Real-time means real-time. We use `gemini-2.5-flash-native-audio-preview` — Google's speed-optimized Live API model — deployed in the same region as our Cloud Run backend. Audio responses start streaming back within hundreds of milliseconds of the user finishing their question.

---

## ADK Function Calling: Making the Agent Smart

SightLine isn't just a camera narrator. It's an agent with **5 function calling tools**:

1. **`switch_mode(mode)`** — Changes behavior between Navigation, Reading, Shopping, and Social modes. Each mode has a specialized system prompt. Say "switch to reading mode" and the agent adapts instantly.

2. **`save_preference(key, value)`** — Stores user preferences in Firestore. "I prefer detailed descriptions" persists across sessions.

3. **`capture_frame()`** — Saves the current camera frame to Cloud Storage. The user can say "save this" to capture a frame for later reference.

4. **`get_session_history()`** — Retrieves conversation history so the agent can reference what it described earlier.

5. **`emergency_alert()`** — Triggered by the SOS button or voice command. Logs an emergency event for future integration with emergency contacts.

The key insight: **mode switching updates the system prompt without tearing down the Live API stream**. The agent seamlessly transitions from "there's a crosswalk ahead, the signal is red" to "this is a bottle of ibuprofen, 200mg, take one tablet every 4 to 6 hours" — just by changing the prompt context.

---

## Accessibility-First Design

SightLine's UI was designed for people who can barely see the screen — or can't see it at all:

- **Dark theme** with WCAG AAA contrast ratios
- **64px minimum touch targets** — twice the standard 44px recommendation
- **No text input fields** anywhere in the app
- **Full ARIA labels** and screen reader support
- **Haptic feedback** on the emergency button
- **PWA installable** — launches like a native app, no App Store needed

The mode selector uses a 2x2 grid with distinct colors and large icons. The status indicator shows connection state through color and animation, not text. Every design decision was made with the question: "Can someone with 10% vision use this?"

---

## 17 Features That Make SightLine a Complete Platform

SightLine isn't a demo — it's a fully-featured accessibility platform with **17 production-ready features** across four categories: **camera controls** (flip, torch, PiP preview, low-power mode), **real-time UX** (audio visualizer, conversation history, 16 quick action chips, toast notifications, swipe gestures, spatial audio cues), **session tools** (bookmark descriptions, export transcript, auto session summary), and **resilience** (auto-reconnect with exponential backoff, offline detection with TTS warning, real-time latency indicator, guided onboarding). Every feature was designed with a single question: "Can someone who can't see the screen use this?" The answer had to be yes — through voice feedback, haptic patterns, and spatial audio — before any feature shipped.

---

## What I Learned

**Gemini's Live API is genuinely different.** Most AI APIs are request-response. The Live API maintains a persistent bidirectional stream where you can push audio and video frames continuously, and the model responds in real-time. It's closer to a phone call than a chatbot.

**ADK simplifies streaming enormously.** Without the `LiveRequestQueue` abstraction, managing the bidirectional stream manually — buffering frames, handling interruptions, coordinating tool calls mid-stream — would have been weeks of work. ADK made it days.

**Accessibility constraints improve design.** When you can't rely on text, visual hierarchy, or complex navigation, you're forced to make the interface radically simple. SightLine's UI is better for *everyone* because it was designed for people who need it most.

---

## Try It Yourself

SightLine is open source and deploys to Cloud Run with a single command:

```bash
git clone https://github.com/himanshu64/Gemini-live-agent.git
cd Gemini-live-agent
./deploy.sh YOUR_PROJECT_ID us-central1
```

Check out the [GitHub repo](https://github.com/himanshu64/Gemini-live-agent) for full setup instructions, architecture details, and the demo video.

285 million people are waiting for AI that works for them. With Gemini's Live API and ADK, we can build it.

---

*Built for the Gemini Live Agent Challenge 2026*

**#GeminiLiveAgentChallenge**
