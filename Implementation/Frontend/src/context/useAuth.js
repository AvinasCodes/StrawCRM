import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Resilient fallback for React Fast Refresh and transient HMR renders
    return {
      user: null,
      idToken: null,
      loading: true,
      isAuthenticated: false,
      login: async () => {},
      loginAsDemo: async () => {},
      register: async () => {},
      loginWithGoogle: async () => {},
      logout: async () => {},
      requestPasswordReset: async () => {},
      getFreshToken: async () => null,
    };
  }
  return context;
}
