import { useContext } from 'react';
import { AuthContext } from './AuthContext';

const defaultFallback = {
  user: {
    uid: 'usr_dev',
    email: 'agent@datastraw.in',
    displayName: 'Support Agent',
  },
  idToken: 'dev-test-token',
  loading: false,
  isAuthenticated: true,
  login: async () => {},
  logout: async () => {},
  signUp: async () => {},
  resetPassword: async () => {},
  signInWithGoogle: async () => {},
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    try {
      const raw = localStorage.getItem('strawcrm_auth_session');
      if (raw) {
        const session = JSON.parse(raw);
        return {
          ...defaultFallback,
          user: session.user || defaultFallback.user,
          idToken: session.idToken || defaultFallback.idToken,
          isAuthenticated: Boolean(session.user || session.idToken),
        };
      }
    } catch {
      // Ignore parse errors
    }
    return defaultFallback;
  }
  return context;
}
