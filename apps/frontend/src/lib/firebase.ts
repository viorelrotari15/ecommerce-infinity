/**
 * Firebase Auth (free): one setup for Google, Facebook, email/password, and password reset.
 * Uses Firebase client SDK; backend verifies ID token with Firebase Admin.
 * Public config is read from apps/frontend/firebase-config.json (same shape as Firebase Console).
 * Supports optional Analytics (measurementId).
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
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

export type SendPasswordResetResult =
  | { success: true }
  | { success: false; code?: string; message: string };

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

function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
}

/** Firebase Auth API – use the singleton firebaseAuth instance. */
export class FirebaseAuth {
  private analytics: Analytics | null = null;

  /** Whether Firebase is configured (apiKey + projectId). */
  isConfigured(): boolean {
    return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
  }

  /** Firebase Analytics (only in browser when measurementId is set). */
  getAnalytics(): Analytics | null {
    if (typeof window === 'undefined') return null;
    if (this.analytics) return this.analytics;
    const app = getFirebaseApp();
    if (!app || !firebaseConfig.measurementId) return null;
    try {
      this.analytics = getAnalytics(app);
      return this.analytics;
    } catch {
      return null;
    }
  }

  /** Sign in with Google via Firebase popup. Returns Firebase ID token or null. */
  async signInWithGoogle(): Promise<string | null> {
    const auth = getFirebaseAuth();
    if (!auth) return null;
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      return credential.user.getIdToken();
    } catch {
      return null;
    }
  }

  /** Sign in with Facebook via Firebase popup. Returns Firebase ID token or null. */
  async signInWithFacebook(): Promise<string | null> {
    const auth = getFirebaseAuth();
    if (!auth) return null;
    try {
      const credential = await signInWithPopup(auth, new FacebookAuthProvider());
      return credential.user.getIdToken();
    } catch {
      return null;
    }
  }

  /** Sign in with email and password via Firebase. Returns Firebase ID token or null. */
  async signInWithEmail(email: string, password: string): Promise<string | null> {
    const auth = getFirebaseAuth();
    if (!auth) return null;
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      return credential.user.getIdToken();
    } catch {
      return null;
    }
  }

  /** Send password reset email via Firebase. Only works for users that exist in Firebase Auth. */
  async sendPasswordResetEmail(email: string): Promise<SendPasswordResetResult> {
    const auth = getFirebaseAuth();
    if (!auth) return { success: false, message: 'Firebase is not configured' };
    try {
      await firebaseSendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: string }).code) : undefined;
      const message = err && typeof err === 'object' && 'message' in err ? String((err as { message: string }).message) : 'Failed to send reset email';
      return { success: false, code, message };
    }
  }
}

/** Singleton Firebase Auth API instance. */
export const firebaseAuth = new FirebaseAuth();
