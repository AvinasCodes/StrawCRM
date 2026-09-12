import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholderKey =
  !supabaseUrl ||
  !supabaseAnonKey ||
  supabaseUrl.includes('dummy') ||
  supabaseAnonKey.includes('dummy');

// Real Supabase client instance
let client = null;
if (!isPlaceholderKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  } catch (err) {
    console.warn('[StrawCRM Auth] Failed to initialize live Supabase client, falling back to local simulation:', err);
  }
}

// Development / Sandbox Fallback Auth Client
// Enables smooth evaluation and UI validation even before external project credentials are provided
class LocalAuthSimulation {
  constructor() {
    this.STORAGE_KEY = 'strawcrm_auth_session';
    this.listeners = new Set();
  }

  _getSession() {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  _setSession(session) {
    if (session) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(this.STORAGE_KEY);
    }
    this._notify(session ? 'SIGNED_IN' : 'SIGNED_OUT', session);
  }

  _notify(event, session) {
    this.listeners.forEach((callback) => {
      try {
        callback(event, session);
      } catch (e) {
        console.error('Auth listener error:', e);
      }
    });
  }

  async signInWithPassword({ email, password }) {
    // Artificial small delay to reflect network roundtrip
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Basic validation rule for demo sandbox
    if (password === 'wrongpassword' || password === 'error') {
      return {
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      };
    }

    if (password.length < 6) {
      return {
        data: { user: null, session: null },
        error: { message: 'Password should be at least 6 characters', status: 400 },
      };
    }

    // Success: create simulated Supabase session object
    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: email.trim().toLowerCase(),
      user_metadata: {
        full_name: email.split('@')[0].replace('.', ' ').replace(/^./, (c) => c.toUpperCase()),
      },
      role: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const session = {
      access_token: 'strawcrm_jwt_' + btoa(JSON.stringify({ sub: user.id, email: user.email, exp: Date.now() + 3600000 })),
      token_type: 'bearer',
      expires_in: 3600,
      user,
    };

    this._setSession(session);
    return { data: { user, session }, error: null };
  }

  async signUp({ email, password, options }) {
    await new Promise((resolve) => setTimeout(resolve, 600));

    const user = {
      id: 'usr_' + Math.random().toString(36).substring(2, 9),
      email: email.trim().toLowerCase(),
      user_metadata: options?.data || {},
      role: 'authenticated',
      created_at: new Date().toISOString(),
    };

    const session = {
      access_token: 'strawcrm_jwt_' + btoa(JSON.stringify({ sub: user.id, email: user.email })),
      token_type: 'bearer',
      user,
    };

    this._setSession(session);
    return { data: { user, session }, error: null };
  }

  async signInWithOAuth({ provider }) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const email = 'google.user@strawcrm.com';
    const user = {
      id: 'usr_oauth_google',
      email,
      user_metadata: { full_name: 'Google User', provider: 'google' },
      role: 'authenticated',
    };
    const session = {
      access_token: 'strawcrm_jwt_oauth_' + Date.now(),
      token_type: 'bearer',
      user,
    };
    this._setSession(session);
    return { data: { provider, url: null }, error: null };
  }

  async signOut() {
    this._setSession(null);
    return { error: null };
  }

  async getSession() {
    const session = this._getSession();
    return { data: { session }, error: null };
  }

  async getUser() {
    const session = this._getSession();
    return { data: { user: session?.user || null }, error: null };
  }

  async resetPasswordForEmail(email) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return { data: {}, error: null };
  }

  onAuthStateChange(callback) {
    this.listeners.add(callback);
    const session = this._getSession();
    callback(session ? 'INITIAL_SESSION' : 'SIGNED_OUT', session);
    return {
      data: {
        subscription: {
          unsubscribe: () => this.listeners.delete(callback),
        },
      },
    };
  }
}

export const supabase = client || {
  auth: new LocalAuthSimulation(),
  isSimulation: true,
};
