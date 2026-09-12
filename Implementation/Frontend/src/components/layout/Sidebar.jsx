import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard,
  Ticket,
  PlusCircle,
  Users,
  Bot,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronUp,
  X,
  Pin,
  PinOff,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function Sidebar({
  currentPath,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) {
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Hover-to-reveal (Arrow cursor) & Pin states
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(() => {
    try {
      return localStorage.getItem('strawcrm_sidebar_pinned') === 'true';
    } catch {
      return false;
    }
  });
  const hoverTimeoutRef = useRef(null);

  // Sync body class whenever isPinned changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('sidebar-is-pinned', isPinned);
    }
  }, [isPinned]);

  // Listen to external pin changes (e.g. from Settings page or other tabs)
  useEffect(() => {
    const handlePinnedChange = (e) => {
      if (e.detail?.source === 'Sidebar') return;
      const next =
        e.detail?.isPinned !== undefined
          ? Boolean(e.detail.isPinned)
          : localStorage.getItem('strawcrm_sidebar_pinned') === 'true';
      setIsPinned((curr) => (curr !== next ? next : curr));
    };
    const handleStorage = (e) => {
      if (e.key === 'strawcrm_sidebar_pinned') {
        const next = e.newValue === 'true';
        setIsPinned((curr) => (curr !== next ? next : curr));
      }
    };

    window.addEventListener('sidebar-pinned-change', handlePinnedChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('sidebar-pinned-change', handlePinnedChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const togglePin = (e) => {
    if (e) {
      e.stopPropagation();
    }
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);

    setIsPinned((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('strawcrm_sidebar_pinned', String(next));
      } catch { }
      queueMicrotask(() => {
        window.dispatchEvent(
          new CustomEvent('sidebar-pinned-change', {
            detail: { isPinned: next, source: 'Sidebar' },
          })
        );
      });
      return next;
    });
  };

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isPinned) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const displayName =
    user?.displayName ||
    (user?.email
      ? user.email
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Agent');

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Tickets', path: '/tickets', icon: Ticket },
    { label: 'Create Ticket', path: '/tickets/create', icon: PlusCircle },
    { label: 'Customers', path: '/customers', icon: Users },
    { label: 'AI Assistant', path: '/ai', icon: Bot },
    { label: 'Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleNavClick = (target) => {
    const path = typeof target === 'string' ? target : target?.path;
    if (onCloseMobile) onCloseMobile();
    if (onNavigate && path) onNavigate(path);
  };

  const handleSignOut = async () => {
    setUserMenuOpen(false);
    await logout();
    if (onNavigate) onNavigate('/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-50 md:hidden animate-in fade-in duration-200"
            onClick={onCloseMobile}
          />,
          document.body
        )}

      {/* Desktop Hover Trigger Strip on the left edge (when auto-hide is active) */}
      {!isPinned && (
        <div
          onMouseEnter={handleMouseEnter}
          className="hidden md:flex fixed inset-y-0 left-0 w-8 hover:w-12 z-40 items-center justify-start cursor-pointer group transition-all duration-150"
          title="Move arrow here to reveal sidebar"
        >
          <div className="h-28 w-2 rounded-r-2xl bg-[#0f2e7c] shadow-[0_0_14px_rgba(20,60,160,0.6)] border border-blue-400/35 group-hover:w-3.5 group-hover:border-blue-400 group-hover:shadow-[0_0_20px_rgba(56,189,248,0.8)] transition-all flex items-center justify-center">
            <ChevronRight className="w-4 h-4 text-[#38bdf8] opacity-80 group-hover:opacity-100 transition-opacity -ml-0.5" />
          </div>
        </div>
      )}

      {/* Lighter Navy Blue Sidebar Element (Visibly Rich Blue, NOT White and NOT Pitch Black) */}
      <aside
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-gradient-to-b from-[#143f9e] via-[#0e2e7c] to-[#09205c] text-white flex flex-col justify-between px-2.5 py-3.5 h-full border-r border-blue-400/25 shadow-[10px_0_30px_rgba(7,20,55,0.6)] transition-transform duration-200 ease-out will-change-transform shrink-0 font-sans overflow-y-auto no-scrollbar ${mobileOpen || isPinned || isHovered ? 'translate-x-0' : '-translate-x-full'
          } ${isPinned ? 'md:static md:shadow-none' : ''}`}
      >
        <div className="w-full">
          {/* Logo & Header (Brand Section) */}
          <div className="flex items-center justify-between pb-3 border-b border-blue-400/20 mb-3 px-1">
            <div
              className="flex items-center gap-2.5 cursor-pointer group"
              onClick={() => handleNavClick('/dashboard')}
            >
              <div className="w-9 h-9 rounded-2xl bg-[#0a1e54] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.5),inset_-2px_-2px_5px_rgba(255,255,255,0.12)] border border-blue-300/25 p-1.5 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <img
                  src="/brand-logo.png"
                  alt="StrawCRM Logo"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <span className="text-base font-black tracking-tight text-white flex items-center">
                  Straw<span className="text-[#1d8ae9]">CRM</span>
                </span>
                <p className="text-[9px] text-blue-200/80 font-semibold -mt-0.5">
                  Simple Tickets. Smarter Support.
                </p>
              </div>
            </div>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close menu"
              className="p-1.5 rounded-xl bg-[#0a1e54] shadow-[2px_2px_6px_rgba(0,0,0,0.4)] border border-blue-300/20 text-blue-200 hover:text-white md:hidden cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Desktop Pin / Auto-Hide Toggle */}
          <div className="hidden md:flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] text-blue-200/80 font-bold uppercase tracking-wider">
              Navigation
            </span>
            <button
              type="button"
              onClick={togglePin}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label={isPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              title={
                isPinned
                  ? 'Unpin sidebar (Auto-hides when cursor leaves)'
                  : 'Pin sidebar permanently'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all duration-150 select-none cursor-pointer ${isPinned
                  ? 'bg-[#0a1e54] text-[#38bdf8] shadow-[inset_2px_2px_5px_rgba(0,0,0,0.6)] border border-[#38bdf8]/40'
                  : 'bg-[#143c94] text-blue-100 hover:text-white shadow-[2px_2px_6px_rgba(0,0,0,0.3)] border border-blue-300/25 hover:bg-[#1846aa] active:scale-95'
                }`}
            >
              {isPinned ? (
                <Pin className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
              ) : (
                <PinOff className="w-3.5 h-3.5 text-blue-300/80 shrink-0" />
              )}
              <span className="text-[10px]">{isPinned ? 'Pinned' : 'Auto-Hide'}</span>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 text-xs font-semibold" aria-label="Main Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                navItems.some((nav) => nav.path === currentPath)
                  ? currentPath === item.path
                  : item.path !== '/' &&
                  item.path !== '/dashboard' &&
                  currentPath.startsWith(item.path);

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleNavClick(item)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-2xl text-left transition-all duration-200 cursor-pointer group focus:outline-none ${isActive
                      ? 'bg-[#1d52ce] text-white shadow-[0_4px_18px_rgba(11,99,246,0.5),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-blue-300/40 font-bold'
                      : 'text-blue-100/85 hover:text-white hover:bg-white/10 active:bg-[#0a1e54]'
                    }`}
                >
                  <div
                    className={`p-1.5 rounded-xl transition-all shrink-0 ${isActive
                        ? 'bg-[#0b2260] text-[#38bdf8] shadow-inner border border-blue-300/30'
                        : 'text-blue-300/80 group-hover:text-[#38bdf8]'
                      }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <span className="truncate font-bold">{item.label}</span>

                  {item.badge && (
                    <span className="ml-auto text-[9px] bg-[#0a1e54] shadow-inner text-[#38bdf8] px-2 py-0.5 rounded-lg font-mono font-black border border-blue-400/35">
                      {item.badge}
                    </span>
                  )}

                  {isActive && !item.badge && (
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8] ml-auto shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Profile Section */}
        <div
          className="pt-2.5 border-t border-blue-400/20 relative w-full"
          ref={userMenuRef}
        >
          {/* User Popover Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-0 mb-2 w-full bg-[#0b2468] border border-blue-400/35 rounded-2xl shadow-2xl overflow-hidden text-xs p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 z-30">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleNavClick('/settings');
                }}
                className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white font-bold transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Profile</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen(false);
                  handleNavClick('/settings');
                }}
                className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-blue-100 hover:bg-white/10 hover:text-white font-bold transition-all cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-[#38bdf8]" />
                <span>Settings</span>
              </button>
              <div className="my-1 border-t border-blue-400/20" />
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-left flex items-center gap-2.5 p-2 rounded-xl text-rose-300 hover:bg-rose-500/20 font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* User Trigger Card */}
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="w-full flex items-center gap-2.5 p-2 rounded-2xl bg-[#0a1e54] shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:bg-[#0f2c7a] border border-blue-300/20 transition-all text-left focus:outline-none cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1b4fc2] to-[#38bdf8] text-white flex items-center justify-center font-black text-xs shadow-[0_0_10px_rgba(56,189,248,0.5)] border border-white/20 uppercase shrink-0">
              {displayName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-white truncate">{displayName}</p>
              <p className="text-[10px] text-blue-200/80 font-medium truncate">
                {user?.email || 'agent@strawcrm.com'}
              </p>
            </div>
            <ChevronUp
              className={`w-3.5 h-3.5 text-blue-300/80 transition-transform ${userMenuOpen ? 'rotate-180' : ''
                }`}
            />
          </button>
        </div>
      </aside>
    </>
  );
}
