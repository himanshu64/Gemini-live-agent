# SightLine — Production Architecture

**From hackathon prototype to startup-grade product serving millions of visually impaired users.**

---

## 1. Production Architecture Diagram

```
                    ┌─────────────────────────────────────────────────┐
                    │              USER DEVICES                       │
                    │                                                 │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
                    │  │ Phone    │  │ Tablet   │  │ Smart Glasses│  │
                    │  │ (PWA)    │  │ (PWA)    │  │ (Native SDK) │  │
                    │  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
                    │       │             │               │          │
                    └───────┼─────────────┼───────────────┼──────────┘
                            │             │               │
                            └──────┬──────┘───────────────┘
                                   │
                           ┌───────▼────────┐
                           │  Cloud CDN /   │
                           │  Cloud Load    │
                           │  Balancer      │
                           │  (Global L7)   │
                           └───────┬────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                     │
    ┌─────────▼──────────┐  ┌─────▼───────────┐  ┌─────▼──────────┐
    │  Cloud Run          │  │  Cloud Run       │  │  Cloud Run      │
    │  FRONTEND           │  │  AUTH API        │  │  STREAMING      │
    │  (Next.js SSR)      │  │  (Identity       │  │  BACKEND        │
    │                     │  │   Platform)      │  │  (FastAPI+ADK)  │
    │  - Static assets    │  │                  │  │                 │
    │  - SSR pages        │  │  - Firebase Auth │  │  - WebSocket /ws│
    │  - PWA manifest     │  │  - OAuth 2.0    │  │  - Health /health│
    │  - Service worker   │  │  - JWT tokens   │  │  - LiveRequest  │
    │                     │  │  - User mgmt    │  │    Queue         │
    │  min: 1, max: 20    │  │                  │  │                 │
    └─────────────────────┘  │  min: 1, max: 5  │  │  min: 1, max: 50│
                             └──────┬───────────┘  │  concurrency: 10│
                                    │              │  timeout: 3600s │
                                    │              │  session-affin: ✓│
                                    │              └──────┬──────────┘
                                    │                     │
              ┌─────────────────────┼─────────────────────┼─────────┐
              │                     │                     │         │
    ┌─────────▼──────┐   ┌─────────▼──────┐   ┌─────────▼──────┐  │
    │  Firebase       │   │  Vertex AI      │   │  Firestore      │  │
    │  Auth           │   │                 │   │                 │  │
    │  - Email/pass   │   │  Gemini Live    │   │  Collections:   │  │
    │  - Google SSO   │   │  API            │   │  - users/       │  │
    │  - Apple SSO    │   │  (bidirectional │   │  - sessions/    │  │
    │  - Phone auth   │   │   audio+video   │   │  - preferences/ │  │
    │                 │   │   streaming)    │   │  - events/      │  │
    │                 │   │                 │   │  - usage/       │  │
    └─────────────────┘   └─────────────────┘   └────────────────┘  │
                                                                     │
    ┌────────────────┐   ┌─────────────────┐   ┌────────────────┐   │
    │  Cloud Storage  │   │  Secret Manager  │   │  Cloud Armor    │  │
    │                 │   │                 │   │                 │  │
    │  - Frames (7d)  │   │  - API tokens   │   │  - DDoS protect │  │
    │  - User exports │   │  - Signing keys │   │  - Rate limiting│  │
    │  - Backups      │   │  - OAuth secrets│   │  - WAF rules    │  │
    └────────────────┘   └─────────────────┘   └────────────────┘   │
                                                                     │
    ┌────────────────┐   ┌─────────────────┐   ┌────────────────┐   │
    │  Cloud Logging  │   │  Cloud Monitor   │   │  Error Reporting│  │
    │                 │   │                 │   │                 │  │
    │  - Structured   │   │  - Latency P50  │   │  - Crash alerts │  │
    │    JSON logs    │   │    P95, P99     │   │  - Slack notify │  │
    │  - Audit trail  │   │  - WS duration  │   │  - PagerDuty    │  │
    │  - 30-day retain│   │  - Error rate   │   │                 │  │
    └────────────────┘   └─────────────────┘   └────────────────┘   │
              │                                                      │
              └──────────────────────────────────────────────────────┘
                              GOOGLE CLOUD PLATFORM
```

---

## 2. AI Agent Design

### 2.1 Agent Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   SightLine Agent System                  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Safety & Guardrails Layer              │  │
│  │  - Content filtering (violence, explicit)          │  │
│  │  - Hallucination detection (confidence thresholds) │  │
│  │  - Privacy filter (no face identification)         │  │
│  │  - Output validation (spatial accuracy check)      │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │              Context Manager                        │  │
│  │  - Spatial memory (last 30s of scene context)      │  │
│  │  - Object tracking (persistent object references)  │  │
│  │  - User preference recall (speech rate, verbosity) │  │
│  │  - Conversation history (last 5 exchanges)         │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │           Mode-Specific Reasoning Engine            │  │
│  │                                                    │  │
│  │  ┌──────────┐ ┌──────────┐ ┌────────┐ ┌────────┐ │  │
│  │  │Navigation│ │ Reading  │ │Shopping│ │ Social │ │  │
│  │  │          │ │          │ │        │ │        │ │  │
│  │  │Obstacles │ │OCR focus │ │Product │ │Describe│ │  │
│  │  │Directions│ │Verbatim  │ │Compare │ │Express.│ │  │
│  │  │Signs     │ │Structure │ │Prices  │ │No ID   │ │  │
│  │  │Hazards   │ │Labels    │ │Nutrit. │ │Privacy │ │  │
│  │  └──────────┘ └──────────┘ └────────┘ └────────┘ │  │
│  └────────────────────┬───────────────────────────────┘  │
│                       │                                   │
│  ┌────────────────────▼───────────────────────────────┐  │
│  │              Proactive Alert System                  │  │
│  │  - Obstacle detection → immediate warning           │  │
│  │  - Traffic light changes → "light turned green"     │  │
│  │  - Approaching stairs → "stairs ahead, 3 steps"     │  │
│  │  - Person approaching → "someone approaching left"  │  │
│  │  - Text appearing → "sign above reads EXIT"         │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │              Function Calling Tools                  │  │
│  │                                                    │  │
│  │  save_preference    → Firestore                    │  │
│  │  switch_mode        → Session state                │  │
│  │  capture_frame      → Cloud Storage + signed URL   │  │
│  │  get_session_history → Firestore events            │  │
│  │  emergency_alert    → Firestore + push notification│  │
│  │  request_human_help → Escalate to volunteer (v2)   │  │
│  │  get_location       → Reverse geocode (v2)         │  │
│  │  read_barcode       → Product lookup (v2)          │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 2.2 Safety Guardrails

| Guardrail | Implementation | Why |
|-----------|---------------|-----|
| **No face identification** | System prompt: "NEVER attempt to identify individuals by name" | Privacy law compliance (GDPR, BIPA) |
| **Confidence thresholds** | If unsure: "I think this might be..." vs. definitive statements | Prevent dangerous hallucinations (wrong medication label) |
| **Spatial accuracy** | Use relative terms ("ahead", "to your left") not absolute ("3.2 meters") | Inaccurate distances could cause injury |
| **Content filtering** | Skip explicit/disturbing descriptions; say "there is content I should skip" | User safety and comfort |
| **Medical disclaimer** | For medication reading: "Please verify with a pharmacist" | Liability protection |
| **Emergency detection** | If user says "help" or "fall", auto-trigger emergency flow | Life safety |

### 2.3 Hallucination Prevention

```python
# In system prompt — grounding rules
GROUNDING_RULES = """
CRITICAL RULES:
1. Only describe what is VISIBLE in the current frame
2. If the image is blurry, say "the image is unclear, try holding steadier"
3. Never guess text you cannot read clearly — say "I can partially read..."
4. For medications: ALWAYS say "please verify with a pharmacist or sighted person"
5. For street crossings: ALWAYS say "please listen for traffic before crossing"
6. If you lose video feed, immediately say "I've lost the camera feed"
7. Never describe people by race, ethnicity, or perceived identity
8. Use hedging language for uncertain observations: "it appears to be" not "it is"
"""
```

---

## 3. Accessibility-First UX Design

### 3.1 Voice-First Interaction Model

```
┌──────────────────────────────────────────────────────┐
│                  VOICE-FIRST UX FLOW                  │
│                                                      │
│  ┌──────────────────────────────────────────────────┐│
│  │ 1. APP LAUNCH                                    ││
│  │    🔊 "SightLine ready. Double-tap anywhere      ││
│  │        to start, or say 'start'."                ││
│  │    → Voice activation enabled by default         ││
│  └───────────────────┬──────────────────────────────┘│
│                      ▼                               │
│  ┌──────────────────────────────────────────────────┐│
│  │ 2. PERMISSION REQUEST                            ││
│  │    🔊 "SightLine needs your camera and            ││
│  │        microphone. Your phone will ask for        ││
│  │        permission. Tap Allow when you hear it."   ││
│  │    → Clear spoken guidance before browser dialog  ││
│  └───────────────────┬──────────────────────────────┘│
│                      ▼                               │
│  ┌──────────────────────────────────────────────────┐│
│  │ 3. ACTIVE SESSION                                ││
│  │    🔊 "Connected. Point your camera and speak."   ││
│  │    → Continuous audio+video streaming             ││
│  │    → Agent proactively describes scene            ││
│  │    → User can interrupt anytime (barge-in)        ││
│  │    → Haptic pulse every 30s = "still connected"   ││
│  └───────────────────┬──────────────────────────────┘│
│                      ▼                               │
│  ┌──────────────────────────────────────────────────┐│
│  │ 4. MODE SWITCHING                                ││
│  │    Voice: "Switch to reading mode"                ││
│  │    Touch: Swipe left/right to cycle modes         ││
│  │    🔊 "Switched to reading mode."                 ││
│  └───────────────────┬──────────────────────────────┘│
│                      ▼                               │
│  ┌──────────────────────────────────────────────────┐│
│  │ 5. EMERGENCY                                     ││
│  │    Voice: "Help!" or "Emergency"                  ││
│  │    Touch: Triple-tap anywhere OR hold SOS 2s      ││
│  │    🔊 "Emergency alert sent. Calling for help."   ││
│  │    → Vibration: long-short-long-short             ││
│  │    → Auto-capture frame + GPS                     ││
│  │    → Push notification to emergency contacts      ││
│  └──────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────┘
```

### 3.2 Touch Interface — Large Tactile Zones

```
┌──────────────────────────────┐
│         STATUS BAR           │  ← Tap to hear status
│  ● Connected - Listening     │     ("Connected, navigation mode,
│                              │      battery 82 percent")
├──────────────────────────────┤
│                              │
│                              │
│      MAIN ZONE               │  ← Swipe left/right: change mode
│      (Full screen)           │     Swipe up: repeat last response
│                              │     Swipe down: describe scene now
│      Transcript shown        │     Double-tap: start/stop
│      for sighted helpers     │
│                              │
│                              │
│                              │
├──────────────────────────────┤
│                              │
│  ┌────────────────────────┐  │
│  │     START / STOP       │  │  ← 80px tall, full width
│  │     (Large button)     │  │     Haptic feedback on press
│  └────────────────────────┘  │
│                              │
│  ┌────────────────────────┐  │
│  │     SOS EMERGENCY      │  │  ← Always red, always visible
│  │     (Hold 2 seconds)   │  │     Requires hold to prevent
│  └────────────────────────┘  │     accidental activation
│                              │
└──────────────────────────────┘
```

### 3.3 Gesture Controls

| Gesture | Action | Audio Confirmation |
|---------|--------|-------------------|
| **Double-tap** anywhere | Start / Stop | "Starting..." / "Stopped" |
| **Swipe left** | Previous mode | "Navigation mode" |
| **Swipe right** | Next mode | "Reading mode" |
| **Swipe up** | Repeat last response | (replays audio) |
| **Swipe down** | "Describe what you see now" | (triggers proactive description) |
| **Triple-tap** | Emergency SOS | "Emergency alert sent" |
| **Long press** (2s) SOS | Confirm emergency | Vibration pattern |
| **Two-finger tap** | Read current status | "Connected, navigation, 3 min session" |

### 3.4 Offline Fallback

When network is lost:
1. **Immediate**: 🔊 "Network connection lost. Limited features available."
2. **Cache mode**: Cached preferences, mode settings preserved
3. **Emergency**: SOS button still works — stores alert locally, sends when reconnected
4. **Reconnect**: Auto-reconnect with 🔊 "Reconnected. SightLine is active again."

---

## 4. Production Cloud Infrastructure

### 4.1 Firestore Schema

```
users/{user_id}
├── email: string
├── display_name: string
├── created_at: timestamp
├── plan: "free" | "pro" | "enterprise"
├── usage_reset_at: timestamp
├── emergency_contacts: [{ name, phone }]
│
├── preferences/
│   ├── speech_rate: "1.0"
│   ├── verbosity: "concise" | "detailed"
│   ├── language: "en-US"
│   ├── haptic_feedback: "true"
│   ├── auto_describe: "true"
│   └── preferred_voice: "Kore"
│
├── sessions/{session_id}
│   ├── started_at: timestamp
│   ├── ended_at: timestamp
│   ├── duration_seconds: number
│   ├── mode_history: ["navigation", "reading"]
│   ├── frames_sent: number
│   ├── audio_seconds: number
│   │
│   └── events/{event_id}
│       ├── type: "mode_switch" | "emergency" | "capture" | "error"
│       ├── data: map
│       └── timestamp: timestamp
│
└── usage/{month_key}   # e.g., "2026-03"
    ├── total_minutes: number
    ├── sessions_count: number
    ├── frames_processed: number
    └── last_updated: timestamp
```

### 4.2 Cloud Run Configuration

```yaml
# Backend streaming service
Service: sightline-backend
  CPU:              2
  Memory:           1Gi
  Min instances:    1          # Avoid cold starts for real-time
  Max instances:    50         # Scale for concurrent users
  Concurrency:      10         # 10 WebSocket sessions per instance
  Timeout:          3600s      # 1-hour max session
  Session affinity: true       # Sticky sessions for WebSocket
  CPU always allocated: true   # Required for WebSocket keepalive
  Startup probe:    /health, 5s interval, 3 failures
  Liveness probe:   /health, 30s interval, 3 failures

# Frontend
Service: sightline-frontend
  CPU:              1
  Memory:           256Mi
  Min instances:    1
  Max instances:    10
  Concurrency:      80
  CPU boost:        true       # Fast startup
```

### 4.3 Storage Lifecycle

```json
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": 1, "matchesPrefix": ["frames/"] }
    },
    {
      "action": { "type": "SetStorageClass", "storageClass": "COLDLINE" },
      "condition": { "age": 7, "matchesPrefix": ["exports/"] }
    },
    {
      "action": { "type": "Delete" },
      "condition": { "age": 90, "matchesPrefix": ["exports/"] }
    }
  ]
}
```

**Frame retention**: 24 hours only. Frames are processed in real-time and not needed after. Users can explicitly save a frame (capture_frame tool) which gets a signed URL valid for 1 hour.

### 4.4 Cost Optimization

| Resource | Strategy | Savings |
|----------|----------|---------|
| **Gemini API** | Use `gemini-live-2.5-flash` (cheapest live model) | Baseline |
| **Video frames** | 1 FPS at 640x480 JPEG 60% quality (~30KB/frame) | 90% vs raw video |
| **Audio** | 16kHz mono PCM (not 48kHz stereo) | 67% bandwidth reduction |
| **Cloud Run** | Scale to zero during off-hours (free tier users) | ~40% compute savings |
| **Firestore** | TTL on session documents (auto-delete after 30 days) | Storage costs |
| **Cloud Storage** | 24-hour lifecycle delete on frames | Near-zero storage |
| **CDN** | Cache frontend static assets globally | Reduced Cloud Run hits |

**Estimated cost per user-hour**: ~$0.08-0.15 (Gemini API is the primary cost)

### 4.5 Observability

```yaml
# Custom Cloud Monitoring metrics
metrics:
  - name: sightline/session_duration_seconds
    type: distribution
    labels: [mode, user_plan]

  - name: sightline/websocket_messages_total
    type: counter
    labels: [direction, message_type]  # upstream/downstream, audio/video/mode

  - name: sightline/agent_response_latency_ms
    type: distribution
    labels: [mode]

  - name: sightline/error_total
    type: counter
    labels: [error_type]  # gemini_api, websocket, auth, rate_limit

# Alerts
alerts:
  - name: High error rate
    condition: error_total > 10/min
    notify: PagerDuty + Slack

  - name: Session drops
    condition: avg(session_duration) < 30s over 5min
    notify: Slack #sightline-oncall

  - name: Gemini API latency
    condition: P95(agent_response_latency) > 3000ms
    notify: Slack #sightline-oncall

  - name: Cost spike
    condition: daily_cost > $500
    notify: Email + Slack
```

---

## 5. Security & Privacy Design

### 5.1 Data Protection Architecture

```
┌─────────────────────────────────────────────────┐
│              DATA PROTECTION LAYERS              │
│                                                 │
│  Layer 1: TRANSPORT                             │
│  ├── TLS 1.3 for all connections                │
│  ├── WSS (WebSocket Secure) only                │
│  └── Certificate pinning in native apps         │
│                                                 │
│  Layer 2: AUTHENTICATION                        │
│  ├── Firebase Auth (OAuth 2.0 / OIDC)           │
│  ├── JWT tokens with 1-hour expiry              │
│  ├── Refresh tokens (14-day expiry)             │
│  └── Per-session WebSocket tokens               │
│                                                 │
│  Layer 3: DATA MINIMIZATION                     │
│  ├── Frames: processed in memory, NOT stored    │
│  │   (unless user explicitly captures)          │
│  ├── Audio: streamed, never recorded            │
│  ├── Transcripts: session-scoped, deleted on end│
│  └── No biometric data stored                   │
│                                                 │
│  Layer 4: ACCESS CONTROL                        │
│  ├── Users can only access their own data       │
│  ├── Service accounts with minimal IAM roles    │
│  ├── No admin access to user frames             │
│  └── Audit logging on all data access           │
│                                                 │
│  Layer 5: COMPLIANCE                            │
│  ├── GDPR: data export, right to deletion       │
│  ├── CCPA: opt-out of data collection           │
│  ├── HIPAA: BAA for healthcare integrations     │
│  ├── ADA/WCAG 2.2 AA: accessibility standard    │
│  └── SOC 2 Type II: operational security        │
└─────────────────────────────────────────────────┘
```

### 5.2 Camera Data Protection

| Rule | Implementation |
|------|---------------|
| Frames never stored by default | Processed in-memory only, discarded after Gemini processes |
| User-initiated capture only | `capture_frame` tool requires explicit user request |
| Captured frames auto-delete | Cloud Storage lifecycle: 24 hours |
| Signed URLs expire | 1-hour expiry on all frame URLs |
| No face data stored | System prompt prohibits face identification |
| Frame quality only what's needed | 640x480 JPEG 60% — not enough for facial recognition |

### 5.3 Consent Flow

```
First Launch:
  1. 🔊 "Welcome to SightLine. Before we start, I need to explain
       how your data is used."
  2. 🔊 "SightLine uses your camera to describe your surroundings.
       Camera images are processed in real time and never stored
       unless you ask me to capture a frame."
  3. 🔊 "Your voice is streamed to understand your questions.
       Audio is never recorded or saved."
  4. 🔊 "Do you agree to these terms? Say 'I agree' or tap
       the button to continue."
  5. → Store consent timestamp in Firestore
  6. → Proceed to permission request
```

---

## 6. Monetization Strategy

### 6.1 Tiered Pricing

```
┌──────────────────────────────────────────────────────┐
│                   PRICING TIERS                       │
│                                                      │
│  FREE                    PRO                         │
│  $0/month                $9.99/month                 │
│                          ($7.99/mo annual)           │
│  ✓ 30 min/day            ✓ Unlimited usage           │
│  ✓ Navigation mode       ✓ All 4 modes               │
│  ✓ Basic audio           ✓ Premium voices            │
│  ✗ No session history    ✓ Session history (90 days) │
│  ✗ No frame capture      ✓ Frame capture + sharing   │
│  ✗ No preferences sync   ✓ Cloud preference sync     │
│  ✗ No emergency contacts ✓ Emergency contacts (5)    │
│  ✗ Standard support      ✓ Priority support          │
│                                                      │
│  ENTERPRISE              ACCESSIBILITY GRANT         │
│  Custom pricing          $0/month                    │
│                                                      │
│  ✓ Everything in Pro     ✓ Everything in Pro         │
│  ✓ SSO/SAML             ✓ For qualifying users      │
│  ✓ Admin dashboard       ✓ Verified via disability   │
│  ✓ Usage analytics         organizations             │
│  ✓ Custom voice/persona  ✓ Partnered with NFB, ACB,  │
│  ✓ API access              RNIB, Vision Australia    │
│  ✓ SLA (99.9% uptime)                               │
│  ✓ Dedicated support                                 │
└──────────────────────────────────────────────────────┘
```

### 6.2 Revenue Streams

| Stream | Year 1 | Year 2 | Year 3 |
|--------|--------|--------|--------|
| **B2C Subscriptions** | $200K | $1.5M | $8M |
| **B2B Enterprise** | $50K | $500K | $3M |
| **API Licensing** | $0 | $200K | $2M |
| **Hardware Partnerships** | $0 | $300K | $5M |
| **Healthcare/Insurance** | $0 | $100K | $4M |
| **Total** | **$250K** | **$2.6M** | **$22M** |

### 6.3 B2B Integration Opportunities

| Partner Type | Integration | Revenue Model |
|-------------|-------------|---------------|
| **Smart glasses OEMs** (Meta, Xreal, Vuzix) | Embedded SDK, native integration | Per-device license + rev share |
| **Healthcare providers** | Prescribed assistive technology | Insurance reimbursement (CPT codes) |
| **Transit authorities** | Indoor navigation in stations | Municipal contract |
| **Retailers** | In-store shopping assistant | Per-store subscription |
| **Education** | Classroom accessibility tool | Per-student licensing |
| **Workplace** | ADA accommodation tool | Enterprise seat license |

---

## 7. Go-to-Market Strategy

### 7.1 Launch Phases

```
Phase 1: VALIDATE (Month 1-3)
├── Private beta with 50 blind users
├── Partner: National Federation of the Blind (NFB)
├── Weekly user interviews
├── Iterate on voice UX based on feedback
└── Goal: 80% daily retention in beta cohort

Phase 2: LAUNCH (Month 4-6)
├── Public launch on web (PWA)
├── Product Hunt launch
├── Press: TechCrunch, The Verge, Ars Technica
├── Accessibility conference demos (CSUN, M-Enabling)
├── Free tier to drive adoption
└── Goal: 10,000 registered users

Phase 3: GROW (Month 7-12)
├── iOS native app (App Store accessibility feature)
├── Android native app
├── Pro tier monetization
├── Enterprise pilot programs
├── Smart glasses SDK beta
└── Goal: 50,000 users, $200K ARR

Phase 4: SCALE (Year 2)
├── Multi-language support (10 languages)
├── Hardware partnerships (Meta Ray-Ban, etc.)
├── Healthcare/insurance billing
├── API platform for developers
└── Goal: 500,000 users, $2.6M ARR
```

### 7.2 Distribution Channels

| Channel | Strategy | CAC Target |
|---------|----------|------------|
| **Disability organizations** | Partnership programs, free Pro tier for members | $0 (organic) |
| **App stores** | Accessibility category featuring | $2-5 |
| **Social media** | Blind creator partnerships (TikTok, YouTube) | $5-10 |
| **Healthcare** | Ophthalmologist referral program | $15-25 |
| **Enterprise** | Direct sales to HR/accessibility teams | $50-100 |
| **Hardware bundling** | Pre-installed on smart glasses | $0 (rev share) |

---

## 8. Multi-Region Deployment

### 8.1 Global Architecture

```
                        ┌──────────────┐
                        │  Cloud DNS   │
                        │  (GeoDNS)    │
                        └──────┬───────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼──────┐ ┌──────▼───────┐ ┌──────▼───────┐
    │  us-central1   │ │  europe-west1│ │  asia-east1  │
    │                │ │              │ │              │
    │  Cloud Run     │ │  Cloud Run   │ │  Cloud Run   │
    │  (backend)     │ │  (backend)   │ │  (backend)   │
    │                │ │              │ │              │
    │  Vertex AI     │ │  Vertex AI   │ │  Vertex AI   │
    │  (Gemini)      │ │  (Gemini)    │ │  (Gemini)    │
    │                │ │              │ │              │
    │  Firestore     │ │  (replica)   │ │  (replica)   │
    │  (primary)     │ │              │ │              │
    └────────────────┘ └──────────────┘ └──────────────┘
```

### 8.2 Latency Strategy

| Component | Target Latency | Strategy |
|-----------|---------------|----------|
| **WebSocket connect** | < 200ms | Regional Cloud Run + GeoDNS |
| **Audio round-trip** | < 500ms | Same-region Vertex AI |
| **Frame processing** | < 1s | Compress at source (JPEG 60%) |
| **Mode switch** | < 100ms | In-memory state, no DB round-trip |
| **Emergency alert** | < 2s | Fire-and-forget write + async notification |

### 8.3 Failover

```
Primary region down:
  1. Cloud DNS detects health check failure (30s)
  2. Traffic routed to next-nearest region
  3. User hears: "Brief reconnection, one moment..."
  4. New WebSocket established to healthy region
  5. User preferences loaded from Firestore (multi-region)
  6. Session resumes within ~5 seconds
```

---

## 9. Competitive Differentiation

```
┌────────────────────┬───────────┬───────────┬──────────┬──────────┬──────────┐
│                    │ SightLine │   Aira    │ Be My    │ Seeing   │ OrCam    │
│                    │           │           │ Eyes     │ AI       │ MyEye    │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Real-time stream   │  ✓ Live   │ ✓ Human  │ ✗ Turn   │ ✗ Photo  │ ✗ Photo  │
│                    │  AI       │ agents   │ based    │ based    │ based    │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Always available   │  ✓ 24/7   │ ✗ Limited│ ✗ Needs  │ ✓ 24/7   │ ✓ 24/7   │
│                    │  instant  │ hours    │ volunteer│          │          │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Cost               │  Free-$10 │ $99/mo   │ Free     │ Free     │ $4,500   │
│                    │           │          │          │          │ hardware │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Conversation       │  ✓ Natural│ ✓ Human  │ ✗ Text   │ ✗ Single │ ✗ Single │
│                    │  voice    │ voice    │ response │ command  │ command  │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Interruptions      │  ✓ Native │ ✓ Human  │ ✗ No     │ ✗ No     │ ✗ No     │
│ (barge-in)         │  barge-in │          │          │          │          │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Proactive alerts   │  ✓ Auto   │ ✓ Human  │ ✗ No     │ ✗ No     │ ✗ No     │
│                    │  detects  │ judgment │          │          │          │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Hardware required  │  Phone    │ Phone +  │ Phone    │ Phone    │ $4,500   │
│                    │  only     │ glasses  │          │          │ glasses  │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Context memory     │  ✓ Spatial│ ✓ Human  │ ✗ None   │ ✗ None   │ ✗ None   │
│                    │  + convo  │ memory   │          │          │          │
├────────────────────┼───────────┼───────────┼──────────┼──────────┼──────────┤
│ Multiple modes     │  ✓ 4 modes│ ✗ General│ ✗ General│ ✓ Separate│ ✓ Separate│
│                    │  seamless │ purpose  │ purpose  │ apps     │ features │
└────────────────────┴───────────┴───────────┴──────────┴──────────┴──────────┘

SightLine's moat:
1. ONLY product with real-time AI streaming + barge-in (not turn-based)
2. 100x cheaper than Aira ($10 vs $99/mo)
3. No special hardware (unlike OrCam at $4,500)
4. Context-aware conversation (unlike Seeing AI's single-shot)
5. Proactive safety alerts (unlike Be My Eyes' reactive model)
```

---

## 10. Long-Term Product Roadmap

```
2026 Q2: FOUNDATION
├── ✓ PWA with 4 modes
├── ✓ Gemini Live streaming
├── ✓ Cloud Run deployment
├── User accounts + preferences
├── Usage tracking + free tier limits
└── Basic analytics dashboard

2026 Q3: NATIVE APPS
├── iOS app (Swift, ARKit integration)
├── Android app (Kotlin, ARCore)
├── Push notifications for emergency contacts
├── Offline mode (on-device Gemini Nano)
└── Multi-language support (5 languages)

2026 Q4: SMART GLASSES
├── Meta Ray-Ban SDK integration
├── Xreal Air integration
├── Always-on ambient mode
├── Wake word: "Hey SightLine"
├── Spatial audio (directional sound cues)
└── Low-power continuous monitoring

2027 Q1: INTELLIGENCE
├── Scene memory (remember your home layout)
├── Indoor mapping (build spatial model over time)
├── Personalized descriptions (learn what matters to you)
├── Object persistence ("the mug you left on the counter")
└── Multi-turn complex tasks ("guide me to the pharmacy")

2027 Q2: PLATFORM
├── Developer API (REST + WebSocket)
├── SDK for hardware manufacturers
├── Plugin system for third-party tools
├── Accessibility testing toolkit
└── White-label enterprise solution

2027 Q3: AUTONOMY
├── AR navigation overlays (smart glasses)
├── Real-time GPS + camera fusion
├── Public transit integration
├── Store aisle navigation (indoor positioning)
└── Autonomous obstacle avoidance alerts

2027 Q4: ECOSYSTEM
├── Wearable devices (smart watch companion)
├── Smart home integration (describe room state)
├── Social features (share descriptions with friends)
├── Community-contributed location descriptions
└── Healthcare provider portal
```

---

## 11. Key Metrics to Track

| Category | Metric | Target |
|----------|--------|--------|
| **Engagement** | Daily active users | 10K (Y1), 100K (Y2) |
| **Engagement** | Avg session duration | > 5 minutes |
| **Engagement** | Sessions per day per user | > 3 |
| **Retention** | Day-1 retention | > 60% |
| **Retention** | Day-30 retention | > 40% |
| **Quality** | Agent response latency (P95) | < 800ms |
| **Quality** | WebSocket uptime | > 99.9% |
| **Quality** | User-reported accuracy | > 90% |
| **Safety** | Emergency response time | < 3 seconds |
| **Safety** | False hazard warning rate | < 5% |
| **Business** | Free-to-Pro conversion | > 8% |
| **Business** | Monthly churn (Pro) | < 3% |
| **Business** | CAC payback period | < 4 months |
| **Cost** | Cost per user-hour | < $0.10 |

---

*This document is a living blueprint. Update as the product evolves and user feedback shapes priorities.*

*Last updated: March 13, 2026*
*Hackathon deadline: March 16, 2026, 5:00 PM PT*
