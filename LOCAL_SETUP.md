# SightLine — Local Development Setup

## Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- **Google Cloud SDK** (`gcloud`) authenticated
- A **GCP project** with Vertex AI API enabled
- **Firestore** database created in the project
- **Cloud Storage** bucket for frame captures

---

## 1. Clone the Repository

```bash
git clone git@github.com:himanshu64/Gemini-live-agent.git
cd Gemini-live-agent
```

## 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and fill in your values:

```
GOOGLE_CLOUD_PROJECT=your-gcp-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GCS_BUCKET=your-gcp-project-id-sightline-frames
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
FRONTEND_ORIGIN=http://localhost:3000
```

## 3. Google Cloud Authentication

```bash
gcloud auth application-default login
gcloud config set project your-gcp-project-id
```

---

## Option A: Run Without Docker (Recommended for Development)

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be running at **http://localhost:8000**

### Frontend (in a separate terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend will be running at **http://localhost:3000**

---

## Option B: Run With Docker Compose

The `docker-compose.override.yml` enables hot-reload for local development.

### With Service Account Key (if not using ADC)

Place your service account JSON key at `backend/credentials/sa-key.json`, then:

```bash
docker compose up --build
```

### With Application Default Credentials

If you're already authenticated via `gcloud auth application-default login`, mount your ADC:

```bash
# Add this volume to the backend service in docker-compose.override.yml:
# - ~/.config/gcloud:/root/.config/gcloud:ro
docker compose up --build
```

| Service  | URL                    |
|----------|------------------------|
| Frontend | http://localhost:3000   |
| Backend  | http://localhost:8080   |

> **Note:** Docker Compose maps backend to port **8080**. When running without Docker, backend runs on port **8000**.

---

## Verify It's Working

1. **Health check:** Open http://localhost:8000/health (or `:8080` with Docker) — should return `{"status": "ok"}`
2. **Frontend:** Open http://localhost:3000 — the SightLine UI should load
3. **WebSocket:** The frontend connects to the backend WebSocket automatically when you start a session

---

## Useful Commands

```bash
# Run backend tests
cd backend && python -m pytest

# Lint frontend
cd frontend && npm run lint

# Build frontend for production
cd frontend && npm run build

# Stop Docker containers
docker compose down
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `google.auth.exceptions.DefaultCredentialsError` | Run `gcloud auth application-default login` |
| `ModuleNotFoundError: No module named 'google.adk'` | Ensure `pip install -r requirements.txt` completed successfully |
| WebSocket connection refused | Confirm backend is running and `NEXT_PUBLIC_WS_URL` matches the backend port |
| CORS errors in browser console | Ensure `FRONTEND_ORIGIN` in `.env` matches your frontend URL |
| Firestore permission denied | Check your GCP project has Firestore enabled and your credentials have access |
