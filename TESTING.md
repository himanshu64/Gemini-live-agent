# SightLine — Reproducible Testing Guide

This guide lets judges and reviewers test SightLine end-to-end in under 10 minutes using the live deployed app or by running it locally.

---

## Option 1: Test the Live Deployed App (Fastest)

> No setup required. Works on any device with a camera and microphone.

1. Open the app in your browser: **[https://sightline.app](https://sightline.app)** ← replace with your Cloud Run URL
2. Sign in with your Google account
3. Allow camera and microphone access when prompted
4. Tap **Start Session**
5. Speak naturally — try the test scenarios below

---

## Option 2: Run Locally

### Requirements

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Node.js | 18+ |
| gcloud CLI | latest |
| GCP project | with Vertex AI + Firestore enabled |

### Steps

```bash
# 1. Clone
git clone https://github.com/himanshu64/Gemini-live-agent.git
cd Gemini-live-agent

# 2. Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # fill in GCP project ID and region
gcloud auth application-default login
uvicorn main:app --host 0.0.0.0 --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
npm run dev
```

Open **http://localhost:3000**

---

## Test Scenarios

Run these in order to verify all core features work correctly.

### 1. Navigation Mode — Obstacle Detection

**Goal:** Verify the agent describes the environment and warns about hazards.

1. Select **Navigation** mode
2. Point your camera around the room
3. Say: *"What's in front of me?"*
4. Expected: Agent describes the scene with spatial context (distances, objects, layout)
5. Say: *"Is it safe to walk forward?"*
6. Expected: Agent identifies any obstacles or hazards

---

### 2. Reading Mode — Text Recognition

**Goal:** Verify the agent reads text from the camera accurately.

1. Switch to **Reading** mode (say *"switch to reading mode"*)
2. Hold a book, label, receipt, or any printed text up to the camera
3. Say: *"Read this to me"*
4. Expected: Agent reads the text aloud verbatim
5. Hold camera too far away intentionally
6. Expected: Agent asks you to hold the camera closer (not hallucinate)

---

### 3. Shopping Mode — Product Identification

**Goal:** Verify product recognition and price reading.

1. Switch to **Shopping** mode (say *"switch to shopping mode"*)
2. Point camera at a product (food item, bottle, box)
3. Say: *"What product is this?"*
4. Expected: Agent identifies the product and reads any visible pricing or nutritional info

---

### 4. Barge-In — Interrupt the Agent

**Goal:** Verify the agent can be interrupted mid-sentence.

1. Ask the agent a question that triggers a long response: *"Describe everything you can see in detail"*
2. While the agent is speaking, say: *"Stop, what's on my left?"*
3. Expected: Agent immediately stops and responds to the new question

---

### 5. Voice Mode Switching

**Goal:** Verify hands-free mode switching via voice.

1. Say: *"Switch to social mode"*
2. Expected: Agent confirms the switch and adapts its behavior
3. Point camera at a person
4. Say: *"How does this person look?"*
5. Expected: Agent describes general appearance and expression — never names the person

---

### 6. Session Persistence

**Goal:** Verify context is maintained across the conversation.

1. In Navigation mode, ask: *"What did you see when we started?"*
2. Expected: Agent recalls earlier scene descriptions from the session

---

## Verification Checklist

| Feature | Expected Result | Pass/Fail |
|---------|----------------|-----------|
| Session starts without errors | WebSocket connects, agent speaks a greeting | |
| Navigation mode describes scene | Spatial, concise description within 1 second | |
| Reading mode reads text accurately | Verbatim or near-verbatim reading | |
| Shopping mode identifies products | Correct product name and details | |
| Barge-in works | Agent stops mid-sentence when interrupted | |
| Voice mode switching | Mode changes without stream interruption | |
| No text input required | Entire session is voice + camera only | |
| Audio response sounds natural | Not robotic TTS — native Gemini audio | |

---

## Health Checks

```bash
# Backend health
curl https://your-cloud-run-url/health
# Expected: {"status": "ok"}

# Backend API docs
open https://your-cloud-run-url/docs
```

---

## Known Limitations

| Limitation | Notes |
|-----------|-------|
| Requires HTTPS for camera access | Use the deployed URL or localhost (both work) |
| Best on Chrome/Edge | getUserMedia works on all modern browsers, but Chrome is recommended |
| Video frame quality | Agent will ask you to move camera closer if image is blurry |
| Cold start latency | First session may take 2–3 seconds longer if `min-instances=0` |

---

## Support

If you hit issues testing, open a GitHub issue or reach out:

- **Himanshu Sharma** — [LinkedIn](https://www.linkedin.com/in/himanshu-sharma-0666a5129/)
- **Ashish Beck** — [LinkedIn](https://www.linkedin.com/in/ashish-beck/)
