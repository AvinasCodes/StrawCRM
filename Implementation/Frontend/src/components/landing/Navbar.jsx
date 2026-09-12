import React, { useState, useEffect } from 'react';
import { Menu, X, ArrowRight, LayoutDashboard, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export default function Navbar({ onNavigate }) {
  const { isAuthenticated } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Tickets', href: '#tickets' },
    { label: 'AI Intelligence', href: '#ai' },
    { label: 'Workflow', href: '#workflow' },
    { label: 'Analytics', href: '#analytics' },
  ];

  const handleLinkClick = (e, href) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 pt-3 sm:pt-4 px-3 sm:px-6 lg:px-8 transition-all duration-300">
      {/* Unified Floating Glassmorphic Navbar Container */}
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-5 py-2.5 rounded-full flex items-center justify-between transition-all duration-300 ${
          scrolled
            ? 'bg-[#030c24]/90 backdrop-blur-2xl border border-sky-400/25 shadow-[0_10px_35px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]'
            : 'bg-[#030c24]/75 backdrop-blur-xl border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.1)]'
        }`}
      >
        {/* Brand Anchor */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 group focus:outline-none shrink-0"
        >
          <img
            src="/brand-logo.png"
            alt="StrawCRM Brand Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] group-hover:scale-105 transition-transform shrink-0"
          />
          <span className="text-base sm:text-lg font-black tracking-tight text-white flex items-center leading-none">
            Straw<span className="text-cyan-400 drop-shadow-[0_0_12px_rgba(34,211,238,0.7)]">CRM</span>
          </span>
        </a>

        {/* Center Nav Items */}
        <nav className="hidden md:flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-full border border-white/5">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={(e) => handleLinkClick(e, link.href)}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all cursor-pointer"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action CTAs */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('/dashboard')}
              className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white text-xs font-extrabold shadow-[0_0_20px_rgba(14,165,233,0.6),inset_0_1px_2px_rgba(255,255,255,0.7)] hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Go to Dashboard</span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/login')}
                className="px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Staff Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/dashboard')}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white text-xs font-black shadow-[0_0_20px_rgba(14,165,233,0.65),inset_0_1px_2px_rgba(255,255,255,0.7)] hover:shadow-[0_0_30px_rgba(34,211,238,0.85)] hover:brightness-105 active:scale-95 transition-all cursor-pointer group"
              >
                <span>Access Portal</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation Menu"
          className="md:hidden p-2 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-all focus:outline-none"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-3 pb-6 bg-[#030c24]/95 backdrop-blur-2xl border border-sky-400/25 shadow-2xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 mt-2 mx-auto max-w-7xl rounded-3xl">
          <div className="space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={(e) => handleLinkClick(e, link.href)}
                className="block px-3.5 py-2 rounded-xl text-sm font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-sky-400/20 flex flex-col gap-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white text-xs font-black shadow-[0_0_20px_rgba(14,165,233,0.5)]"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('/login')}
                  className="w-full py-2 text-xs font-bold text-slate-300 hover:text-white"
                >
                  Staff Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate && onNavigate('/dashboard')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 text-white text-xs font-black shadow-[0_0_20px_rgba(14,165,233,0.5)]"
                >
                  <span>Access Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
