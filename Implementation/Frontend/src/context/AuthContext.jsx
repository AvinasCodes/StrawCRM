import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, isConfigured } from '../lib/firebase';
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  signOut,
  resetPassword,
  getIdToken,
} from '../services/auth';
import { syncFromBackend } from '../services/firestoreService';
import { recordAuthenticatedUser } from '../services/teamAgents';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (isConfigured && auth) {
      // Firebase real auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!mounted) return;
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          setUser(firebaseUser);
          setIdToken(token);
          recordAuthenticatedUser(firebaseUser);
          // Immediately sync all tickets and notes for the logged-in user
          syncFromBackend();
        } else {
          try {
            const raw = localStorage.getItem('strawcrm_auth_session');
            if (raw) {
              const { user: savedUser, idToken: savedToken } = JSON.parse(raw);
              if (savedUser) {
                setUser(savedUser);
                setIdToken(savedToken);
                recordAuthenticatedUser(savedUser);
                syncFromBackend();
                setLoading(false);
                return;
              }
            }
          } catch {}
          setUser(null);
          setIdToken(null);
        }
        setLoading(false);
      });

      return () => {
        mounted = false;
        unsubscribe();
      };
    } else {
      // Dev fallback: restore session from localStorage
      try {
        const raw = localStorage.getItem('strawcrm_auth_session');
        if (raw) {
          const { user: savedUser, idToken: savedToken } = JSON.parse(raw);
          if (mounted && savedUser) {
            setUser(savedUser);
            setIdToken(savedToken);
            recordAuthenticatedUser(savedUser);
            syncFromBackend();
          }
        }
      } catch {
        // ignore
      }
      if (mounted) setLoading(false);
      return () => { mounted = false; };
    }
  }, []);

  // Live presence heartbeat: keep user marked Online while logged in
  useEffect(() => {
    if (!user) return;

    // Send initial online heartbeat immediately
    recordAuthenticatedUser(user, 'Online');

    // Send periodic heartbeats every 15 seconds to keep presence fresh across all clients
    const heartbeatTimer = setInterval(() => {
      recordAuthenticatedUser(user, 'Online');
    }, 15000);

    // Pulse heartbeat immediately on tab focus or window visibility
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        recordAuthenticatedUser(user, 'Online');
      }
    };

    const handleBeforeUnload = () => {
      recordAuthenticatedUser(user, 'Offline');
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeatTimer);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const login = async (email, password, rememberMe) => {
    const res = await signInWithEmail(email, password, rememberMe);
    if (res.success) {
      setUser(res.user);
      setIdToken(res.idToken);
      recordAuthenticatedUser(res.user, 'Online');
    }
    return res;
  };

  const loginAsDemo = async () => {
    const demoUser = {
      uid: 'usr_demo_agent_01',
      email: 'agent@datastraw.in',
      displayName: 'Aaryan Singh',
      photoURL: null,
      provider: 'demo',
    };
    const demoToken = 'strawcrm_jwt_demo_' + Date.now();
    try {
      localStorage.setItem(
        'strawcrm_auth_session',
        JSON.stringify({ user: demoUser, idToken: demoToken })
      );
    } catch {}
    setUser(demoUser);
    setIdToken(demoToken);
    recordAuthenticatedUser(demoUser, 'Online');
    syncFromBackend();
    return { success: true, user: demoUser, idToken: demoToken };
  };

  const register = async (email, password, fullName) => {
    return await signUpWithEmail(email, password, fullName);
  };

  const loginWithGoogle = async () => {
    const res = await signInWithGoogle();
    if (res.success) {
      setUser(res.user);
      setIdToken(res.idToken);
      recordAuthenticatedUser(res.user, 'Online');
    }
    return res;
  };

  const logout = async () => {
    if (user) {
      recordAuthenticatedUser(user, 'Offline');
    }
    try {
      localStorage.removeItem('strawcrm_auth_session');
    } catch {}
    const res = await signOut();
    setUser(null);
    setIdToken(null);
    return res;
  };

  const requestPasswordReset = async (email) => {
    return await resetPassword(email);
  };


  /**
   * Returns a fresh ID token — use this when making API calls to the backend.
   * Automatically refreshes if the current token is close to expiry.
   */
  const getFreshToken = async () => {
    return await getIdToken(true);
  };

  const value = useMemo(
    () => ({
      user,
      idToken,
      loading,
      isAuthenticated: !!user,
      login,
      loginAsDemo,
      register,
      loginWithGoogle,
      logout,
      requestPasswordReset,
      getFreshToken,
    }),
    [user, idToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


