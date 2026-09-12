/**
 * Active & Registered Support Agents Directory for StrawCRM.
 * Tracks and persists real authenticated users who have logged into the system.
 * Eliminates all dummy contacts, ticket client contacts, and fake staff personas.
 *
 * Real-time presence is powered by Firebase Firestore onSnapshot with live heartbeats,
 * cross-tab BroadcastChannel, and backend REST synchronization.
 */

import { collection, doc, setDoc, onSnapshot, getDocs } from 'firebase/firestore';
import { db, isConfigured } from '../lib/firebase';
import { getWorkspaceUsers, sendUserHeartbeat, updateRemoteUserRole } from './api';

const STORAGE_KEY = 'strawcrm_known_auth_agents';
const PRESENCE_COLLECTION = 'presence_users';

// BroadcastChannel for instantaneous zero-latency cross-tab notification
const presenceChannel =
  typeof window !== 'undefined' && typeof window.BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('strawcrm_presence_channel')
    : null;

// Only legitimate authenticated staff accounts for initial empty baseline
export const BASE_KNOWN_AGENTS = [
  {
    id: 'agent_heyavinashs',
    name: 'Avinash Singh',
    rawName: 'Avinash Singh',
    email: 'heyavinashs@gmail.com',
    role: 'Lead Administrator',
    department: 'Platform Operations',
    avatar: 'AS',
    color: 'from-blue-600 to-cyan-600',
    status: 'Offline',
    lastSeen: 0,
  },
  {
    id: 'agent_datastraw',
    name: 'Aaryan Singh',
    rawName: 'Aaryan Singh',
    email: 'agent@datastraw.in',
    role: 'Operations Lead',
    department: 'Platform Operations',
    avatar: 'AS',
    color: 'from-purple-600 to-indigo-600',
    status: 'Offline',
    lastSeen: 0,
  },
];

// List of legacy dummy fake staff emails to permanently filter & purge
const DUMMY_EMAILS_SET = new Set([
  'sneha.kapoor@datastraw.in',
  'rahul.mehta@datastraw.in',
  'priya.sharma@datastraw.in',
  'david.chen@datastraw.in',
  'sophia.martinez@datastraw.in',
  'carlos.mendez@datastraw.in',
  'elena.rostova@datastraw.in',
  'marcus.vance@datastraw.in',
  'fatima.almansoor@datastraw.in',
  'kenji.sato@datastraw.in',
  'amara.okafor@datastraw.in',
  'sarah.jenkins@datastraw.in',
  'mateo.rossi@datastraw.in',
  'hanna.lindqvist@datastraw.in',
]);

/**
 * Filter out legacy dummy agents, client contacts, and external test scrapers.
 */
export function sanitizeAgentsList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((a) => {
    if (!a || !a.email) return false;
    const email = a.email.trim().toLowerCase();
    if (DUMMY_EMAILS_SET.has(email)) return false;
    const role = (a.role || '').toLowerCase();
    const dept = (a.department || '').toLowerCase();
    if (role === 'client contact' || role === 'client' || role === 'customer' || role === 'customer contact') return false;
    if (dept === 'external client' || dept === 'customer') return false;
    if (email.endsWith('@fintechflow.com') || email.endsWith('@lagostech.ng')) return false;
    return true;
  });
}

/**
 * Helper to get clean Firestore document ID from email
 */
function getEmailDocKey(email) {
  return (email || '').trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '_');
}

/**
 * Read and clean agents from local storage.
 */
function getStoredAgents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeAgentsList(parsed);
    if (sanitized.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
    return sanitized;
  } catch {
    return [];
  }
}

/**
 * Persist an updated agents list to local storage.
 */
function saveStoredAgents(agents) {
  try {
    const sanitized = sanitizeAgentsList(agents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch {}
}

/**
 * Calculate dynamic presence:
 * An agent is Online if:
 * 1) They are explicitly marked Online AND were seen within 3 minutes (180,000 ms), OR
 * 2) They are the active logged-in user in this session.
 */
export function isAgentOnline(agent, currentUserEmail = '') {
  if (!agent) return false;
  const email = (agent.email || '').toLowerCase().trim();
  const current = (currentUserEmail || '').toLowerCase().trim();

  // Current session user is Online
  if (current && email === current) return true;

  // Real-time lastSeen heartbeat check
  const now = Date.now();
  const lastSeen = Number(agent.lastSeen || agent.last_seen_ts ? (agent.last_seen_ts > 1e11 ? agent.last_seen_ts : agent.last_seen_ts * 1000) : 0);
  
  if (agent.status === 'Online') {
    // If explicitly marked Online with a recent heartbeat within 3 mins (or if lastSeen not recorded yet)
    if (lastSeen > 0) {
      return (now - lastSeen) < 180000;
    }
    return true;
  }

  // If lastSeen was recorded within 2 minutes even if status is not explicitly set
  if (lastSeen > 0 && (now - lastSeen) < 120000) {
    return true;
  }

  return false;
}

/**
 * Record or heartbeat an authenticated user to Firestore, Backend, and Local Storage.
 */
export function recordAuthenticatedUser(user, status = 'Online') {
  if (!user || !user.email) return;

  const email = user.email.trim().toLowerCase();
  const displayName =
    user.displayName ||
    email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const initials =
    displayName
      .split(' ')
      .map((w) => w.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'AG';

  const uid = user.uid || user.id || `agent_${email.split('@')[0]}`;

  let preferredRole = null;
  try {
    const p = JSON.parse(localStorage.getItem('strawcrm_preferences') || '{}');
    if (p.role) preferredRole = p.role;
  } catch {}

  const existing = getStoredAgents();
  const idx = existing.findIndex((a) => (a.email || '').toLowerCase() === email);
  const prev = idx >= 0 ? existing[idx] : {};

  const now = Date.now();
  const agentObj = {
    id: prev.id || `agent_${uid.replace(/[^a-zA-Z0-9_]/g, '')}`,
    name: displayName,
    rawName: displayName,
    email: email,
    avatar: initials,
    role: preferredRole || prev.role || 'Lead Administrator',
    department: prev.department || 'Platform Operations',
    color: prev.color || 'from-brand-electric to-blue-600',
    status: status,
    lastSeen: status === 'Offline' ? 0 : now,
    last_seen_ts: status === 'Offline' ? 0 : Math.floor(now / 1000),
  };

  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...agentObj };
  } else {
    existing.push(agentObj);
  }

  saveStoredAgents(existing);

  // 1. Sync to Firebase Firestore real-time collection
  if (isConfigured && db) {
    try {
      const docKey = getEmailDocKey(email);
      setDoc(
        doc(db, PRESENCE_COLLECTION, docKey),
        {
          ...agentObj,
          updatedAt: now,
        },
        { merge: true }
      ).catch((err) => {
        console.warn('[Presence] Firestore write error:', err?.message || err);
      });
    } catch (e) {
      console.warn('[Presence] Firestore setDoc error:', e);
    }
  }

  // 2. Send heartbeat to backend if available
  sendUserHeartbeat(agentObj).catch(() => {});

  // 3. Broadcast to other local browser tabs
  if (presenceChannel) {
    try {
      presenceChannel.postMessage({ type: 'HEARTBEAT_SENT', email, status, lastSeen: now });
    } catch {}
  }
}

export const AVAILABLE_ROLES = [
  'Lead Administrator',
  'Operations Lead',
  'Senior Support Engineer',
  'Escalation Engineer',
  'Customer Success Specialist',
  'Security Operations Specialist',
  'Client Operations Specialist',
  'Tier 2 Support Specialist',
  'Technical Support Associate',
  'Support Agent',
  'Platform Reliability Engineer',
  'Quality Assurance Analyst',
  'Billing & Invoicing Lead',
  'API Solutions Architect',
];

/**
 * Update an agent's role across storage, Firestore, and backend.
 */
export function updateUserRole(user, newRole) {
  if (!user?.email || !newRole) return;
  const email = user.email.trim().toLowerCase();

  const existing = getStoredAgents();
  const idx = existing.findIndex((a) => (a.email || '').toLowerCase() === email);
  if (idx >= 0) {
    existing[idx].role = newRole;
    saveStoredAgents(existing);
  }

  // Update in Firestore
  if (isConfigured && db) {
    try {
      const docKey = getEmailDocKey(email);
      setDoc(doc(db, PRESENCE_COLLECTION, docKey), { role: newRole, updatedAt: Date.now() }, { merge: true }).catch(() => {});
    } catch {}
  }

  // Notify backend
  updateRemoteUserRole(email, newRole).catch(() => {});

  if (presenceChannel) {
    try {
      presenceChannel.postMessage({ type: 'ROLE_UPDATE', email, role: newRole });
    } catch {}
  }
}

/**
 * Synchronous resolver for active authenticated agents roster.
 */
export function getActiveAgents(currentUser) {
  const stored = getStoredAgents();
  const agentMap = new Map();

  // 1. Seed base known accounts
  BASE_KNOWN_AGENTS.forEach((a) => {
    agentMap.set(a.email.toLowerCase(), { ...a });
  });

  // 2. Overlay verified authenticated users from storage
  stored.forEach((a) => {
    if (a && a.email) {
      const key = a.email.toLowerCase();
      agentMap.set(key, { ...agentMap.get(key), ...a });
    }
  });

  const currentEmail = (currentUser?.email || '').toLowerCase();

  // 3. Current user details
  if (currentUser?.email) {
    const key = currentEmail;
    const existing = agentMap.get(key) || {};
    let preferredRole = null;
    try {
      const p = JSON.parse(localStorage.getItem('strawcrm_preferences') || '{}');
      if (p.role) preferredRole = p.role;
    } catch {}

    const displayName =
      currentUser.displayName ||
      existing.name ||
      currentEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    agentMap.set(key, {
      ...existing,
      id: existing.id || `agent_${(currentUser.uid || currentEmail).replace(/[^a-zA-Z0-9_]/g, '')}`,
      name: displayName,
      rawName: displayName,
      email: currentUser.email,
      role: preferredRole || existing.role || 'Lead Administrator',
      isCurrentUser: true,
      status: 'Online',
      lastSeen: Date.now(),
    });
  }

  // Build resolved list
  const agentsList = Array.from(agentMap.values()).map((agent) => {
    const isThisUser = Boolean(currentEmail && (agent.email || '').toLowerCase() === currentEmail);
    const online = isAgentOnline(agent, currentEmail);

    return {
      ...agent,
      isCurrentUser: isThisUser,
      status: online ? 'Online' : 'Offline',
    };
  });

  // Sort: Online agents first, then current user, then alphabetical
  agentsList.sort((a, b) => {
    if (a.status === 'Online' && b.status !== 'Online') return -1;
    if (a.status !== 'Online' && b.status === 'Online') return 1;
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return agentsList;
}

/**
 * Merge and deduplicate an array of user objects.
 */
function mergeUserLists(existingList, incomingList, currentEmail) {
  const map = new Map();
  existingList.forEach((u) => {
    if (u && u.email) map.set(u.email.toLowerCase(), u);
  });
  incomingList.forEach((u) => {
    if (u && u.email) {
      const key = u.email.toLowerCase();
      const prev = map.get(key) || {};
      map.set(key, { ...prev, ...u });
    }
  });

  const merged = Array.from(map.values()).map((u) => {
    const isCur = Boolean(currentEmail && (u.email || '').toLowerCase() === currentEmail);
    const online = isAgentOnline(u, currentEmail);
    return {
      ...u,
      isCurrentUser: isCur,
      status: online ? 'Online' : 'Offline',
    };
  });

  merged.sort((a, b) => {
    if (a.status === 'Online' && b.status !== 'Online') return -1;
    if (a.status !== 'Online' && b.status === 'Online') return 1;
    if (a.isCurrentUser) return -1;
    if (b.isCurrentUser) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  return merged;
}

/**
 * Filter users by search and status.
 */
function applyFilters(users, { search = '', status = '' } = {}) {
  let filtered = [...users];

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    filtered = filtered.filter(
      (u) =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.role || '').toLowerCase().includes(q)
    );
  }

  if (status && status !== 'all') {
    const target = status.toLowerCase();
    filtered = filtered.filter((u) => (u.status || '').toLowerCase() === target);
  }

  return filtered;
}

/**
 * Asynchronously fetch active and registered users from Firestore and backend.
 */
export async function fetchAllUsers(currentUser, { search = '', status = '' } = {}) {
  const currentEmail = (currentUser?.email || '').toLowerCase();
  let currentList = getActiveAgents(currentUser);

  // 1. Try fetching from Firestore collection
  if (isConfigured && db) {
    try {
      const snapshot = await getDocs(collection(db, PRESENCE_COLLECTION));
      const firestoreUsers = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d && d.email) firestoreUsers.push(d);
      });

      const cleanFs = sanitizeAgentsList(firestoreUsers);
      if (cleanFs.length > 0) {
        currentList = mergeUserLists(currentList, cleanFs, currentEmail);
        saveStoredAgents(currentList);
      }
    } catch (e) {
      console.warn('[Presence] Firestore getDocs fallback:', e?.message || e);
    }
  }

  // 2. Try fetching from backend /api/users
  try {
    const response = await getWorkspaceUsers({ status, search });
    const remoteUsers = response?.users || [];
    if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
      const cleanRemote = sanitizeAgentsList(remoteUsers);
      currentList = mergeUserLists(currentList, cleanRemote, currentEmail);
      saveStoredAgents(currentList);
    }
  } catch (err) {
    // Backend offline is expected and handled seamlessly
  }

  const filtered = applyFilters(currentList, { search, status });

  return {
    users: filtered,
    total: currentList.length,
    onlineCount: currentList.filter((u) => u.status === 'Online').length,
    offlineCount: currentList.filter((u) => u.status !== 'Online').length,
  };
}

/**
 * Real-time subscription to team agents roster.
 * Hooks Firestore onSnapshot for multi-browser/multi-user realtime presence,
 * plus BroadcastChannel for local tabs, and backend polling.
 */
export function subscribeTeamAgents(currentUser, onUpdate, filterOptions = {}) {
  let isMounted = true;
  const currentEmail = (currentUser?.email || '').toLowerCase();

  let roster = getActiveAgents(currentUser);

  const emit = () => {
    if (!isMounted) return;
    const filtered = applyFilters(roster, filterOptions);
    onUpdate({
      users: filtered,
      total: roster.length,
      onlineCount: roster.filter((u) => u.status === 'Online').length,
      offlineCount: roster.filter((u) => u.status !== 'Online').length,
      loading: false,
    });
  };

  // 1. Emit initial state right away
  emit();

  // 2. Subscribe to Firestore presence_users collection in real-time
  let unsubFirestore = null;
  if (isConfigured && db) {
    try {
      unsubFirestore = onSnapshot(
        collection(db, PRESENCE_COLLECTION),
        (snapshot) => {
          if (!isMounted) return;
          const liveUsers = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data && data.email) liveUsers.push(data);
          });

          const clean = sanitizeAgentsList(liveUsers);
          if (clean.length > 0) {
            roster = mergeUserLists(roster, clean, currentEmail);
            saveStoredAgents(roster);
            emit();
          }
        },
        (error) => {
          console.warn('[Presence] Firestore onSnapshot warning:', error?.message || error);
        }
      );
    } catch (e) {
      console.warn('[Presence] Firestore subscribe error:', e);
    }
  }

  // 3. Realtime presence re-calculation timer (every 10s to decay stale heartbeats to Offline)
  const decayTimer = setInterval(() => {
    if (!isMounted) return;
    roster = roster.map((u) => {
      const isCur = Boolean(currentEmail && (u.email || '').toLowerCase() === currentEmail);
      const online = isAgentOnline(u, currentEmail);
      return {
        ...u,
        isCurrentUser: isCur,
        status: online ? 'Online' : 'Offline',
      };
    });
    emit();
  }, 10000);

  // 4. Background REST fetch to sync with backend if running
  const pushBackendState = () => {
    if (!isMounted) return;
    fetchAllUsers(currentUser, filterOptions).then((result) => {
      if (isMounted && result) {
        roster = mergeUserLists(roster, result.users, currentEmail);
        emit();
      }
    });
  };
  pushBackendState();

  const pollInterval = setInterval(() => {
    if (isMounted) pushBackendState();
  }, 5000);

  // 5. Cross-tab sync listener
  const handleBroadcast = (e) => {
    if (!isMounted) return;
    const data = e.data;
    if (data && data.email) {
      const idx = roster.findIndex((u) => (u.email || '').toLowerCase() === data.email.toLowerCase());
      if (idx >= 0) {
        roster[idx] = {
          ...roster[idx],
          status: data.status || (data.lastSeen ? 'Online' : roster[idx].status),
          lastSeen: data.lastSeen || Date.now(),
        };
      }
      roster = mergeUserLists(roster, [], currentEmail);
      emit();
    }
  };

  if (presenceChannel) {
    presenceChannel.addEventListener('message', handleBroadcast);
  }

  const handleStorage = (e) => {
    if (e.key === STORAGE_KEY && isMounted) {
      roster = getActiveAgents(currentUser);
      emit();
    }
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    isMounted = false;
    if (unsubFirestore) unsubFirestore();
    clearInterval(decayTimer);
    clearInterval(pollInterval);
    if (presenceChannel) {
      presenceChannel.removeEventListener('message', handleBroadcast);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
