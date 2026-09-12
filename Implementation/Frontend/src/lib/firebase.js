import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const isConfigured =
  !!firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.includes('your-') &&
  !!firebaseConfig.projectId &&
  !firebaseConfig.projectId.includes('your-');

import {
  initializeFirestore,
  memoryLocalCache,
  getFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

let app = null;
let auth = null;
let db = null;
let storage = null;
let googleProvider = null;
let secondaryAuth = null;

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.addScope('profile');
    googleProvider.addScope('email');

    // Initialize Storage
    try {
      storage = getStorage(app);
    } catch (storageErr) {
      console.warn('[StrawCRM] Firebase Storage init error:', storageErr);
    }

    // Initialize Firestore with in-memory cache (avoids localStorage quota errors)
    // Real-time data still flows via onSnapshot — no offline persistence needed.
    try {
      db = initializeFirestore(app, {
        localCache: memoryLocalCache(),
      });
    } catch (fsErr) {
      // Fallback if already initialized
      try { db = getFirestore(app); } catch {}
    }

    // Clear any stale Firestore localStorage entries from previous sessions
    try {
      const keysToRemove = Object.keys(localStorage).filter(
        (k) => k.startsWith('firestore') || k.startsWith('firebase')
      );
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
  } catch (err) {
    console.warn('[StrawCRM] Failed to initialize Firebase:', err);
  }
} else {
  console.warn('[StrawCRM] Firebase not configured — running in sandbox mode.');
}

/**
 * Secondary Firebase Auth instance used strictly for account registration.
 * Using a secondary instance prevents the main app from auto-signing in the new user,
 * avoiding accidental redirects to the dashboard during sign up.
 */
function getSecondaryAuth() {
  if (!isConfigured) return null;
  if (!secondaryAuth) {
    try {
      const existing = getApps().find((a) => a.name === 'SecondaryRegistrationApp');
      const secApp = existing || initializeApp(firebaseConfig, 'SecondaryRegistrationApp');
      secondaryAuth = getAuth(secApp);
    } catch (err) {
      console.warn('[StrawCRM Auth] Secondary app error:', err);
      return auth; // fallback to primary if needed
    }
  }
  return secondaryAuth;
}

export { auth, db, storage, googleProvider, isConfigured, getSecondaryAuth };
