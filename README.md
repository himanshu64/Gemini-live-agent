# SightLine - Real-Time AI Vision Assistant

> **"Your AI eyes, always ready to help."**

SightLine is a real-time, voice-driven AI vision assistant designed for **285 million visually impaired people worldwide**. It uses a phone's camera and microphone to provide continuous environmental narration through natural conversation — no text input required. Users simply speak and point their camera; SightLine describes what it sees, reads text aloud, warns about obstacles, and can be interrupted at any time.

**Category**: Live Agents | **Hackathon**: Gemini Live Agent Challenge

---

## Demo Video

[Watch the Demo on YouTube](YOUR_YOUTUBE_LINK_HERE) *(max 4 minutes)*

---

## Problem

- **285 million** visually impaired people worldwide (WHO)
- **2.2 billion** with near or distance vision impairment
- Existing solutions are expensive ($99/mo for Aira), depend on human volunteers (Be My Eyes), or require special hardware ($4,500 OrCam)
- No real-time, always-available, context-aware AI vision assistant exists today

## Solution

SightLine breaks the "text box" paradigm entirely:
- **Zero text interface** — 100% voice + camera
- **Bidirectional streaming** — continuous, real-time (not request/response)
- **Barge-in support** — interrupt the agent at any time by speaking
- **Native audio responses** — generated directly by Gemini, not TTS-over-text
- **Proactive safety warnings** — alerts about obstacles without being asked
- **Context-aware** — remembers what it described earlier in the conversation

---

## Architecture Diagram

```
                     USER'S DEVICE (Phone/Tablet)
               ┌────────────────────────────────────┐
               │        Next.js PWA (Frontend)       │
               │                                      │
               │   Camera ──► JPEG frames (1fps)      │
               │   Mic    ──► PCM 16kHz audio         │
               │   Speaker◄── Audio playback 24kHz    │
               │                                      │
               │        WebSocket Client              │
               └──────────────┬─────────────────────┘
                              │ WebSocket (wss://)
                              │ Audio + Video ↑↓
               ┌──────────────┴─────────────────────┐
               │      Google Cloud (GKE / Cloud Run) │
               │                                      │
               │   FastAPI + ADK Streaming Runner     │
               │   ┌────────────────────────────┐    │
               │   │  LiveRequestQueue           │    │
               │   │  ┌──────────────────────┐  │    │
               │   │  │  SightLine Agent      │  │    │
               │   │  │  gemini-2.5-flash-    │  │    │
               │   │  │  native-audio-preview │  │    │
               │   │  │                        │  │    │
               │   │  │  Tools:                │  │    │
               │   │  │  • switch_mode()       │  │    │
               │   │  │  • save_preference()   │  │    │
               │   │  │  • capture_frame()     │  │    │
               │   │  │  • get_history()       │  │    │
               │   │  │  • emergency_alert()   │  │    │
               │   │  └──────────────────────┘  │    │
               │   └────────────────────────────┘    │
               └───────┬──────────┬──────────┬──────┘
                       │          │          │
                  Vertex AI   Firestore   Cloud Storage
                 (Gemini API) (Sessions)  (Frames)
```

---

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **AI Model** | `gemini-2.5-flash-native-audio-preview` via Vertex AI | Real-time bidirectional audio + video streaming |
| **Agent Framework** | Google ADK (Python SDK) | Agent orchestration, LiveRequestQueue, function calling |
| **Backend** | Python / FastAPI | WebSocket server, session management, tool execution |
| **Frontend** | Next.js 15 PWA | Camera/mic capture, audio playback, accessible UI |
| **Database** | Cloud Firestore | User sessions, preferences, conversation history |
| **Object Storage** | Cloud Storage | Captured camera frames |
| **Container Orchestration** | Kubernetes + Helm | Scalable multi-environment deployment |
| **CI/CD** | GitHub Actions | Automated build, test, and deploy pipeline |
| **Deployment** | Google Cloud (GKE / Cloud Run) | Managed, auto-scaling infrastructure |

### Google Cloud Services Used
1. **Vertex AI** — Gemini Live API endpoint
2. **Cloud Firestore** — NoSQL database for sessions and preferences
3. **Cloud Storage** — Object storage for captured frames
4. **Google Kubernetes Engine (GKE)** / **Cloud Run** — Container hosting
5. **Cloud Build** — Container image building

---

## Agent Modes

SightLine adapts its behavior based on 4 specialized modes:

| Mode | Use Case | Behavior |
|------|----------|----------|
| **Navigation** | Walking, indoor/outdoor | Prioritizes obstacles, spatial layout, signs, stairs, crosswalks. Proactive hazard warnings. |
| **Reading** | Documents, labels, menus | Reads text verbatim. Handles medicine bottles, nutrition labels, mail. |
| **Shopping** | Stores, products | Identifies products, reads prices, compares nutritional info. |
| **Social** | Gatherings, meetings | Describes expressions, gestures, body language. Privacy-conscious — never identifies individuals. |

Switch modes by voice: *"Switch to reading mode"* or tap the mode buttons.

---

## Quick Start (Local Development)

### Prerequisites

- Python 3.12+
- Node.js 20+
- Google Cloud project with Vertex AI API enabled
- `gcloud` CLI installed and authenticated (`gcloud auth application-default login`)

### 1. Clone and configure

```bash
git clone https://github.com/YOUR_USERNAME/sightline.git
cd sightline
cp .env.example .env
```

Edit `.env` with your Google Cloud project details:
```env
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GCS_BUCKET=your-project-id-sightline-frames
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
FRONTEND_ORIGIN=http://localhost:3000
```

### 2. Start the backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Verify: `curl http://localhost:8000/health` should return `{"status": "ok"}`

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone or browser. Grant camera and microphone permissions when prompted.

### 4. Alternative: Docker Compose

```bash
cp .env.example .env
# Edit .env with your GCP project details
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:8080

---

## Cloud Deployment

### Option A: Cloud Run (Quick Deploy)

One-command deployment with automated infrastructure setup:

```bash
./deploy.sh YOUR_PROJECT_ID us-central1
```

This script:
- Enables all required GCP APIs
- Creates Cloud Storage bucket
- Builds and deploys backend and frontend to Cloud Run
- Configures CORS automatically
- Sets `min-instances=1` for warm starts

### Option B: Kubernetes + Helm (Production)

**Deploy to staging:**
```bash
helm upgrade --install sightline ./k8s/sightline \
  -f k8s/sightline/values-staging.yaml \
  --set global.imageRegistry=gcr.io/YOUR_PROJECT_ID \
  --set backend.image.tag=latest \
  --set frontend.image.tag=latest \
  --set secrets.gcpProjectId=YOUR_PROJECT_ID \
  --set backend.env.GCS_BUCKET=YOUR_BUCKET \
  --namespace sightline-staging --create-namespace
```

**Deploy to production:**
```bash
helm upgrade --install sightline ./k8s/sightline \
  -f k8s/sightline/values-prod.yaml \
  --set global.imageRegistry=gcr.io/YOUR_PROJECT_ID \
  --set backend.image.tag=latest \
  --set frontend.image.tag=latest \
  --set secrets.gcpProjectId=YOUR_PROJECT_ID \
  --set backend.env.GCS_BUCKET=YOUR_BUCKET \
  --namespace sightline-prod --create-namespace
```

### CI/CD Pipeline (GitHub Actions)

Push to `main` triggers the full pipeline:

```
PR → Lint & Test → (merge) → Build Images → Deploy Staging → (manual approve) → Deploy Production
```

Required GitHub Secrets:
| Secret | Description |
|--------|-------------|
| `GCP_PROJECT_ID` | Google Cloud project ID |
| `WIF_PROVIDER` | Workload Identity Federation provider |
| `WIF_SERVICE_ACCOUNT` | GCP service account for CI/CD |
| `GKE_CLUSTER_STAGING` | Staging GKE cluster name |
| `GKE_CLUSTER_PROD` | Production GKE cluster name |
| `GCS_BUCKET` | Cloud Storage bucket name |

---

## Project Structure

```
sightline/
├── backend/
│   ├── agent/
│   │   ├── sightline_agent.py    # ADK Agent with dynamic mode-based instructions
│   │   └── prompts.py            # System prompts for each mode
│   ├── tools/
│   │   ├── switch_mode.py        # Switch between navigation/reading/shopping/social
│   │   ├── save_preference.py    # Persist user preferences to Firestore
│   │   ├── capture_frame.py      # Save camera frame to Cloud Storage
│   │   ├── get_session_history.py # Retrieve conversation history
│   │   └── emergency_alert.py    # SOS emergency logging
│   ├── services/
│   │   ├── firestore_service.py  # Async Firestore client
│   │   └── storage_service.py    # Cloud Storage client
│   ├── main.py                   # FastAPI + WebSocket endpoint
│   ├── config.py                 # Environment configuration
│   ├── Dockerfile                # Production container (non-root, healthcheck)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Main app (wires all hooks + components)
│   │   │   ├── layout.tsx        # PWA metadata, service worker registration
│   │   │   ├── globals.css       # Dark theme, high contrast, 64px+ touch targets
│   │   │   └── api/health/       # Health check endpoint for K8s probes
│   │   ├── components/
│   │   │   ├── ModeSelector.tsx  # 2x2 mode grid with distinct colors
│   │   │   ├── StatusIndicator.tsx # Connection/listening/speaking status
│   │   │   └── EmergencyButton.tsx # Large red SOS button with haptic
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts   # Auto-reconnect WebSocket with backoff
│   │   │   ├── useCamera.ts      # Camera → JPEG frames at 1fps
│   │   │   ├── useMicrophone.ts  # Mic → PCM 16kHz audio chunks
│   │   │   └── useAudioPlayback.ts # Queue-based 24kHz audio playback
│   │   └── lib/
│   │       ├── audioUtils.ts     # PCM encode/decode, base64 conversion
│   │       └── constants.ts      # Config constants and mode definitions
│   ├── public/
│   │   ├── manifest.json         # PWA manifest
│   │   └── sw.js                 # Service worker for offline support
│   └── Dockerfile                # Multi-stage standalone build
├── k8s/sightline/                # Helm chart
│   ├── Chart.yaml
│   ├── values.yaml               # Shared defaults (HPA, probes, security)
│   ├── values-staging.yaml       # Staging: reduced replicas/resources
│   ├── values-prod.yaml          # Production: scaled up, PDB enabled
│   └── templates/                # 14 K8s manifests (deployments, services,
│                                 #   HPA, ingress, network policies, RBAC, PDB)
├── .github/workflows/
│   └── ci-cd.yml                 # 4-stage pipeline: lint → build → staging → prod
├── docker-compose.yml            # Local development orchestration
├── docker-compose.override.yml   # Dev hot-reload overrides
├── deploy.sh                     # One-command Cloud Run deployment
├── .env.example                  # Environment variable template
└── README.md
```

---

## Accessibility Design

SightLine is built for visually impaired users with these accessibility features:

- **Dark theme** with high contrast (WCAG AAA)
- **Minimum 18px font** size throughout
- **64px+ touch targets** for all interactive elements
- **ARIA labels** on all controls
- **Screen reader compatible** with `role` and `aria-live` attributes
- **No text input required** — entire UI is voice-driven
- **Haptic feedback** on emergency button
- **PWA installable** — works like a native app

---

## Competitive Landscape

| Product | Limitation | SightLine Advantage |
|---------|-----------|-------------------|
| **Aira** ($99/mo) | Human agents, limited availability | AI-powered, always available, fraction of cost |
| **Be My Eyes** (GPT-4 Vision) | Turn-based, not real-time | Continuous streaming, interruptible |
| **Seeing AI** (Microsoft) | Single-purpose tools, no conversation | Natural voice conversation, context-aware |
| **OrCam MyEye** ($4,500) | Expensive hardware required | Works on any phone, no special hardware |

---

## Prize Categories Targeted

| Prize | Amount | Why SightLine Qualifies |
|-------|--------|------------------------|
| **Best Live Agent** | $10,000 + $1K credits + Google Next tickets | Real-time bidirectional audio+video, barge-in, ADK Live API |
| **Grand Prize** | $25,000 + $3K credits + Next tickets + travel | Maximum innovation, social impact, 5 GCP services |
| **Best Multimodal UX** | $5,000 + $500 credits | Zero text box, voice+vision, native audio responses |
| **Best Innovation** | $5,000 + $500 credits | First real-time AI vision assistant for accessibility |

### Bonus Points Claimed
- [x] **Automated cloud deployment** (+0.2) — `deploy.sh` + Helm charts + GitHub Actions CI/CD
- [ ] **Blog post** (+0.6) — Publish on Medium with #GeminiLiveAgentChallenge
- [ ] **GDG membership** (+0.2) — Link Google Developer Group profile

---

## Key Technical Highlights

1. **Single Agent, Dynamic Instruction** — Mode switching updates the system prompt without tearing down the Live API stream
2. **LiveRequestQueue** — Buffers audio/video frames and handles barge-in natively
3. **Function Calling Tools** — 5 tools for mode switching, preferences, frame capture, history, emergency
4. **Echo Prevention** — Mic is muted during agent speech to prevent feedback loops
5. **WebSocket Protocol** — JSON messages with base64-encoded media, matching the ADK bidi-demo pattern
6. **Production Security** — Non-root containers, network policies, RBAC, read-only filesystems, pod disruption budgets

---

## Roadmap & Future Versions

### v2.0 — Smart Glasses Integration
- **Meta Ray-Ban / Google Glass** native support — hands-free, always-on vision
- **Spatial audio** — 3D directional sound cues ("door to your left" plays from the left speaker)
- **Depth sensing** with LiDAR-enabled devices for precise distance estimation ("obstacle 3 feet ahead")
- **Multi-camera fusion** — combine front + wide-angle cameras for 180-degree awareness

### v3.0 — Offline Intelligence & Edge AI
- **On-device Gemini Nano** for core scene description without internet connectivity
- **Hybrid inference** — edge model handles real-time navigation, cloud model handles complex tasks (reading, shopping)
- **Offline map caching** with pre-loaded indoor floorplans for malls, airports, hospitals
- **Battery-optimized** mode that reduces frame rate and uses lighter models for all-day use

### v4.0 — Community & Social Features
- **Volunteer overlay** — one-tap handoff to a human volunteer when AI confidence is low
- **Community-mapped hazards** — crowdsourced obstacle database (construction, broken sidewalks) with real-time alerts
- **Shared sessions** — caregiver or family member can see what the user sees remotely
- **Multi-language support** — real-time translation mode for travel (40+ languages via Gemini)

### v5.0 — Predictive & Autonomous Navigation
- **Route planning with hazard avoidance** — integrates Google Maps + real-time camera to suggest safest walking paths
- **Intersection intelligence** — detects traffic lights, crosswalk signals, and vehicle movement patterns
- **Indoor navigation** — Bluetooth beacon integration for turn-by-turn guidance inside buildings
- **Predictive scene understanding** — learns user's daily routes and proactively announces familiar landmarks

### v6.0 — Health & Wellness Integration
- **Medication management** — scan pill bottles, cross-reference with user's medication list, warn about interactions
- **Fall detection** — accelerometer-based fall detection with automatic emergency alert to contacts
- **Vital sign reading** — help users read blood pressure monitors, glucose meters, thermometers
- **Appointment assistant** — read hospital displays, navigate waiting rooms, identify when name is called

### Platform Expansion
- **Native iOS and Android apps** — lower latency, background processing, system-level accessibility hooks
- **Wearable SDK** — API for third-party smart glasses and wearable manufacturers to embed SightLine
- **Enterprise API** — white-label solution for hospitals, airports, museums, and retail stores
- **Developer marketplace** — community-built modes and tools (e.g., "bird identification mode", "art gallery guide")

### AI Model Evolution
- Upgrade to future Gemini models as they release for better vision understanding
- **Personalized voice cloning** — agent speaks in a voice the user finds most comfortable
- **Memory across sessions** — long-term context about user's home layout, workplace, frequent locations
- **Emotion-aware responses** — detect user stress or frustration from voice and adapt tone accordingly

---

## Market Opportunity

| Metric | Value |
|--------|-------|
| **Total Addressable Market** | 2.2 billion people with vision impairment globally |
| **Assistive Tech Market** | $4-16B, growing 10-14% CAGR |
| **Serviceable Market** | 285M blind/low-vision users with smartphone access |

### Revenue Model

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 30 min/day, navigation mode only |
| **Pro** | $9.99/mo | Unlimited usage, all 4 modes, session history, priority processing |
| **Enterprise** | Custom | White-label API, smart glasses SDK, HIPAA compliance, SLA |

### Funding Roadmap

| Round | Target | Milestone |
|-------|--------|-----------|
| **Pre-seed** | $500K–$1M | MVP launch, partnerships with 3 accessibility organizations |
| **Seed** | $2–5M | Native mobile apps, smart glasses beta, 10K active users |
| **Series A** | $10–20M | International expansion, insurance billing integration, hardware partnerships |

---

## License

MIT

---

*Built for the Gemini Live Agent Challenge 2026*
