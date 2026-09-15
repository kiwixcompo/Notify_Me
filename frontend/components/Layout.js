import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Layout({ children }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path) => router.pathname === path;

  const navLinks = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/jobs', icon: '💼', label: 'AI Job Hunter' },
    { href: '/linkedin', icon: '🌐', label: 'LinkedIn Crawler' },
    { href: '/international', icon: '🇪🇺', label: 'Global Portals' },
    { href: '/grants', icon: '🔬', label: 'Grants Studio' },
    { href: '/preferences', icon: '⚙️', label: 'Sources' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-2xl">⚡</span>
              <Link href="/dashboard" className="flex items-center gap-1.5 font-bold text-base sm:text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                <span>Notify_Me</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200 uppercase tracking-wide">
                  AI
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden xl:flex items-center space-x-1">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Tablet Navigation (compact) */}
            <div className="hidden md:flex xl:hidden items-center space-x-1">
              {navLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 whitespace-nowrap ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-700 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Desktop Action + Mobile Menu Toggle */}
            <div className="flex items-center space-x-2 shrink-0">
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
                <span>🗑️</span>
                <span>Clear</span>
              </button>

              {/* Hamburger Button for Mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
                aria-label="Toggle navigation menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
            {navLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive(item.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  if (window.confirm('Clear all locally saved searches, resume data, and preferences?')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100"
              >
                🗑️ Clear All Saved Data
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1">{children}</main>

      {/* Mobile Bottom Navigation Bar (Persistent Native Style) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 flex justify-around items-center py-2 px-1 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <Link
          href="/dashboard"
          className={`flex flex-col items-center text-xs py-1 px-2 rounded-lg ${
            isActive('/dashboard') ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">📊</span>
          <span className="text-[10px] mt-0.5">Dashboard</span>
        </Link>
        <Link
          href="/jobs"
          className={`flex flex-col items-center text-xs py-1 px-2 rounded-lg ${
            isActive('/jobs') ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">💼</span>
          <span className="text-[10px] mt-0.5">Job Hunter</span>
        </Link>
        <Link
          href="/linkedin"
          className={`flex flex-col items-center text-xs py-1 px-1.5 rounded-lg ${
            isActive('/linkedin') ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">🌐</span>
          <span className="text-[10px] mt-0.5">LinkedIn</span>
        </Link>
        <Link
          href="/international"
          className={`flex flex-col items-center text-xs py-1 px-1.5 rounded-lg ${
            isActive('/international') ? 'text-indigo-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">🇪🇺</span>
          <span className="text-[10px] mt-0.5">Europe</span>
        </Link>
        <Link
          href="/grants"
          className={`flex flex-col items-center text-xs py-1 px-1.5 rounded-lg ${
            isActive('/grants') ? 'text-purple-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">🔬</span>
          <span className="text-[10px] mt-0.5">Grants</span>
        </Link>
        <Link
          href="/preferences"
          className={`flex flex-col items-center text-xs py-1 px-1.5 rounded-lg ${
            isActive('/preferences') ? 'text-blue-600 font-bold' : 'text-slate-500'
          }`}
        >
          <span className="text-base">⚙️</span>
          <span className="text-[10px] mt-0.5">Sources</span>
        </Link>
      </div>
    </div>
  );
}