/**
 * Firebase Auth (free): one setup for Google, Facebook, and more.
 * Uses Firebase client SDK; backend verifies ID token with Firebase Admin.
 * Public config is read from apps/frontend/firebase-config.json (same shape as Firebase Console).
 * Supports optional Analytics (measurementId).
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  type Auth,
} from 'firebase/auth';

/** Same shape as Firebase Console → Project settings → Your apps → Web (firebaseConfig). measurementId is optional. */
interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Public Firebase keys live in project file (firebase-config.json), not in env
import firebaseConfigFromFile from '../../firebase-config.json';

function getFirebaseConfig(): FirebaseWebConfig {
  const c = firebaseConfigFromFile as Record<string, unknown>;
  const config: FirebaseWebConfig = {
    apiKey: (c.apiKey as string) ?? '',
    authDomain: (c.authDomain as string) ?? '',
    projectId: (c.projectId as string) ?? '',
    storageBucket: (c.storageBucket as string) ?? '',
    messagingSenderId: (c.messagingSenderId as string) ?? '',
    appId: (c.appId as string) ?? '',
  };
  if (typeof c.measurementId === 'string' && c.measurementId) config.measurementId = c.measurementId;
  return config;
}

const firebaseConfig = getFirebaseConfig();

function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) return null;
  if (getApps().length > 0) return getApp();
  try {
    return initializeApp(firebaseConfig);
  } catch {
    return null;
  }
}

/** Firebase Analytics (only in browser when measurementId is set). */
let analytics: Analytics | null = null;
export function getFirebaseAnalytics(): Analytics | null {
  if (typeof window === 'undefined') return null;
  if (analytics) return analytics;
  const app = getFirebaseApp();
  if (!app || !firebaseConfig.measurementId) return null;
  try {
    analytics = getAnalytics(app);
    return analytics;
  } catch {
    return null;
  }
}

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

/**
 * Sign in with Google via Firebase popup. Returns Firebase ID token or null.
 */
export async function signInWithFirebaseGoogle(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    const credential = await signInWithPopup(auth, new GoogleAuthProvider());
    return credential.user.getIdToken();
  } catch {
    return null;
  }
}

/**
 * Sign in with Facebook via Firebase popup. Returns Firebase ID token or null.
 */
export async function signInWithFirebaseFacebook(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    const credential = await signInWithPopup(auth, new FacebookAuthProvider());
    return credential.user.getIdToken();
  } catch {
    return null;
  }
}
