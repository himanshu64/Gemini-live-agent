# SightLine Security Guide

This document covers every security measure in SightLine and what you need to configure before deploying.

---

## Quick Checklist Before Deploying

```
[ ] Generate API_TOKEN (see step 1)
[ ] Set environment variables (see step 2)
[ ] Deploy Firestore rules (see step 3)
[ ] Verify GCS bucket lifecycle (see step 4)
[ ] Set GCP budget alert (see step 5)
[ ] (K8s only) Configure secrets + Workload Identity (see step 6)
```

---

## Step 1: Generate an API Token

Every WebSocket connection must send a valid token. Without it, the backend rejects the connection immediately.

```bash
# Generate a random 32-byte token
openssl rand -base64 32
```

Save the output. You'll use the same value in both backend and frontend.

---

## Step 2: Set Environment Variables

### Cloud Run (deploy.sh)

The deploy script requires `API_TOKEN` to be set before running:

```bash
export API_TOKEN="your-generated-token-here"
./deploy.sh my-gcp-project us-central1
```

The script automatically passes these to Cloud Run:
- Backend: `API_TOKEN` (validates WebSocket connections)
- Frontend: `NEXT_PUBLIC_API_TOKEN` (sent on WebSocket connect)

### Local Development (.env)

Copy `.env.example` and fill in real values:

```bash
cp .env.example .env
```

Your `.env` must include:

```
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_LOCATION=us-central1
GCS_BUCKET=your-project-id-sightline-frames
API_TOKEN=your-generated-token-here
FRONTEND_ORIGIN=http://localhost:3000
```

For the frontend, create `frontend/.env.local`:

```
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_TOKEN=your-generated-token-here
```

**Both tokens must be identical.**

---

## Step 3: Deploy Firestore Security Rules

The file `firestore.rules` in the project root locks down direct Firestore access. Only authenticated service accounts can read/write session data.

### If you have the Firebase CLI:

```bash
firebase deploy --only firestore:rules --project=your-project-id
```

### If you don't have the Firebase CLI:

1. Go to https://console.firebase.google.com
2. Select your project
3. Navigate to Firestore > Rules
4. Paste the contents of `firestore.rules`
5. Click **Publish**

### What the rules do:

- Default deny-all on every collection
- `/sessions/{sessionId}/**` — only accessible by authenticated service accounts
- No client-side Firestore access is allowed
- This is defence-in-depth: even if someone gets a Firestore client reference, they can't read/write without SA credentials

---

## Step 4: Verify GCS Bucket Lifecycle

The deploy script automatically sets a lifecycle rule that **deletes frames older than 7 days**. This limits storage costs and reduces privacy exposure.

To verify after deployment:

```bash
gsutil lifecycle get gs://your-project-id-sightline-frames
```

Expected output:

```json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 7, "matchesPrefix": ["frames/"]}
    }
  ]
}
```

### Important: Frames are now private

Uploaded frames are **not** publicly accessible. The backend returns signed URLs that expire after 1 hour. If the agent's `capture_frame` tool is called, the URL it returns will stop working after 60 minutes.

---

## Step 5: Set a GCP Budget Alert

Go to:

```
https://console.cloud.google.com/billing/budgets?project=your-project-id
```

Create a budget with:
- **Amount**: Set based on your expected usage (e.g., $50 for hackathon)
- **Alerts**: 50%, 80%, 100% thresholds
- **Actions**: Email notification

Key cost drivers:
- **Vertex AI (Gemini Live API)** — billed per audio/video minute
- **Cloud Storage** — billed per GB stored + egress
- **Cloud Run** — billed per vCPU-second and memory-GB-second

---

## Step 6: Kubernetes Deployment (Optional)

If deploying to GKE instead of Cloud Run, additional configuration is needed.

### 6a. Set API Token in Helm Values

In your environment-specific values file (e.g., `values-prod.yaml`):

```yaml
secrets:
  gcpProjectId: "your-project-id"
  apiToken: "your-generated-token-here"
```

The token is stored as a Kubernetes Secret and injected as the `API_TOKEN` environment variable in the backend pod.

### 6b. Workload Identity (Recommended)

Workload Identity eliminates the need for service account key files. It's more secure because there's no key to steal.

**Setup:**

```bash
PROJECT_ID=your-project-id
GSA_NAME=sightline-backend
KSA_NAME=sightline  # Kubernetes service account (created by Helm)
NAMESPACE=sightline

# Create a GCP service account
gcloud iam service-accounts create $GSA_NAME \
  --project=$PROJECT_ID

# Grant it the roles it needs
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Allow the KSA to impersonate the GSA
gcloud iam service-accounts add-iam-policy-binding \
  ${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="serviceAccount:${PROJECT_ID}.svc.id.goog[${NAMESPACE}/${KSA_NAME}]"
```

Then in your Helm values:

```yaml
serviceAccount:
  create: true
  gcpServiceAccount: "sightline-backend@your-project-id.iam.gserviceaccount.com"

secrets:
  gcpProjectId: "your-project-id"
  apiToken: "your-generated-token-here"
  gcpSaKey: ""   # Leave empty — Workload Identity is used instead
```

When `gcpSaKey` is empty, the backend deployment skips mounting the key file volume and doesn't set `GOOGLE_APPLICATION_CREDENTIALS`. GKE automatically provides credentials via the metadata server.

### 6c. Without Workload Identity (Legacy)

If you can't use Workload Identity, create a key file and pass it via Helm:

```bash
gcloud iam service-accounts keys create sa-key.json \
  --iam-account=sightline-backend@your-project-id.iam.gserviceaccount.com

# Pass the key content as a Helm value
helm upgrade sightline ./k8s/sightline \
  --set secrets.gcpSaKey="$(cat sa-key.json)"
```

This is less secure — rotate the key regularly and restrict who can access the Kubernetes secret.

---

## What Each Security Layer Does

### Authentication (P0)

| Layer | File | What It Does |
|-------|------|-------------|
| WebSocket token | `backend/main.py:150-158` | Rejects connections without valid `API_TOKEN` |
| Token in frontend | `frontend/src/hooks/useWebSocket.ts:27` | Sends token as `?token=` query param |
| Token config | `backend/config.py:16` | `API_TOKEN` is a required field — app won't start without it |

### Input Validation (P0 + P1)

| Layer | File | What It Does |
|-------|------|-------------|
| Message size limit | `backend/main.py:52-55` | Rejects WebSocket messages over 1 MB |
| Rate limiting | `backend/main.py:57-63` | Max 30 messages/second per connection (sliding window) |
| JSON validation | `backend/main.py:65-69` | Rejects malformed JSON with error message |
| Frame size limit | `backend/services/storage_service.py:23-24` | Rejects frames over 10 MB |
| Content-type allowlist | `backend/services/storage_service.py:26-27` | Only `image/jpeg`, `image/png`, `image/webp` |
| Preference key allowlist | `backend/tools/save_preference.py:10-18` | Only 8 allowed keys |
| Preference value length | `backend/tools/save_preference.py:21` | Max 256 characters |
| Firestore ID validation | `backend/services/firestore_service.py:16-21` | Regex: alphanumeric, hyphens, underscores, 1-128 chars |
| Events query cap | `backend/services/firestore_service.py:24` | Max 50 events per query |

### Storage Security (P0)

| Layer | File | What It Does |
|-------|------|-------------|
| Private blobs | `backend/services/storage_service.py:38-42` | Frames uploaded as private (no `make_public()`) |
| Signed URLs | `backend/services/storage_service.py:38-42` | URLs expire after 1 hour |
| Lifecycle rule | `deploy.sh:51-61` | Auto-delete frames after 7 days |

### HTTP Security Headers (P2)

| Header | Value | Purpose |
|--------|-------|---------|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Forces HTTPS for 1 year |
| `Content-Security-Policy` | `default-src 'self'; frame-ancestors 'none'` | Restricts resource loading |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Blocks browser features at HTTP level |

These are set in `backend/main.py` via the `add_security_headers` middleware.

### CORS (P0 + P2)

| Setting | Value | Why |
|---------|-------|-----|
| `allow_origins` | `[config.FRONTEND_ORIGIN]` | Only your frontend domain |
| `allow_methods` | `["GET", "OPTIONS"]` | Only methods the API needs |
| `allow_headers` | `["Authorization", "Content-Type"]` | Only headers the API needs |

Set in `backend/main.py:22-28`.

### Kubernetes Network Security (existing)

| Resource | File | What It Does |
|----------|------|-------------|
| Network Policy | `k8s/.../networkpolicy.yaml` | Default deny, explicit allow between pods |
| RBAC | `k8s/.../rbac.yaml` | Minimal permissions for service accounts |
| Security Context | `k8s/.../backend-deployment.yaml:19-25` | Non-root, read-only filesystem, drop all capabilities |
| Pod Disruption Budget | `k8s/.../poddisruptionbudget.yaml` | Ensures availability during updates |
| Ingress rate limiting | `k8s/.../values.yaml` | `limit-rps: 20`, `limit-connections: 10`, `proxy-body-size: 2m` |

### Audit Logging (P2)

All security-relevant actions are logged:
- WebSocket connection accepted (with client IP and session ID)
- WebSocket connection rejected (with client IP)
- Firestore session saves
- Firestore preference saves
- Firestore event writes

Logs go to stdout, which Cloud Run and GKE automatically forward to Cloud Logging.

---

## Configurable Limits

These can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_TOKEN` | *(required)* | Shared secret for WebSocket auth |
| `WS_MAX_MESSAGE_BYTES` | `1048576` (1 MB) | Max size of a single WebSocket message |
| `WS_RATE_LIMIT_PER_SEC` | `30` | Max WebSocket messages per second per connection |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

---

## Allowed Preference Keys

The `save_preference` tool only accepts these keys:

- `speech_rate`
- `verbosity`
- `language`
- `contrast`
- `font_size`
- `haptic_feedback`
- `audio_descriptions`
- `auto_capture`

To add a new preference, update `ALLOWED_KEYS` in `backend/tools/save_preference.py`.

---

## Threat Model Summary

| Attack Vector | Mitigation | Status |
|---------------|-----------|--------|
| Unauthenticated WebSocket access | API token required on connect | Done |
| Large payload DoS | 1 MB message limit | Done |
| Message flood DoS | 30 msg/sec rate limit | Done |
| Public frame exposure | Signed URLs (1h expiry) | Done |
| Frame storage cost growth | 7-day lifecycle auto-delete | Done |
| Arbitrary preference injection | Key allowlist + value length cap | Done |
| Firestore path traversal | Regex validation on all IDs | Done |
| Direct Firestore access | Security rules (authenticated SA only) | Done |
| Clickjacking / MIME sniffing | Security headers | Done |
| Overly permissive CORS | Restricted methods + headers | Done |
| SA key theft (K8s) | Workload Identity support | Done |
| GCP cost overrun | Budget alerts + concurrency limits | Manual step |
