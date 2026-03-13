import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInAnonymously as fbSignInAnon,
  GoogleAuthProvider,
  linkWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

/** Sign in anonymously — instant, no UI required */
export async function signInAnonymously(): Promise<User> {
  const cred = await fbSignInAnon(auth);
  return cred.user;
}

/** Link anonymous account to Google — preserves UID */
export async function linkWithGoogle(): Promise<User> {
  const user = auth.currentUser;
  if (!user) throw new Error("No current user");
  const provider = new GoogleAuthProvider();
  const cred = await linkWithPopup(user, provider);
  return cred.user;
}

/** Get a fresh ID token for backend auth */
export async function getIdToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error("No current user");
  return user.getIdToken(true);
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}
