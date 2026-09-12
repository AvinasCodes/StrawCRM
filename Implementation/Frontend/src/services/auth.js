import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider, isConfigured, getSecondaryAuth } from '../lib/firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Dev / Sandbox Fallback (when Firebase is not yet configured)
// Enables UI validation before real Firebase project credentials are provided
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'strawcrm_auth_session';

class LocalAuthSimulation {
  _getSession() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  _setSession(session) {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  _makeUser(email, displayName, provider = 'password') {
    const uid = 'usr_' + Math.random().toString(36).substring(2, 9);
    return {
      uid,
      email: email.trim().toLowerCase(),
      displayName: displayName || email.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()),
      photoURL: null,
      provider,
    };
  }

  _makeIdToken(user) {
    return (
      'strawcrm_jwt_' +
      btoa(JSON.stringify({ sub: user.uid, email: user.email, exp: Date.now() + 3600000 }))
    );
  }

  async signInWithEmail(email, password) {
    await new Promise((r) => setTimeout(r, 600));
    if (password === 'wrongpassword' || password === 'error') {
      return { success: false, error: 'Email or password is incorrect.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    const user = this._makeUser(email);
    const session = { user, idToken: this._makeIdToken(user) };
    this._setSession(session);
    return { success: true, user, idToken: session.idToken };
  }

  async signUpWithEmail(email, password, fullName) {
    await new Promise((r) => setTimeout(r, 600));
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }
    this._makeUser(email, fullName);
    return { success: true, email };
  }

  async signInWithGoogle() {
    await new Promise((r) => setTimeout(r, 500));
    const user = this._makeUser('google.user@strawcrm.com', 'Google User', 'google');
    user.uid = 'usr_oauth_google';
    const idToken = 'strawcrm_jwt_oauth_' + Date.now();
    this._setSession({ user, idToken });
    return { success: true, user, idToken };
  }

  async signOut() {
    this._setSession(null);
    return { success: true };
  }

  async verifyResetCode(code) {
    await new Promise((r) => setTimeout(r, 400));
    if (code === '000000') return { success: false, error: 'Invalid or expired code.' };
    return { success: true, email: 'user@example.com' };
  }

  async confirmNewPassword(code, newPassword) {
    await new Promise((r) => setTimeout(r, 500));
    if (newPassword.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };
    return { success: true };
  }

  async getCurrentUser() {
    return this._getSession()?.user || null;
  }

  async getIdToken() {
    return this._getSession()?.idToken || null;
  }
}

const sim = new LocalAuthSimulation();

// ─────────────────────────────────────────────────────────────────────────────
// Error Formatting
// ─────────────────────────────────────────────────────────────────────────────
export function formatAuthError(error) {
  if (!error) return null;
  const code = error.code || '';
  const msg = (error.message || '').toLowerCase();

  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists.';
  }
  if (code === 'auth/weak-password') {
    return 'Password must be at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Pop-up was blocked by the browser. Please allow pop-ups for this site.';
  }
  if (code === 'auth/too-many-requests') {
    return 'Too many login attempts. Please wait a moment and try again.';
  }
  if (code === 'auth/network-request-failed' || msg.includes('network')) {
    return 'Something went wrong. Please check your connection and try again.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'This sign-in method is not enabled. Please enable it in the Firebase Console.';
  }

  return 'Something went wrong. Please check your credentials and try again.';
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Service Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email, password, rememberMe = true) {
  if (!isConfigured) return sim.signInWithEmail(email, password);

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const idToken = await credential.user.getIdToken();

    if (!rememberMe) {
      sessionStorage.setItem('strawcrm_session_temporary', 'true');
    } else {
      sessionStorage.removeItem('strawcrm_session_temporary');
    }

    return { success: true, user: credential.user, idToken };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Sign up a new user account
 */
export async function signUpWithEmail(email, password, fullName = '') {
  if (!isConfigured) return sim.signUpWithEmail(email, password, fullName);

  try {
    const regAuth = getSecondaryAuth() || auth;
    const credential = await createUserWithEmailAndPassword(regAuth, email.trim(), password);
    if (fullName.trim()) {
      await updateProfile(credential.user, { displayName: fullName.trim() });
    }
    // Sign out from the secondary registration instance
    await firebaseSignOut(regAuth);
    return { success: true, email: email.trim() };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Sign in with Google via popup
 */
export async function signInWithGoogle() {
  if (!isConfigured) return sim.signInWithGoogle();

  try {
    const credential = await signInWithPopup(auth, googleProvider);
    const idToken = await credential.user.getIdToken();
    return { success: true, user: credential.user, idToken };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Send password reset email
 */
export async function resetPassword(email) {
  if (!isConfigured) {
    await new Promise((r) => setTimeout(r, 400));
    return { success: true };
  }

  try {
    try {
      await sendPasswordResetEmail(auth, email.trim(), {
        url: `${window.location.origin}/login`,
        handleCodeInApp: true,
      });
    } catch (continueErr) {
      console.warn('Continue URL rejected, falling back to standard reset email:', continueErr);
      await sendPasswordResetEmail(auth, email.trim());
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: formatAuthError(err) };
  }
}

/**
 * Sign out and clear session
 */
export async function signOut() {
  if (!isConfigured) return sim.signOut();

  try {
    await firebaseSignOut(auth);
    sessionStorage.removeItem('strawcrm_session_temporary');
    return { success: true };
  } catch {
    return { success: false, error: 'Sign out failed. Please try again.' };
  }
}

/**
 * Get the current user's Firebase ID token (to send to backend)
 */
export async function getIdToken(forceRefresh = false) {
  if (!isConfigured) return sim.getIdToken();

  try {
    return (await auth.currentUser?.getIdToken(forceRefresh)) || null;
  } catch {
    return null;
  }
}

/**
 * Verify the OTP/action code sent by Firebase reset email
 */
export async function verifyResetCode(code) {
  if (!isConfigured) return sim.verifyResetCode(code);
  try {
    const email = await verifyPasswordResetCode(auth, code.trim());
    return { success: true, email };
  } catch (err) {
    return { success: false, error: formatAuthError(err) || 'Invalid or expired code. Please request a new one.' };
  }
}

/**
 * Confirm the new password using the Firebase action code
 */
export async function confirmNewPassword(code, newPassword) {
  if (!isConfigured) return sim.confirmNewPassword(code, newPassword);
  try {
    await confirmPasswordReset(auth, code.trim(), newPassword);
    return { success: true };
  } catch (err) {
    return { success: false, error: formatAuthError(err) || 'Failed to reset password. Please try again.' };
  }
}
