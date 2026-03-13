import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously as fbSignInAnon,
  signOut as fbSignOut,
  type Auth,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

function getFirebaseAuth(): Auth {
  if (!_auth) {
    _auth = getAuth(getApp());
  }
  return _auth;
}

/** Lazy-initialized auth — only accessed at runtime in the browser */
export const auth = typeof window !== "undefined" ? getFirebaseAuth() : (null as unknown as Auth);

/** Sign in anonymously — instant, no UI required */
export async function signInAnonymously(): Promise<User> {
  const cred = await fbSignInAnon(getFirebaseAuth());
  return cred.user;
}

/** Get a fresh ID token for backend auth */
export async function getIdToken(): Promise<string> {
  const a = getFirebaseAuth();
  const user = a.currentUser;
  if (!user) throw new Error("No current user");
  return user.getIdToken(true);
}

export async function signOut(): Promise<void> {
  await fbSignOut(getFirebaseAuth());
}
