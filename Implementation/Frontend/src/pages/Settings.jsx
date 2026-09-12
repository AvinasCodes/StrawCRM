import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Bell,
  Sliders,
  Save,
  Check,
  LogOut,
  LayoutGrid,
  List,
  Users,
  ShieldCheck,
  Volume2,
  Mail,
  ChevronRight,
  ChevronDown,
  Search,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import {
  getActiveAgents,
  subscribeTeamAgents,
  fetchAllUsers,
  AVAILABLE_ROLES,
  updateUserRole,
} from '../services/teamAgents';
import {
  playUrgentAlertSound,
  dispatchTicketNotification,
  setNotificationPreference,
  requestBrowserNotificationPermission,
} from '../services/notificationService';
import NeuToggle from '../components/ui/NeuToggle';

export default function SettingsPage({ onNavigate }) {
  const { user, logout } = useAuth();

  const defaultAgentName =
    user?.displayName ||
    (user?.email
      ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Support Agent');

  // Dynamic Workspace Agents & Users Directory state
  const [agentsData, setAgentsData] = useState(() => {
    const initial = getActiveAgents(user);
    return {
      users: initial,
      total: initial.length,
      onlineCount: initial.filter((u) => u.status === 'Online').length,
      offlineCount: initial.filter((u) => u.status !== 'Online').length,
      loading: false,
    };
  });
  const [agentFilter, setAgentFilter] = useState('all'); // 'all' | 'online' | 'offline'
  const [agentSearch, setAgentSearch] = useState('');
  const [isRefreshingAgents, setIsRefreshingAgents] = useState(false);
  const [showAgentsPanel, setShowAgentsPanel] = useState(false);

  // Subscribe to real-time agent updates and fetch active/inactive users
  useEffect(() => {
    const unsub = subscribeTeamAgents(
      user,
      (data) => {
        setAgentsData(data);
      },
      { search: agentSearch, status: agentFilter }
    );

    return () => unsub();
  }, [user, agentSearch, agentFilter]);

  // Instant fresh sync whenever agents panel is opened
  useEffect(() => {
    if (showAgentsPanel) {
      fetchAllUsers(user, { search: agentSearch, status: agentFilter }).then((fresh) => {
        if (fresh) {
          setAgentsData((prev) => ({ ...prev, ...fresh, loading: false }));
        }
      });
    }
  }, [showAgentsPanel, user, agentSearch, agentFilter]);

  const handleRefreshAgents = async () => {
    setIsRefreshingAgents(true);
    try {
      const fresh = await fetchAllUsers(user, { search: agentSearch, status: agentFilter });
      setAgentsData((prev) => ({ ...prev, ...fresh, loading: false }));
    } catch (e) {
      console.warn('Manual agent refresh error:', e);
    } finally {
      setTimeout(() => setIsRefreshingAgents(false), 450);
    }
  };



  // Core essential settings
  const [displayName, setDisplayName] = useState(defaultAgentName);
  const [userRole, setUserRole] = useState(() => {
    try {
      const raw = localStorage.getItem('strawcrm_preferences');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.role) return p.role;
      }
    } catch { }
    return 'Lead Administrator';
  });

  const handleRoleChange = (newRole) => {
    setUserRole(newRole);
    updateUserRole(user, newRole);
    try {
      const currentRaw = localStorage.getItem('strawcrm_preferences');
      const existing = currentRaw ? JSON.parse(currentRaw) : {};
      localStorage.setItem('strawcrm_preferences', JSON.stringify({ ...existing, role: newRole }));
    } catch { }
    setAgentsData((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.isCurrentUser ? { ...u, role: newRole } : u)),
    }));
  };

  const [defaultViewMode, setDefaultViewMode] = useState('grid');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    try {
      return localStorage.getItem('strawcrm_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });

  const [saved, setSaved] = useState(false);

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('strawcrm_preferences');
      if (raw) {
        const p = JSON.parse(raw);
        if (p.displayName) setDisplayName(p.displayName);
        if (p.role) setUserRole(p.role);
        if (p.defaultViewMode) setDefaultViewMode(p.defaultViewMode);
        if (p.emailNotifications !== undefined) setEmailNotifications(p.emailNotifications);
        if (p.soundAlerts !== undefined) setSoundAlerts(p.soundAlerts);
      }
    } catch { }
  }, []);

  // Listen to external changes
  useEffect(() => {
    const handlePinnedChange = (e) => {
      if (e.detail?.isPinned !== undefined) {
        setSidebarPinned(Boolean(e.detail.isPinned));
      }
    };
    const handleViewChange = (e) => {
      if (e.detail?.viewMode) {
        setDefaultViewMode(e.detail.viewMode);
      }
    };
    const handleStorage = (e) => {
      if (e.key === 'strawcrm_sidebar_pinned') {
        setSidebarPinned(e.newValue === 'true');
      }
      if (e.key === 'strawcrm_preferences') {
        try {
          const p = JSON.parse(e.newValue || '{}');
          if (p.defaultViewMode) setDefaultViewMode(p.defaultViewMode);
        } catch { }
      }
    };

    window.addEventListener('sidebar-pinned-change', handlePinnedChange);
    window.addEventListener('tickets-view-mode-change', handleViewChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('sidebar-pinned-change', handlePinnedChange);
      window.removeEventListener('tickets-view-mode-change', handleViewChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Instant handler for Default Tickets View switch
  const handleDefaultViewChange = (mode) => {
    setDefaultViewMode(mode);
    try {
      const raw = localStorage.getItem('strawcrm_preferences');
      const prefs = raw ? JSON.parse(raw) : {};
      prefs.defaultViewMode = mode;
      localStorage.setItem('strawcrm_preferences', JSON.stringify(prefs));
      window.dispatchEvent(new CustomEvent('tickets-view-mode-change', { detail: { viewMode: mode } }));
    } catch { }
  };

  // Instant handler for Sidebar Pin toggle
  const handleToggleSidebarPin = (val) => {
    setSidebarPinned(val);
    try {
      localStorage.setItem('strawcrm_sidebar_pinned', String(val));
      window.dispatchEvent(new CustomEvent('sidebar-pinned-change', { detail: { isPinned: val } }));
    } catch { }
  };

  const [testStatus, setTestStatus] = useState(null); // 'sound' | 'email'

  // Instant handler for Email Notifications toggle
  const handleToggleEmailNotifications = async (checked) => {
    setEmailNotifications(checked);
    setNotificationPreference('emailNotifications', checked);
    if (checked) {
      await requestBrowserNotificationPermission();
    }
  };

  // Instant handler for Sound Alerts toggle
  const handleToggleSoundAlerts = (checked) => {
    setSoundAlerts(checked);
    setNotificationPreference('soundAlerts', checked);
    if (checked) {
      playUrgentAlertSound();
    }
  };

  // Test sound alert button
  const handleTestSound = () => {
    playUrgentAlertSound();
    setTestStatus('sound');
    setTimeout(() => setTestStatus(null), 2500);
  };

  // Test email notification alert button
  const handleTestEmail = () => {
    const targetEmail = user?.email || 'heyavinashs@gmail.com';
    dispatchTicketNotification({
      ticket: {
        ticket_id: 'TKT-TEST',
        subject: 'Priority Ticket Alert · Test Dispatch',
        priority: 'Urgent',
      },
      recipientEmail: targetEmail,
      type: 'test',
    });
    setTestStatus('email');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleSave = (e) => {
    e?.preventDefault();
    try {
      const currentRaw = localStorage.getItem('strawcrm_preferences');
      const existing = currentRaw ? JSON.parse(currentRaw) : {};
      const updated = {
        ...existing,
        displayName,
        role: userRole,
        defaultViewMode,
        emailNotifications,
        soundAlerts,
      };
      localStorage.setItem('strawcrm_preferences', JSON.stringify(updated));
      localStorage.setItem('strawcrm_sidebar_pinned', String(sidebarPinned));
      window.dispatchEvent(new CustomEvent('sidebar-pinned-change', { detail: { isPinned: sidebarPinned } }));
      window.dispatchEvent(new CustomEvent('tickets-view-mode-change', { detail: { viewMode: defaultViewMode } }));
    } catch { }

    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await logout();
    if (onNavigate) onNavigate('/login');
  };

  return (
    <main className="flex-1 flex flex-col h-full min-h-0 bg-[#E8EEF5] text-slate-900 overflow-y-auto p-4 sm:p-5 lg:p-6 no-scrollbar w-full">
      <div className="w-full h-full flex flex-col min-h-0 space-y-4 transition-all duration-200">
        {/* Header Section (Full Width, No Neumorphism mention) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-300/40">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Manage your workspace identity, notification alerts, display modes, and support team members.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8EEF5] shadow-neu-btn hover:shadow-neu-card active:shadow-neu-btn-pressed border border-white/80 text-xs font-bold text-rose-600 hover:bg-rose-50/50 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Sign Out</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-black shadow-[3px_3px_10px_rgba(14,165,233,0.35),-2px_-2px_8px_rgba(255,255,255,0.9)] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 text-white" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Balanced 2-Column Responsive Layout Utilizing Full Side Space */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
            {/* COLUMN 1: Profile & Workspace Preferences */}
            <div className="space-y-4">
              {/* 1. Profile Information Card */}
              <div className="rounded-2xl bg-[#E8EEF5] p-4 sm:p-4.5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-300/40">
                  <div className="w-8 h-8 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500 shrink-0">
                    <User className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                      Profile Information
                    </h2>
                    <p className="text-[10px] font-medium text-slate-500">
                      Your identity visible across tickets, responses, and audit logs
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="e.g. Avinash Singh"
                      className="neu-input w-full px-3.5 py-2 text-xs font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Account Email
                    </label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || 'agent@strawcrm.com'}
                      className="neu-input w-full px-3.5 py-2 text-xs font-mono font-bold select-all"
                    />
                    <p className="text-[9.5px] text-slate-400 mt-0.5">Managed via authentication provider</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase tracking-wide">
                      Agent Role
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={userRole}
                        onChange={(e) => handleRoleChange(e.target.value)}
                        placeholder="e.g. Lead Administrator, Billing Lead..."
                        list="agent-roles-list"
                        className="neu-input w-full px-3.5 py-2 text-xs font-bold text-slate-800"
                      />
                      <datalist id="agent-roles-list">
                        {AVAILABLE_ROLES.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Display & Workspace Preferences Card */}
              <div className="rounded-2xl bg-[#E8EEF5] p-4 sm:p-4.5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300">
                <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-300/40">
                  <div className="w-8 h-8 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500 shrink-0">
                    <Sliders className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                      Display & Layout Preferences
                    </h2>
                    <p className="text-[10px] font-medium text-slate-500">
                      Configure default view layouts and sidebar behavior
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-2.5">
                  {/* Default View Mode Segmented Pill Buttons */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                      Default Tickets View
                    </label>
                    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60">
                      <button
                        type="button"
                        onClick={() => handleDefaultViewChange('grid')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${defaultViewMode === 'grid'
                            ? 'bg-[#E8EEF5] shadow-neu-btn text-sky-600 border border-white/90 font-black'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        <LayoutGrid className="w-3.5 h-3.5" />
                        <span>Cards (Grid)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDefaultViewChange('table')}
                        className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer ${defaultViewMode === 'table'
                            ? 'bg-[#E8EEF5] shadow-neu-btn text-sky-600 border border-white/90 font-black'
                            : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        <List className="w-3.5 h-3.5" />
                        <span>Table (List)</span>
                      </button>
                    </div>
                  </div>

                  {/* Sidebar Pin Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#E2E9F2]/50 border border-white/60">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Keep Sidebar Always Pinned</p>
                      <p className="text-[10px] text-slate-500">Keeps the left navigation panel expanded.</p>
                    </div>

                    <NeuToggle
                      checked={sidebarPinned}
                      onChange={handleToggleSidebarPin}
                      ariaLabel="Keep sidebar always pinned"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: Alerts & Team Members Pool */}
            <div className="space-y-4">
              {/* 3. Notifications & Alerts Card */}
              <div className="rounded-2xl bg-[#E8EEF5] p-4 sm:p-4.5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-300/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500 shrink-0">
                      <Bell className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <h2 className="text-xs font-black text-slate-900 tracking-tight uppercase">
                        Alerts & Notifications
                      </h2>
                      <p className="text-[10px] font-medium text-slate-500">
                        Browser audio and email alerts on critical incoming tickets
                      </p>
                    </div>
                  </div>

                  {testStatus && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#E8EEF5] text-sky-600 shadow-neu-btn border border-white/80 animate-in fade-in duration-200">
                      <Check className="w-3 h-3 text-sky-500" />
                      <span>{testStatus === 'sound' ? 'Played 🔔' : 'Sent 📧'}</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2.5 pt-2.5">
                  {/* Email Notifications Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#E2E9F2]/50 border border-white/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">Email Notifications</p>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${emailNotifications
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                          {emailNotifications ? 'Active' : 'Muted'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Priority email updates to <span className="font-mono text-slate-700 font-bold">{user?.email || 'your account'}</span>.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleTestEmail}
                        title="Send sample email alert"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#E8EEF5] hover:bg-[#E2E9F2] shadow-neu-btn active:shadow-neu-btn-pressed border border-white/80 text-slate-700 transition-all cursor-pointer"
                      >
                        <Mail className="w-3 h-3 text-sky-500" />
                        <span>Test Email</span>
                      </button>

                      <NeuToggle
                        checked={emailNotifications}
                        onChange={handleToggleEmailNotifications}
                        ariaLabel="Email notifications toggle"
                      />
                    </div>
                  </div>

                  {/* Sound Alerts Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-[#E2E9F2]/50 border border-white/60">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-slate-800">Urgent Audio Chime</p>
                        <span
                          className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${soundAlerts
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-200 text-slate-500'
                            }`}
                        >
                          {soundAlerts ? 'Audible' : 'Silent'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Chimes alert chime inside your browser when urgent tickets arrive.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={handleTestSound}
                        title="Preview sound chime"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#E8EEF5] hover:bg-[#E2E9F2] shadow-neu-btn active:shadow-neu-btn-pressed border border-white/80 text-slate-700 transition-all cursor-pointer"
                      >
                        <Volume2 className="w-3 h-3 text-sky-500" />
                        <span>Play Sound</span>
                      </button>

                      <NeuToggle
                        checked={soundAlerts}
                        onChange={handleToggleSoundAlerts}
                        ariaLabel="Urgent sound chime toggle"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. Active Support Agents Pool Card */}
              <div className="rounded-2xl bg-[#E8EEF5] p-4 sm:p-4.5 shadow-neu-card hover:shadow-neu-card-hover border border-white/70 transition-all duration-300">
                <div className="flex items-center justify-between gap-2.5 pb-2.5 border-b border-slate-300/40">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500 shrink-0">
                      <Users className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs font-black text-slate-900 tracking-tight uppercase truncate">
                        Active Support Agents
                      </h2>
                      <p className="text-[10px] font-medium text-slate-500 truncate">
                        Dispatch pool for automatic & manual ticket assignments
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#E8EEF5] shadow-neu-btn border border-white/80 text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)] shrink-0" />
                    <span className="whitespace-nowrap">{agentsData.onlineCount} Online</span>
                  </div>
                </div>

                {/* Only 2 Agents Displayed in Compact Preview */}
                <div className="mt-2.5 p-1.5 rounded-xl bg-[#E2E9F2]/70 shadow-neu-inset border border-white/60 divide-y divide-slate-300/40">
                  {agentsData.users.slice(0, 2).map((agent) => (
                    <div
                      key={agent.id || agent.email}
                      className="p-3 rounded-xl hover:bg-white/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${agent.color || 'from-blue-600 to-cyan-600'
                            } text-white font-black text-xs flex items-center justify-center shrink-0 shadow-neu-icon`}
                        >
                          {agent.avatar || 'AS'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {agent.name}
                            </p>
                            {agent.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#E8EEF5] shadow-neu-btn text-sky-600 border border-white/80">
                                You
                              </span>
                            )}
                            {(agent.isCurrentUser ? userRole : agent.role) && (
                              <span className="text-[10px] font-semibold text-slate-600 bg-white/70 px-2 py-0.5 rounded-md border border-white/90 shadow-neu-inset truncate">
                                {agent.isCurrentUser ? userRole : agent.role}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate font-mono font-medium">
                            {agent.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 ${agent.status === 'Online' ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${agent.status === 'Online'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                : 'bg-slate-400'
                              }`}
                          />
                          <span>{agent.status}</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* View More Button */}
                <button
                  type="button"
                  onClick={() => setShowAgentsPanel(true)}
                  className="w-full mt-3 py-2.5 px-4 rounded-xl bg-[#E8EEF5] hover:bg-white/80 active:shadow-neu-inset shadow-neu-btn border border-white/80 text-xs font-bold text-slate-700 hover:text-sky-600 flex items-center justify-center gap-2 transition-all group cursor-pointer"
                >
                  <span>View More Agents</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all" />
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* ── All Agents Directory Panel Modal ── */}
      {showAgentsPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl bg-[#E8EEF5] rounded-3xl p-6 shadow-2xl border border-white/80 flex flex-col max-h-[90vh] animate-slide-up">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-300/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 flex items-center justify-center text-sky-500 shrink-0">
                  <Users className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                    Support Agents Directory
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    Complete workspace roster for ticket dispatch & assignment
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRefreshAgents}
                  disabled={isRefreshingAgents}
                  title="Sync roster"
                  className="p-2 rounded-xl bg-[#E8EEF5] hover:bg-white/80 active:shadow-neu-inset text-slate-700 shadow-neu-btn border border-white/80 transition-all cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw
                    className={`w-4 h-4 text-sky-600 ${isRefreshingAgents ? 'animate-spin text-brand-electric' : ''}`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setShowAgentsPanel(false)}
                  className="p-2 rounded-xl bg-[#E8EEF5] hover:bg-white/80 active:shadow-neu-inset text-slate-500 hover:text-slate-800 shadow-neu-btn border border-white/80 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filter and Search Bar inside Panel */}
            <div className="my-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
              {/* Status Pills */}
              <div className="inline-flex p-1 rounded-2xl bg-[#E2E9F2] shadow-neu-inset border border-white/60 shrink-0">
                <button
                  type="button"
                  onClick={() => setAgentFilter('all')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all ${agentFilter === 'all'
                      ? 'bg-[#E8EEF5] shadow-neu-btn text-slate-900 border border-white/80'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  All ({agentsData.total})
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFilter('online')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all inline-flex items-center gap-1.5 ${agentFilter === 'online'
                      ? 'bg-[#E8EEF5] shadow-neu-btn text-emerald-700 border border-white/80'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online ({agentsData.onlineCount})
                </button>
                <button
                  type="button"
                  onClick={() => setAgentFilter('offline')}
                  className={`px-3 py-1 text-[11px] font-bold rounded-xl transition-all inline-flex items-center gap-1.5 ${agentFilter === 'offline'
                      ? 'bg-[#E8EEF5] shadow-neu-btn text-slate-700 border border-white/80'
                      : 'text-slate-500 hover:text-slate-800'
                    }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  Offline ({agentsData.offlineCount})
                </button>
              </div>

              {/* Quick Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  placeholder="Search agents by name or email..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-[#E2E9F2] shadow-neu-inset text-xs font-medium text-slate-800 placeholder-slate-400 border border-white/50 focus:outline-none focus:ring-1 focus:ring-sky-400"
                />
                {agentSearch && (
                  <button
                    type="button"
                    onClick={() => setAgentSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Agents List in Panel (Custom hidden scrollbar, fully scrollable) */}
            <div
              className="flex-1 overflow-y-auto p-2 rounded-2xl bg-[#E2E9F2]/70 shadow-neu-inset border border-white/60 space-y-1.5 divide-y divide-slate-300/30 min-h-0 no-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {agentsData.users.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                  <p className="font-semibold text-slate-500">No agents found</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Try adjusting your search query or status filter
                  </p>
                </div>
              ) : (
                agentsData.users.map((agent) => (
                  <div key={agent.id || agent.email} className="pt-2 first:pt-0">
                    <div className="p-2.5 rounded-xl hover:bg-white/50 transition-colors flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl bg-gradient-to-br ${agent.color || 'from-blue-600 to-cyan-600'
                            } text-white font-black text-xs flex items-center justify-center shrink-0 shadow-neu-icon`}
                        >
                          {agent.avatar || 'AS'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-black text-slate-900 truncate">
                              {agent.name}
                            </p>
                            {agent.isCurrentUser && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#E8EEF5] shadow-neu-btn text-sky-600 border border-white/80">
                                You
                              </span>
                            )}
                            {(agent.isCurrentUser ? userRole : agent.role) && (
                              <span className="text-[10px] font-semibold text-slate-600 bg-white/70 px-2 py-0.5 rounded-md border border-white/90 shadow-neu-inset truncate">
                                {agent.isCurrentUser ? userRole : agent.role}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate font-mono font-medium">
                            {agent.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-xl bg-[#E8EEF5] shadow-neu-btn border border-white/80 ${agent.status === 'Online' ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${agent.status === 'Online'
                                ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                                : 'bg-slate-400'
                              }`}
                          />
                          <span>{agent.status}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
