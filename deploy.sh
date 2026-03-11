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

# Create GCS bucket if not exists
BUCKET_NAME="${PROJECT_ID}-sightline-frames"
gsutil ls -b "gs://${BUCKET_NAME}" 2>/dev/null || \
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}"

# Build and deploy backend
echo "==> Building and deploying backend..."
gcloud run deploy sightline-backend \
  --source=./backend \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_CLOUD_LOCATION=$REGION,GCS_BUCKET=$BUCKET_NAME" \
  --min-instances=1 \
  --max-instances=10 \
  --memory=1Gi \
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
  --set-env-vars="NEXT_PUBLIC_WS_URL=$WS_URL" \
  --min-instances=0 \
  --max-instances=5 \
  --memory=512Mi \
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
