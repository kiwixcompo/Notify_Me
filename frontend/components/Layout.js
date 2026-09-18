import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import axios from 'axios';
import { ToastProvider } from './MobileToast';
import { getApiBase, isAdminUser } from '../utils/apiBase';

// ─── SVG Icons for Bottom Nav (crisp 24px, not emoji) ──────────────────────
function IconHome({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12L12 3l9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" />
    </svg>
  );
}
function IconSearch({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="7" strokeLinecap="round" />
      <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function IconGrants({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 3a9 9 0 100 18A9 9 0 0012 3zm1 13h-2v-4h2v4zm0-6h-2V8h2v2z"/>
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round"/>
      <path strokeLinecap="round" d="M12 8v4m0 4h.01"/>
    </svg>
  );
}
function IconGlobal({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="12" r="9" strokeLinecap="round"/>
      <path strokeLinecap="round" d="M3.6 9h16.8M3.6 15h16.8M12 3c-2 3-3 6-3 9s1 6 3 9M12 3c2 3 3 6 3 9s-1 6-3 9"/>
    </svg>
  );
}
function IconMore({ filled }) {
  return filled ? (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  ) : (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="12" cy="6" r="1.2" fill="currentColor"/>
      <circle cx="12" cy="12" r="1.2" fill="currentColor"/>
      <circle cx="12" cy="18" r="1.2" fill="currentColor"/>
    </svg>
  );
}

// ─── Bottom nav tab config (5 items — within Apple/Android 3–5 recommendation)
const BOTTOM_TABS = [
  {
    href: '/dashboard',
    label: 'Home',
    Icon: IconHome,
    // "active" for dashboard only
    isActive: (path) => path === '/dashboard',
  },
  {
    href: '/jobs',
    label: 'Search',
    Icon: IconSearch,
    // active for both jobs and linkedin (both are "search" tools)
    isActive: (path) => path === '/jobs' || path === '/linkedin',
  },
  {
    href: '/grants',
    label: 'Grants',
    Icon: IconGrants,
    isActive: (path) => path === '/grants',
  },
  {
    href: '/international',
    label: 'Global',
    Icon: IconGlobal,
    isActive: (path) => path === '/international',
  },
  {
    href: '/preferences',
    label: 'More',
    Icon: IconMore,
    isActive: (path) => path === '/preferences',
  },
];

// ─── Desktop nav links (kept the same as before)
const navLinks = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/jobs', icon: '💼', label: 'AI Job Hunter' },
  { href: '/fiverr', icon: '🎯', label: 'Fiverr Studio' },
  { href: '/linkedin', icon: '🌐', label: 'LinkedIn Crawler' },
  { href: '/international', icon: '🌍', label: 'Global Portals' },
  { href: '/grants', icon: '🔬', label: 'Grants Studio' },
  { href: '/preferences', icon: '⚙️', label: 'Sources' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedRole = localStorage.getItem('user_role');
      const storedEmail = localStorage.getItem('user_email');
      if (storedRole) setUserRole(storedRole);
      if (storedEmail) setUserEmail(storedEmail);

      const token = localStorage.getItem('token');
      if (token) {
        const apiBase = getApiBase();
        axios.get(`${apiBase}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
          if (res.data?.role) {
            setUserRole(res.data.role);
            localStorage.setItem('user_role', res.data.role);
          }
          if (res.data?.email) {
            setUserEmail(res.data.email);
            localStorage.setItem('user_email', res.data.email);
          }
        }).catch(() => {});
      }
    }
  }, []);

  const isActive = (path) => router.pathname === path;

  const isAdmin = isAdminUser(userRole, userEmail);

  const currentNavLinks = isAdmin
    ? [...navLinks, { href: '/admin', icon: '🛡️', label: 'Admin' }]
    : navLinks;

  return (
    <ToastProvider>
      <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col w-full max-w-full overflow-x-hidden">

        {/* ── Desktop / Tablet Top Navigation ──────────────────── */}
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm w-full">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center gap-2 min-w-0">

              {/* Logo */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-2xl" aria-hidden="true">⚡</span>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent whitespace-nowrap"
                >
                  <span>Notify_Me</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wide">
                    AI
                  </span>
                </Link>
              </div>

              {/* Desktop Navigation (xl+) — icon + label, left-aligned, no justify-center */}
              <div className="hidden xl:flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                {currentNavLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    className={`px-2.5 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {/* Tablet Navigation (md–xl) — ICON ONLY, centered, fits all items without overflow */}
              <div className="hidden md:flex xl:hidden items-center gap-1 flex-1 min-w-0 justify-center">
                {currentNavLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={item.label}
                    aria-label={item.label}
                    className={`w-10 h-10 rounded-lg transition-colors flex items-center justify-center text-lg shrink-0 ${
                      isActive(item.href)
                        ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                  </Link>
                ))}
              </div>

              {/* Right side actions — pushed to end with ml-auto on mobile */}
              <div className="flex items-center gap-1.5 ml-auto shrink-0">
                {/* Clear data — desktop/tablet only */}
                <button
                  onClick={() => {
                    if (window.confirm('Clear all locally saved searches, resume data, and preferences?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="hidden sm:flex px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-lg transition-colors items-center gap-1"
                  title="Clear all saved data"
                >
                  <span aria-hidden="true">🗑️</span>
                  <span>Clear</span>
                </button>

                {/* Logout / Switch Account */}
                <button
                  onClick={() => {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                  }}
                  className="hidden sm:flex px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-lg transition-colors items-center gap-1"
                  title="Log out"
                >
                  <span aria-hidden="true">🚪</span>
                  <span>Log out</span>
                </button>

                {/* Mobile top-right: icon-only admin shield + settings cog (no text = no overflow) */}
                <div className="md:hidden flex items-center gap-1.5">
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-900 text-white text-base shadow-sm border border-indigo-700"
                      title="Admin Panel"
                      aria-label="Admin Panel"
                    >
                      🛡️
                    </Link>
                  )}
                  <Link
                    href="/preferences"
                    className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold"
                    aria-label="Settings and profile"
                  >
                    ⚙
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* ── Main Content Area ─────────────────────────────────── */}
        {/* On mobile: pb-bottom-nav gives room for the fixed bottom nav */}
        <main className="max-w-7xl mx-auto w-full flex-1 pb-bottom-nav md:pb-0 overflow-x-hidden px-0 sm:px-6 lg:px-8 md:py-6">
          {children}
        </main>

        {/* ── Mobile Bottom Navigation (md:hidden) ─────────────── */}
        {/*
          5 tabs: Home | Search | Grants | Global | More
          Each tab: SVG icon (24px) + label + active indicator pill
          Touch targets: min 48px height via py + the tab's flex container
          Safe area: pb-safe ensures content isn't hidden behind home indicator
        */}
        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-1px_0_0_rgba(0,0,0,0.06),0_-4px_12px_rgba(0,0,0,0.04)]"
          aria-label="Main navigation"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="flex justify-around items-end px-1 pt-1 pb-1">
            {BOTTOM_TABS.map((tab) => {
              const active = tab.isActive(router.pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-label={tab.label}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2 px-2 rounded-2xl transition-all duration-150 active:scale-90 min-w-[56px] min-h-[52px] justify-center ${
                    active
                      ? 'text-blue-600'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {/* Active indicator pill behind icon */}
                  <div className={`relative flex items-center justify-center ${active ? 'after:absolute after:inset-[-6px] after:bg-blue-50 after:rounded-2xl after:-z-10' : ''}`}>
                    <tab.Icon filled={active} />
                  </div>
                  <span
                    className={`text-[10px] font-semibold leading-none ${
                      active ? 'text-blue-600' : 'text-slate-400'
                    }`}
                  >
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>

      </div>
    </ToastProvider>
  );
}