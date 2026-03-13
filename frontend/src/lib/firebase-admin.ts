import admin from "firebase-admin";

let initialized = false;

export function getFirebaseAdmin(): typeof admin {
  if (!initialized) {
    if (!admin.apps.length) {
      // On GCP (Cloud Run), Application Default Credentials auto-detect
      // Locally, set GOOGLE_APPLICATION_CREDENTIALS env var
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined,
      });
    }
    initialized = true;
  }
  return admin;
}
