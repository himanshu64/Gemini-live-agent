import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getFirebaseAdmin } from "./firebase-admin";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // Allow Firebase anonymous users to create a session via their ID token
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        idToken: { label: "Firebase ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) return null;
        try {
          const admin = getFirebaseAdmin();
          const decoded = await admin.auth().verifyIdToken(credentials.idToken);
          return {
            id: decoded.uid,
            email: decoded.email || null,
            name: decoded.name || (decoded.email ? decoded.email.split("@")[0] : "Anonymous"),
            image: decoded.picture || null,
          };
        } catch (err) {
          console.error("[NextAuth] Firebase token verify failed:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.uid = user.id;
      }
      // For Google sign-in, create/link Firebase user
      if (account?.provider === "google" && account.id_token) {
        try {
          const admin = getFirebaseAdmin();
          let firebaseUser;
          try {
            firebaseUser = await admin.auth().getUserByEmail(token.email!);
          } catch {
            firebaseUser = await admin.auth().createUser({
              email: token.email!,
              displayName: token.name || undefined,
              photoURL: token.picture as string || undefined,
            });
          }
          token.uid = firebaseUser.uid;
          // Generate a custom token the client can use for Firebase client SDK
          token.firebaseToken = await admin.auth().createCustomToken(firebaseUser.uid);
        } catch (err) {
          console.error("[NextAuth] Firebase sync failed:", err);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).uid = token.uid;
        (session.user as Record<string, unknown>).firebaseToken = token.firebaseToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
