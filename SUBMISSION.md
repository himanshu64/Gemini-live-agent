# SightLine — DevPost Submission

> Paste the sections below into the DevPost submission form fields.

---

## Summary

SightLine is a real-time, voice-driven AI vision assistant for visually impaired users. It uses the phone's camera and Gemini's Live API to provide continuous environmental narration through natural conversation — no text input required. Users simply speak and point their camera; SightLine describes what it sees, reads text aloud, warns about obstacles, and can be interrupted at any time.

---

## Inspiration

285 million people worldwide are visually impaired (WHO). Existing assistive tools are either expensive (Aira at $99/month), depend on human volunteers (Be My Eyes), or require specialized hardware (OrCam at $4,500). None offer a real-time, always-available, context-aware AI companion. We wanted to build what these users actually need: an AI that sees what they can't, responds instantly through natural voice, and costs nothing more than the phone they already carry.

---

## What it does

SightLine breaks the "text box" paradigm entirely:

- **Zero text interface** — 100% voice + camera, designed for users who can't see the screen
- **Bidirectional streaming** — continuous real-time narration, not request/response
- **Barge-in support** — interrupt the agent at any time by speaking
- **Native audio responses** — generated directly by Gemini, not TTS-over-text
- **4 specialized modes**: Navigation (obstacle warnings, spatial layout), Reading (documents, medicine labels, menus), Shopping (product ID, prices, nutrition), Social (expressions, gestures, privacy-conscious)
- **5 function calling tools** — mode switching, preference saving, frame capture, session history, emergency alert
- **Camera controls** — flip front/rear, flashlight toggle, floating PiP preview, low-power mode (0.5 FPS)
- **Session tools** — bookmark important descriptions, export transcript as text, automatic session summary
- **Offline resilience** — network detection with banner + TTS warning, real-time latency indicator with signal bars
- **17 UX features** — audio visualizer, conversation history, 16 quick action chips, toast notifications, swipe gestures, 6 spatial audio cues, guided onboarding
- **Accessibility-first UI** — dark theme, 64px touch targets, WCAG AAA contrast, full ARIA labels, haptic feedback
- **PWA installable** — works on any device, no app store needed

---

## How we built it

**AI Model**: `gemini-2.5-flash-native-audio-preview` via Vertex AI for real-time bidirectional audio + video streaming through the Live API.

**Agent Framework**: Google ADK (Python SDK) with `LiveRequestQueue` for buffering audio/video frames and handling barge-in. The agent uses dynamic instructions that change based on the active mode.

**Backend**: Python/FastAPI on Cloud Run. A WebSocket endpoint receives audio chunks (PCM 16kHz) and video frames (JPEG 1fps) from the frontend and feeds them into the ADK streaming runner. Tool calls (mode switching, preferences, frame capture) are executed server-side.

**Frontend**: Next.js 15 PWA with `getUserMedia` for camera/mic access, WebSocket client for bidirectional streaming, and Web Audio API for audio playback. The UI uses high-contrast dark theme with 64px+ touch targets and full screen reader support.

**Database**: Cloud Firestore for user sessions, preferences, and conversation history.

**Storage**: Cloud Storage for captured camera frames with 7-day auto-cleanup lifecycle.

**Deployment**: Cloud Run via `deploy.sh` with automated API enablement, bucket creation, and CORS configuration.

---

## Challenges we ran into

- **Echo prevention**: The phone speaker output gets picked up by the mic, creating feedback loops. Solved by muting the mic during agent speech.
- **Frame quality for text reading**: Blurry frames produce hallucinated OCR. The agent prompt instructs Gemini to ask users to hold the camera closer rather than guessing.
- **Build-time vs runtime env vars**: Next.js bakes `NEXT_PUBLIC_*` variables at build time. Had to use `--set-build-env-vars` in Cloud Run deploy instead of `--set-env-vars`.
- **Barge-in coordination**: Managing the bidirectional stream interruption when the user speaks mid-response. ADK's `LiveRequestQueue` handles this natively.
- **Latency optimization**: Using the flash model variant and same-region deployment to keep audio response latency under 500ms.
- **Torch API compatibility**: The MediaTrack `torch` constraint is not standardized — required feature detection and graceful degradation across browsers.
- **Offline state management**: Coordinating WebSocket reconnection, UI state, and TTS announcements when network drops and returns mid-session.

---

## Accomplishments that we're proud of

- **Zero text input UI** — the entire app works without a single text field
- **17 production-ready UX features** across camera controls, real-time feedback, session tools, and offline resilience
- **5 function calling tools** integrated via ADK for a truly agentic experience
- **4 specialized modes** with dynamic system prompts that switch without tearing down the Live API stream
- **16 context-aware quick action prompts** (4 per mode) and **6 spatial audio cues** for state changes
- **PWA with haptic feedback** — installable, works like a native app
- **One-command deployment** — `deploy.sh` handles everything from API enablement to CORS
- **Accessibility-first design** — WCAG AAA contrast, 64px touch targets, full ARIA labels

---

## What we learned

- Gemini's Live API is fundamentally different from request-response APIs — it maintains a persistent bidirectional stream closer to a phone call than a chatbot
- ADK's `LiveRequestQueue` abstraction dramatically simplifies managing bidirectional audio/video streams with barge-in
- Designing for accessibility constraints (no text, large targets, voice-only) produces better UX for everyone
- Native audio output from Gemini sounds significantly more natural than TTS-over-text approaches
- Function calling works seamlessly within the Live API streaming context

---

## What's next for SightLine

- **Smart glasses integration** — Meta Ray-Ban / Google Glass for hands-free, always-on vision assistance
- **Spatial audio** — 3D directional sound cues ("door to your left" plays from the left speaker)
- **On-device Gemini Nano** — offline mode for core scene description without internet
- **Community-mapped hazards** — crowdsourced obstacle database with real-time alerts
- **Multi-language support** — real-time translation for travel via Gemini
- **Healthcare integration** — medication management, fall detection, appointment assistance

---

## Built With

- gemini-live-api
- google-adk
- vertex-ai
- cloud-run
- cloud-firestore
- cloud-storage
- python
- fastapi
- nextjs
- typescript
- websockets
- pwa

---

*#GeminiLiveAgentChallenge*
