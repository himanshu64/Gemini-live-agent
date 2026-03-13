#!/usr/bin/env bash
set -euo pipefail

# SightLine - Google Cloud Run Deployment Script
# Usage: ./deploy.sh [PROJECT_ID] [REGION]

PROJECT_ID="${1:-${GOOGLE_CLOUD_PROJECT:-}}"
REGION="${2:-us-central1}"

if [ -z "$PROJECT_ID" ]; then
  echo "Usage: ./deploy.sh <PROJECT_ID> [REGION]"
  echo "  or set GOOGLE_CLOUD_PROJECT environment variable"
  exit 1
fi

# Require API_TOKEN to be set — refuse to deploy without it.
if [ -z "${API_TOKEN:-}" ]; then
  echo "ERROR: API_TOKEN environment variable must be set before deploying."
  echo "  Generate one with: openssl rand -base64 32"
  exit 1
fi

# Require Firebase config for frontend auth
if [ -z "${NEXT_PUBLIC_FIREBASE_API_KEY:-}" ] || \
   [ -z "${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:-}" ] || \
   [ -z "${NEXT_PUBLIC_FIREBASE_PROJECT_ID:-}" ]; then
  echo "ERROR: Firebase environment variables must be set before deploying."
  echo "  Required: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID"
  exit 1
fi

echo "==> Deploying SightLine to project: $PROJECT_ID, region: $REGION"

# Enable required APIs
echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  identitytoolkit.googleapis.com \
  --project="$PROJECT_ID" --quiet

# Deploy Firestore security rules
echo "==> Deploying Firestore security rules..."
if command -v firebase &>/dev/null; then
  firebase deploy --only firestore:rules --project="$PROJECT_ID"
else
  echo "WARNING: firebase CLI not found. Deploy firestore.rules manually."
fi

# Create GCS bucket if not exists (with lifecycle rule for auto-cleanup)
BUCKET_NAME="${PROJECT_ID}-sightline-frames"
if ! gsutil ls -b "gs://${BUCKET_NAME}" 2>/dev/null; then
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}"
  echo "==> Setting GCS lifecycle: auto-delete frames after 7 days..."
  cat <<'LIFECYCLE' > /tmp/sightline-lifecycle.json
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {"age": 7, "matchesPrefix": ["frames/"]}
    }
  ]
}
LIFECYCLE
  gsutil lifecycle set /tmp/sightline-lifecycle.json "gs://${BUCKET_NAME}"
  rm -f /tmp/sightline-lifecycle.json
fi

# Build and deploy backend
echo "==> Building and deploying backend..."
gcloud run deploy sightline-backend --quiet \
  --source=./backend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET=$BUCKET_NAME,API_TOKEN=$API_TOKEN,GOOGLE_GENAI_USE_VERTEXAI=TRUE,TURNSTILE_SECRET_KEY=${TURNSTILE_SECRET_KEY:-},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-},JWT_SECRET=${JWT_SECRET:-$API_TOKEN}" \
  --update-secrets="ADMIN_EMAILS=ADMIN_EMAILS:latest" \
  --min-instances=0 \
  --max-instances=4 \
  --concurrency=20 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=3600 \
  --session-affinity

# Get backend URL
BACKEND_URL=$(gcloud run services describe sightline-backend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="value(status.url)")

WS_URL=$(echo "$BACKEND_URL" | sed 's|https://|wss://|')/ws

echo "==> Backend deployed at: $BACKEND_URL"

# Build and deploy frontend
# NEXT_PUBLIC_* vars must be set at build time (baked into JS bundles by Next.js)
echo "==> Building and deploying frontend..."
gcloud run deploy sightline-frontend --quiet \
  --source=./frontend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-build-env-vars="NEXT_PUBLIC_WS_URL=$WS_URL,NEXT_PUBLIC_API_URL=$BACKEND_URL,NEXT_PUBLIC_API_TOKEN=$API_TOKEN,NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID,NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY:-},NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}" \
  --min-instances=0 \
  --max-instances=2 \
  --memory=256Mi \
  --cpu=1

FRONTEND_URL=$(gcloud run services describe sightline-frontend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format="value(status.url)")

# Update backend with frontend origin for CORS
echo "==> Updating backend CORS..."
gcloud run services update sightline-backend --quiet \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --update-env-vars="FRONTEND_ORIGIN=$FRONTEND_URL"

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "WebSocket: $WS_URL"
echo ""
echo "REMINDER: Set a GCP budget alert at"
echo "  https://console.cloud.google.com/billing/budgets?project=$PROJECT_ID"
