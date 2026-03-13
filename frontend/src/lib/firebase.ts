import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously as fbSignInAnon,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  linkWithPopup,
  linkWithRedirect,
  getRedirectResult,
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

const provider = new GoogleAuthProvider();

/** Sign in anonymously — instant, no UI required */
export async function signInAnonymously(): Promise<User> {
  const cred = await fbSignInAnon(getFirebaseAuth());
  return cred.user;
}

/** Link anonymous account to Google — preserves UID */
export async function linkWithGoogle(): Promise<User> {
  const a = getFirebaseAuth();
  const user = a.currentUser;
  if (!user) throw new Error("No current user");
  try {
    const cred = await linkWithPopup(user, provider);
    return cred.user;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      await linkWithRedirect(user, provider);
      return user;
    }
    throw err;
  }
}

/** Direct Google sign-in */
export async function googleSignIn(): Promise<User> {
  const a = getFirebaseAuth();
  try {
    const cred = await signInWithPopup(a, provider);
    return cred.user;
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      await signInWithRedirect(a, provider);
      return null as unknown as User;
    }
    throw err;
  }
}

/** Check for redirect result on page load */
export async function handleRedirectResult(): Promise<User | null> {
  const a = getFirebaseAuth();
  const result = await getRedirectResult(a);
  return result?.user ?? null;
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
