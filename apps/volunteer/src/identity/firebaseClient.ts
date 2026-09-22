/**
 * firebaseClient.ts — Google sign-in for the volunteer app.
 * Uses the same i58-finance Firebase project as the finance app.
 * This does not call mondayApiProxy or the staff CRM session.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

let app: FirebaseApp | null = null;
let provider: GoogleAuthProvider | null = null;

export function readFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  const appId = import.meta.env.VITE_FIREBASE_APP_ID?.trim();
  if (!apiKey || !authDomain || !projectId || !appId) return null;
  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim(),
  };
}

function firebaseAuth() {
  const config = readFirebaseWebConfig();
  if (!config) {
    throw new Error('Google sign-in is not configured for this app.');
  }
  if (!app) {
    app = initializeApp(config);
    provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
  }
  return getAuth(app);
}

export function watchVolunteerUser(onChange: (user: User | null) => void): () => void {
  if (!readFirebaseWebConfig()) {
    onChange(null);
    return () => undefined;
  }
  return onAuthStateChanged(firebaseAuth(), onChange);
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(firebaseAuth(), provider!);
    return result.user;
  } catch (error) {
    throw new Error(friendlySignInError(error));
  }
}

export async function signOutVolunteer(): Promise<void> {
  if (!readFirebaseWebConfig() || !app) return;
  await signOut(getAuth(app));
}

function friendlySignInError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const message = error instanceof Error ? error.message : '';
  if (
    message.includes('sessionStorage') ||
    message.includes('missing initial state') ||
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request'
  ) {
    return 'Sign-in cannot finish in this in-app browser. Open this page in Safari or Chrome and try again.';
  }
  if (code === 'auth/popup-blocked') {
    return 'The sign-in popup was blocked. Allow popups for this site and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This site is not an authorized domain for Google sign-in yet.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection failed. Check your connection and try again.';
  }
  return 'Google sign-in failed. Try again.';
}
