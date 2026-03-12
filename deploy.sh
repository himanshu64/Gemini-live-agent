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

echo "==> Deploying SightLine to project: $PROJECT_ID, region: $REGION"

# Enable required APIs
echo "==> Enabling APIs..."
gcloud services enable \
  run.googleapis.com \
  aiplatform.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  cloudbuild.googleapis.com \
  --project="$PROJECT_ID"

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
gcloud run deploy sightline-backend \
  --source=./backend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET=$BUCKET_NAME,API_TOKEN=$API_TOKEN" \
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
echo "==> Building and deploying frontend..."
gcloud run deploy sightline-frontend \
  --source=./frontend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_WS_URL=$WS_URL,NEXT_PUBLIC_API_TOKEN=$API_TOKEN" \
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
gcloud run services update sightline-backend \
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
