import { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import Link from 'next/link';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const MODULES = [
  {
    href: '/grants',
    icon: '🔬',
    label: 'PhD Scholarship Finder',
    desc: 'FindAPhD crawler, alignment scoring, supervisor cold email composer.',
    color: 'from-purple-600 to-indigo-600',
    badge: 'Core',
    badgeColor: 'bg-purple-100 text-purple-700',
    stats: 'FindAPhD · jobs.ac.uk · Live crawler',
  },
  {
    href: '/jobs',
    icon: '💼',
    label: 'AI Job Hunter',
    desc: 'Search remote tech roles, score your resume match, generate cover letters.',
    color: 'from-blue-600 to-cyan-600',
    badge: 'AI Powered',
    badgeColor: 'bg-blue-100 text-blue-700',
    stats: 'Multi-source · Resume Intelligence · Pipeline',
  },
  {
    href: '/grants',
    icon: '🏛️',
    label: 'Grant Studio',
    desc: 'Find research grants, generate full proposals and itemised budgets.',
    color: 'from-emerald-600 to-teal-600',
    badge: 'Research',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    stats: 'NIH · NSF · Horizon Europe · Wellcome',
  },
  {
    href: '/linkedin',
    icon: '🌐',
    label: 'LinkedIn Crawler',
    desc: 'Crawl LinkedIn job postings and analyse them with AI.',
    color: 'from-sky-600 to-blue-700',
    badge: 'Social',
    badgeColor: 'bg-sky-100 text-sky-700',
    stats: 'AI-analysed · X (Twitter) · Facebook',
  },
  {
    href: '/international',
    icon: '🇪🇺',
    label: 'Global Portals',
    desc: 'European & international talent portals. Visa info, shortage occupations.',
    color: 'from-amber-500 to-orange-600',
    badge: 'International',
    badgeColor: 'bg-amber-100 text-amber-700',
    stats: 'Luxembourg · Denmark · Estonia · EURES · UK',
  },
  {
    href: '/preferences',
    icon: '⚙️',
    label: 'Sources & Settings',
    desc: 'Manage RSS feeds, website links, alert keywords, and AI keys.',
    color: 'from-slate-600 to-gray-700',
    badge: 'Config',
    badgeColor: 'bg-slate-100 text-slate-700',
    stats: 'RSS Feeds · Website Links · Keywords',
  },
];

export default function Dashboard() {
  const [isClient, setIsClient] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: 'Candidate',
    title: 'M.Sc. Software Engineering',
    focus: 'Please setup your profile in preferences'
  });

  // Feed stats state
  const [feedStats, setFeedStats] = useState({ total: 0, feeds: 0 });
  const [recentItems, setRecentItems] = useState([]);
  const [fetchingFeeds, setFetchingFeeds] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sources state
  const [websiteLinks, setWebsiteLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linksError, setLinksError] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [addingLink, setAddingLink] = useState(false);
  const [addLinkMsg, setAddLinkMsg] = useState('');

  // Notification permission
  const [notifPermission, setNotifPermission] = useState('default');

  // Notification permission and subscription
  const requestPushPermission = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported by your browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotifPermission(permission);

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!publicVapidKey) {
          console.warn('VAPID public key not found. Make sure NEXT_PUBLIC_VAPID_PUBLIC_KEY is set in your .env');
          return;
        }

        // urlBase64ToUint8Array function equivalent
        const padding = '='.repeat((4 - publicVapidKey.length % 4) % 4);
        const base64 = (publicVapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: outputArray
        });

        // Send subscription to backend
        await axios.post(`${API_BASE}/api/push/subscribe`, subscription, { headers: getHeaders() });
        alert('Successfully subscribed to notifications!');
      }
    } catch (err) {
      console.error('Error subscribing to push notifications:', err);
      alert('Failed to subscribe to push notifications.');
    }
  };

  const getHeaders = useCallback(() => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // Set client flag + redirect if not logged in
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('token')) {
        window.location.href = '/login';
        return;
      }
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    }
  }, []);

  // Fetch website links (Sources section)
  const fetchWebsiteLinks = useCallback(async () => {
    setLinksLoading(true);
    setLinksError('');
    try {
      const res = await axios.get(`${API_BASE}/api/feeds/website-links`, { headers: getHeaders() });
      setWebsiteLinks(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setLinksError(err.response?.data?.message || err.response?.data?.error || 'Failed to load website links');
    } finally {
      setLinksLoading(false);
    }
  }, [getHeaders]);

  // Fetch feed stats and recent items
  const fetchFeedData = useCallback(async () => {
    setFetchingFeeds(true);
    setProgress(0);
    try {
      const contentType = typeof window !== 'undefined' ? (localStorage.getItem('userPreference') || 'job') : 'job';
      const res = await axios.get(`${API_BASE}/api/user/rss-feeds?type=${contentType}`, { headers: getHeaders() });
      const feeds = res.data.feeds || [];

      const allItems = [];
      for (let i = 0; i < feeds.length; i++) {
        try {
          const endpoint = contentType === 'job' ? 'rss-feeds' : 'scholarships';
          const feedRes = await axios.get(`${API_BASE}/api/user/${endpoint}/${feeds[i]._id}/raw`, { headers: getHeaders() });
          (feedRes.data.items || []).forEach(item =>
            allItems.push({ ...item, feedName: feeds[i].name || feeds[i].url })
          );
        } catch (_) {}
        setProgress(Math.round(((i + 1) / feeds.length) * 100));
      }

      allItems.sort((a, b) => new Date(b.pubDate || 0) - new Date(a.pubDate || 0));
      setFeedStats({ total: allItems.length, feeds: feeds.length });
      setRecentItems(allItems.slice(0, 6));
    } catch (err) {
      console.error('Feed fetch error:', err.message);
    } finally {
      setFetchingFeeds(false);
      setTimeout(() => setProgress(0), 600);
    }
  }, [getHeaders]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/user/profile`, { headers: getHeaders() });
      setUserProfile(prev => ({ ...prev, name: res.data.name }));
    } catch (err) {
      console.error('Failed to load user profile', err);
    }
  }, [getHeaders]);

  useEffect(() => {
    if (!isClient) return;
    fetchWebsiteLinks();
    fetchFeedData();
    fetchUserProfile();
  }, [isClient, fetchWebsiteLinks, fetchFeedData, fetchUserProfile]);

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) return;
    setAddingLink(true);
    setAddLinkMsg('');
    try {
      const res = await axios.post(`${API_BASE}/api/feeds/website-links`, {
        url: newLinkUrl.trim(),
        type: 'other'
      }, { headers: getHeaders() });
      setWebsiteLinks(prev => [...prev, res.data]);
      setNewLinkUrl('');
      setAddLinkMsg('✅ Link added successfully!');
      setTimeout(() => setAddLinkMsg(''), 3000);
    } catch (err) {
      setAddLinkMsg(`❌ ${err.response?.data?.message || 'Failed to add link'}`);
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (id) => {
    if (!window.confirm('Remove this source?')) return;
    try {
      await axios.delete(`${API_BASE}/api/feeds/website-links/${id}`, { headers: getHeaders() });
      setWebsiteLinks(prev => prev.filter(l => l._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleEnableNotifications = () => {
    requestPushPermission();
  };

  const formatAgo = (dateStr) => {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto py-4 px-3 sm:py-8 sm:px-6 space-y-8">

        {/* ---- HERO HEADER ---- */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 rounded-2xl p-6 sm:p-8 text-white shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">⚡</span>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-300 bg-blue-900/40 px-2 py-0.5 rounded-full border border-blue-700">
                  Notify_Me AI · Mission Control
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2">
                Good day, {userProfile.name.split(' ')[0]} 👋
              </h1>
              <p className="text-blue-200 text-sm mt-1">{userProfile.title} · {userProfile.focus}</p>
            </div>

            {/* Live stats */}
            <div className="flex gap-3 flex-wrap">
              {[
                { value: fetchingFeeds ? '…' : feedStats.total, label: 'Items Fetched' },
                { value: feedStats.feeds, label: 'Active Feeds' },
                { value: websiteLinks.length, label: 'Sources' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-center min-w-[80px]"
                >
                  <div className="text-xl font-extrabold">{stat.value}</div>
                  <div className="text-[11px] text-blue-200 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Progress bar while fetching */}
          {fetchingFeeds && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-blue-300 mb-1">
                <span>Fetching feeds…</span><span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 transition-all duration-200 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Notification prompt */}
          {notifPermission === 'default' && (
            <div className="mt-4 flex items-center justify-between bg-white/10 border border-white/20 rounded-xl px-4 py-2">
              <span className="text-sm text-blue-100">🔔 Enable desktop notifications for new opportunities</span>
              <div className="flex gap-4">
                <button onClick={requestPushPermission} className="px-5 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-medium">
                  Enable Web Push
                </button>
                <button onClick={() => setNotifPermission('granted')} className="px-5 py-2 border border-blue-200 text-blue-700 bg-white rounded-lg shadow-sm hover:bg-blue-50 transition font-medium">
                  Dismiss
                </button>
              </div>
            </div>
          )}
          {notifPermission === 'granted' && (
            <div className="mt-3 text-xs text-green-300 font-semibold">✅ Desktop notifications enabled</div>
          )}
        </div>

        {/* ---- MODULE CARDS ---- */}
        <div>
          <h2 className="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2 uppercase tracking-wide">
            🗂️ Tools & Modules
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((mod) => (
              <Link
                key={mod.label}
                href={mod.href}
                className="group bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg hover:border-slate-300 transition-all duration-200 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-xl shadow-md`}>
                    {mod.icon}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${mod.badgeColor}`}>
                    {mod.badge}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors">{mod.label}</h3>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{mod.desc}</p>
                </div>
                <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2">{mod.stats}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* ---- RECENT ACTIVITY + QUICK ACTIONS ---- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent feed items */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                📡 Recent Feed Activity
              </h2>
              <button
                onClick={fetchFeedData}
                disabled={fetchingFeeds}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 disabled:opacity-40"
              >
                {fetchingFeeds ? '⏳ Refreshing…' : '🔄 Refresh'}
              </button>
            </div>

            {fetchingFeeds && recentItems.length === 0 ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse flex gap-3 items-center">
                    <div className="h-3 bg-slate-100 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/5 ml-auto" />
                  </div>
                ))}
              </div>
            ) : recentItems.length > 0 ? (
              <ul className="divide-y divide-slate-50">
                {recentItems.map((item, i) => (
                  <li key={i} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                    <a href={item.link} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-2 group">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {item.title || 'Untitled item'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.feedName}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap mt-0.5 shrink-0">{formatAgo(item.pubDate)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-400">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm font-medium">No recent feed items</p>
                <p className="text-xs mt-1">Add RSS feeds in Sources to see activity here</p>
              </div>
            )}

            {recentItems.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 text-center">
                <Link href="/preferences" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                  Manage all feeds in Sources →
                </Link>
              </div>
            )}
          </div>

          {/* Quick Actions sidebar */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-800">⚡ Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { href: '/grants', label: '🔍 Find PhD Scholarships', color: 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200' },
                { href: '/jobs', label: '💼 Search AI Jobs', color: 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200' },
                { href: '/grants', label: '✉️ Compose Cold Email', color: 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200' },
                { href: '/grants', label: '📝 Write Grant Proposal', color: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' },
                { href: '/international', label: '🇪🇺 Browse Global Portals', color: 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' },
                { href: '/linkedin', label: '🌐 LinkedIn Crawler', color: 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200' },
                { href: '/jobs', label: '📄 Upload Resume', color: 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200' },
                { href: '/preferences', label: '⚙️ Manage Sources', color: 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' },
              ].map(action => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`block w-full text-left text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${action.color}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ---- SOURCES SECTION ---- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              🔗 Sources
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">
                {websiteLinks.length} link{websiteLinks.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <Link href="/preferences" className="text-xs font-semibold text-blue-600 hover:text-blue-800">
              Full settings →
            </Link>
          </div>

          <div className="p-5 space-y-4">
            {/* Add link */}
            <form onSubmit={handleAddLink} className="flex gap-2">
              <input
                type="url"
                value={newLinkUrl}
                onChange={e => setNewLinkUrl(e.target.value)}
                placeholder="https://jobs.example.com or scholarship site URL…"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                required
              />
              <button
                type="submit"
                disabled={addingLink || !newLinkUrl.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition disabled:opacity-50 whitespace-nowrap"
              >
                {addingLink ? '…' : '+ Add Link'}
              </button>
            </form>

            {addLinkMsg && (
              <p className={`text-xs font-medium ${addLinkMsg.startsWith('✅') ? 'text-green-700' : 'text-red-600'}`}>
                {addLinkMsg}
              </p>
            )}

            {linksError && (
              <p className="text-xs font-medium text-red-600">⚠️ {linksError}</p>
            )}

            {/* Link grid */}
            {linksLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse h-8 bg-slate-100 rounded-lg" />
                ))}
              </div>
            ) : websiteLinks.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {websiteLinks.map((link) => (
                  <div
                    key={link._id}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg group hover:border-blue-300 transition-colors"
                  >
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-slate-700 hover:text-blue-700 font-medium truncate flex-1 min-w-0"
                      title={link.url}
                    >
                      🌐 {(link.name || link.url.replace(/^https?:\/\//, '')).substring(0, 45)}
                    </a>
                    <button
                      onClick={() => handleDeleteLink(link._id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 text-xs shrink-0"
                      title="Remove source"
                    >✕</button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                <div className="text-2xl mb-1">🔗</div>
                <p className="text-xs font-medium">No sources added yet</p>
                <p className="text-xs mt-0.5 text-slate-300">Add a URL above to track job or scholarship sites</p>
              </div>
            )}
          </div>
        </div>

        {/* ---- CANDIDATE PROFILE FOOTER ---- */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Candidate</div>
            <h3 className="text-base font-bold">{userProfile.name}</h3>
            <p className="text-slate-300 text-xs mt-0.5">{userProfile.title}</p>
            <p className="text-slate-400 text-xs mt-0.5">{userProfile.focus}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link
              href="/jobs"
              className="text-xs font-bold px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition text-center"
            >
              📄 Resume Intelligence
            </Link>
            <Link
              href="/grants"
              className="text-xs font-bold px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-lg transition text-center"
            >
              🔬 Find Scholarships
            </Link>
          </div>
        </div>

      </div>
    </Layout>
  );
}