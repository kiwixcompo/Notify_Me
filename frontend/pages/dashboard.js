import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';
import JobCard from '../components/JobCard';
import ScholarshipCard from '../components/ScholarshipCard';
import { BriefcaseIcon, FunnelIcon, ClockIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

// Note: Capacitor modules removed for web compatibility

export default function Dashboard() {
  const router = useRouter();
  const { type } = router.query; // 'job' or 'scholarship'
  const [contentType, setContentType] = useState('job'); // Default to jobs
  const [isClient, setIsClient] = useState(false);
  
  const [jobs, setJobs] = useState([]);
  const [scholarships, setScholarships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterByPreferences, setFilterByPreferences] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [calendarData, setCalendarData] = useState({});
  const [showLast24h, setShowLast24h] = useState(false);

  // Raw Feed Viewer State
  const [rawFeedResults, setRawFeedResults] = useState([]);
  const [rawFeedLoading, setRawFeedLoading] = useState(false);
  const [rawFeedError, setRawFeedError] = useState(null);
  const [rawFeedKeyword, setRawFeedKeyword] = useState('');
  const [rawFeedDate, setRawFeedDate] = useState('');

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState('');

  // Collapsible feed state
  const [expandedFeed, setExpandedFeed] = useState(null);

  // Loading bar state
  // True progress state
  const [progress, setProgress] = useState(0);
  const [feedsList, setFeedsList] = useState([]);

  // Set client flag and notification permission
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Update content type when router query changes
  useEffect(() => {
    if (isClient) {
      if (type) {
        setContentType(type);
        localStorage.setItem('userPreference', type);
      } else {
        // Check localStorage for saved preference
        const savedPreference = localStorage.getItem('userPreference');
        if (savedPreference) {
          setContentType(savedPreference);
        }
      }
    }
  }, [type, isClient]);

  // Fetch feeds list and then fetch each feed one by one for true progress
  const fetchAllFeedsWithProgress = async () => {
    setRawFeedLoading(true);
    setRawFeedError(null);
    setProgress(0);
    try {
      const token = localStorage.getItem('token');
      // 1. Get feeds list
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.get(`${apiUrl}/api/user/rss-feeds?type=${contentType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const feeds = res.data.feeds || [];
      setFeedsList(feeds);
      const results = [];
      for (let i = 0; i < feeds.length; i++) {
        const feed = feeds[i];
        try {
          const endpoint = contentType === 'job' ? 'rss-feeds' : 'scholarships';
          const res = await axios.get(`${apiUrl}/api/user/${endpoint}/${feed._id}/raw`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          results.push(res.data);
        } catch (err) {
          results.push({ feed: { url: feed.url, name: feed.name }, items: [], error: err.response?.data?.error || err.message });
        }
        setProgress(Math.round(((i + 1) / feeds.length) * 100));
      }
      setRawFeedResults(results);
    } catch (err) {
      setRawFeedError(err.response?.data?.error || err.message);
    } finally {
      setRawFeedLoading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  // Auto-refresh interval in milliseconds (default: 5 minutes)
  const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

  useEffect(() => {
    if (!isClient) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    
    if (contentType === 'job') {
      fetchJobs(token);
    } else {
      fetchScholarships(token);
    }
    fetchCalendarData(token);
    // Fetch all jobs on initial load using new progress-aware method
    fetchAllFeedsWithProgress();
    // eslint-disable-next-line
  }, [router, selectedDate, showLast24h, contentType, isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    const interval = setInterval(() => {
      fetchAllFeedsWithProgress();
      setShowAutoRefreshMsg(true);
      setTimeout(() => setShowAutoRefreshMsg(false), 2000);
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [contentType, isClient]);

  const [showAutoRefreshMsg, setShowAutoRefreshMsg] = useState(false);
  const [notifPermission, setNotifPermission] = useState('default');

  const handleEnableNotifications = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission().then(permission => {
        setNotifPermission(permission);
      });
    }
  };

  const fetchJobs = async (token) => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      let url = `${apiUrl}/api/jobs?`;
      if (showLast24h) {
        url += 'last24h=true';
      } else {
        url += `date=${selectedDate}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(res.data.jobs || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchScholarships = async (token) => {
    try {
      setLoading(true);
      setError('');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      let url = `${apiUrl}/api/scholarships?`;
      if (showLast24h) {
        url += 'last24h=true';
      } else {
        url += `date=${selectedDate}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setScholarships(res.data.scholarships || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load scholarships');
      setScholarships([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async (token) => {
    try {
      const endpoint = contentType === 'job' ? 'jobs' : 'scholarships';
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const res = await axios.get(
        `${apiUrl}/api/${endpoint}/calendar?month=${currentMonth}&year=${currentYear}&filterByPreferences=${filterByPreferences}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setCalendarData(res.data.calendarData || []);
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const formatDisplayDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1).getDay();
  };

  const formatDateForAPI = (day) => {
    const date = new Date(currentYear, currentMonth - 1, day);
    return date.toISOString().split('T')[0];
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentMonth === today.getMonth() + 1 && 
           currentYear === today.getFullYear();
  };

  const isSelected = (day) => {
    const selected = new Date(selectedDate);
    return day === selected.getDate() && 
           currentMonth === selected.getMonth() + 1 && 
           currentYear === selected.getFullYear();
  };

  const handleDateClick = (day) => {
    const dateString = formatDateForAPI(day);
    setSelectedDate(dateString);
    setShowCalendar(false);
  };

  const changeMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = formatDateForAPI(day);
      const itemCount = calendarData[dateString] || 0;
      const hasItems = itemCount > 0;

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            p-2 text-center cursor-pointer border border-gray-200 hover:bg-blue-50 transition-colors
            ${isToday(day) ? 'bg-blue-100 font-bold' : ''}
            ${isSelected(day) ? 'bg-blue-200 border-blue-400' : ''}
            ${hasItems ? 'bg-green-50' : ''}
          `}
        >
          <div className="text-sm">{day}</div>
          {hasItems && (
            <div className="text-xs text-green-600 font-bold">
              {itemCount} {contentType === 'job' ? 'job' : 'scholarship'}{itemCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Extract unique categories from all items in all feeds
  const allCategories = useMemo(() => {
    const cats = new Set();
    rawFeedResults.forEach(feed => {
      (feed.items || []).forEach(item => {
        if (item.categories && Array.isArray(item.categories)) {
          item.categories.forEach(cat => cats.add(cat));
        }
      });
    });
    return Array.from(cats).sort();
  }, [rawFeedResults]);

  // Filter items by selected category
  const filteredFeedResults = useMemo(() => {
    if (!selectedCategory) return rawFeedResults;
    return rawFeedResults.map(feed => ({
      ...feed,
      items: (feed.items || []).filter(item =>
        item.categories && item.categories.includes(selectedCategory)
      )
    }));
  }, [rawFeedResults, selectedCategory]);

  // Calculate total items fetched across all feeds for the raw feed viewer
  const totalRawItems = useMemo(() => rawFeedResults.reduce((sum, feed) => sum + (feed.items ? feed.items.length : 0), 0), [rawFeedResults]);

  // Show items from last 3 days by default
  const [showOlderItems, setShowOlderItems] = useState(false);

  // Filter items by date (last 3 days or all)
  const filteredByDateFeedResults = useMemo(() => {
    if (showOlderItems) return filteredFeedResults;
    const now = new Date();
    const threeDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0); // 3 days ago at midnight
    return filteredFeedResults.map(feed => ({
      ...feed,
      items: (feed.items || []).filter(item => {
        if (!item.pubDate) return false;
        const itemDate = new Date(item.pubDate);
        return itemDate >= threeDaysAgo && itemDate <= now;
      })
    }));
  }, [filteredFeedResults, showOlderItems]);

  // Filter items by keyword (title, description, or content)
  const filteredByKeywordFeedResults = useMemo(() => {
    if (!rawFeedKeyword.trim()) return filteredByDateFeedResults;
    // Split by spaces, ignore empty, lowercase
    const keywords = rawFeedKeyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return filteredByDateFeedResults.map(feed => ({
      ...feed,
      items: (feed.items || []).filter(item => {
        const fields = [item.title, item.description, item.content, item.contentSnippet];
        // All keywords must match in any field
        return keywords.every(kw => fields.some(field => field && field.toLowerCase().includes(kw)));
      })
    }));
  }, [filteredByDateFeedResults, rawFeedKeyword]);

  // Helper to highlight keywords in a string
  function highlightKeywords(text) {
    if (!rawFeedKeyword.trim() || !text) return text;
    const keywords = rawFeedKeyword.trim().split(/\s+/).filter(Boolean);
    let result = text;
    keywords.forEach(kw => {
      if (!kw) return;
      // Escape regex special chars
      const safeKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${safeKw})`, 'gi');
      result = result.replace(regex, '<mark>$1</mark>');
    });
    return result;
  }

  // Add this helper to trigger a notification
  async function triggerNotification(item, feedName) {
    const title = `New ${contentType}: ${item.title}`;
    const body = `From: ${feedName}`;
    const url = item.link || item.guid || '';
    
    // Use browser notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, {
          body,
          data: { url },
        });
        n.onclick = () => {
          if (url) window.open(url, '_blank');
        };
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }

  // After items are fetched, check for keyword matches and notify
  useEffect(() => {
    if (!isClient || !rawFeedResults || !rawFeedResults.length) return;
    // Get keywords from localStorage
    const alertKeywords = (localStorage.getItem('alertKeywords') || '').split(/,|\n/).map(k => k.trim().toLowerCase()).filter(Boolean);
    if (!alertKeywords.length) return;
    // Track notified item IDs in localStorage
    const notifiedIds = new Set(JSON.parse(localStorage.getItem('notifiedItemIds') || '[]'));
    let newNotifiedIds = Array.from(notifiedIds);
    rawFeedResults.forEach(feed => {
      const feedName = feed.feed?.name || feed.feed?.url || 'Unknown Feed';
      (feed.items || []).forEach(item => {
        const itemId = item.guid || item.link || item.title;
        if (!itemId || notifiedIds.has(itemId)) return;
        // Expanded: check title, description, content, contentSnippet
        const fields = [item.title, item.description, item.content, item.contentSnippet].map(f => (f || '').toLowerCase());
        if (alertKeywords.some(kw => fields.some(field => field.includes(kw)))) {
          triggerNotification(item, feedName);
          newNotifiedIds.push(itemId);
        }
      });
    });
    if (newNotifiedIds.length > notifiedIds.size) {
      localStorage.setItem('notifiedItemIds', JSON.stringify(newNotifiedIds));
    }
  }, [rawFeedResults, contentType, isClient]);

  // Request notification permission on mount
  useEffect(() => {
    if (!isClient) return;
    
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission !== 'granted') {
            alert(`Enable notifications to get ${contentType} alerts on your device!`);
          }
        });
      }
    }
  }, [contentType, isClient]);

  // Handle browser notification clicks
  useEffect(() => {
    if (!isClient) return;
    
    // Browser notifications click handler
    if (typeof window !== 'undefined' && 'Notification' in window) {
      // Note: Browser notification clicks are handled in the triggerNotification function
    }
  }, [isClient]);

  // Browser notification permissions
  useEffect(() => {
    if (!isClient) return;
    
    // Request notification permission for browser notifications
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [isClient]);



  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-4 px-2 sm:py-8 sm:px-4 overflow-x-hidden">
        {/* Enable Notifications Button */}
        {notifPermission === 'default' && (
          <div className="mb-4 flex justify-center">
            <button
              className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition font-semibold"
              onClick={handleEnableNotifications}
            >
              Enable Notifications
            </button>
          </div>
        )}
        {notifPermission === 'granted' && (
          <div className="mb-4 text-green-700 text-center font-semibold">Notifications enabled!</div>
        )}
        {notifPermission === 'denied' && (
          <div className="mb-4 text-red-600 text-center font-semibold">Notifications are blocked. Please enable them in your browser settings.</div>
        )}
        
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {contentType === 'job' ? (
              <BriefcaseIcon className="w-8 h-8 text-blue-600" />
            ) : (
              <AcademicCapIcon className="w-8 h-8 text-green-600" />
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 sm:mb-2">
                {contentType === 'job' ? 'Remote Jobs' : 'Scholarships'} Dashboard
              </h1>
              <div className="text-gray-600 text-base sm:text-lg">
                {totalRawItems} {contentType === 'job' ? 'job' : 'scholarship'}{totalRawItems === 1 ? '' : 's'} fetched across all feeds
              </div>
            </div>
          </div>
          
          {/* Content Type Selector */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition ${
                contentType === 'job'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => {
                if (contentType !== 'job') {
                  setLoading(true);
                  setJobs([]);
                  setScholarships([]);
                  setContentType('job');
                  localStorage.setItem('userPreference', 'job');
                }
              }}
            >
              <BriefcaseIcon className="w-5 h-5 mr-2" />
              Jobs
            </button>
            <button
              className={`flex items-center justify-center px-4 py-2 rounded-md font-medium transition ${
                contentType === 'scholarship'
                  ? 'bg-white text-green-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => {
                if (contentType !== 'scholarship') {
                  setLoading(true);
                  setJobs([]);
                  setScholarships([]);
                  setContentType('scholarship');
                  localStorage.setItem('userPreference', 'scholarship');
                }
              }}
            >
              <AcademicCapIcon className="w-5 h-5 mr-2" />
              Scholarships
            </button>
          </div>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm sm:text-base">{error}</p>
          </div>
        )}
        
        {/* Loading State */}
        {rawFeedLoading && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-16 animate-pulse">
            <div className="text-xl sm:text-2xl font-bold text-blue-600 mb-1 sm:mb-2">
              Fetching the freshest {contentType === 'job' ? 'remote jobs' : 'scholarships'} for you...
            </div>
            <div className="text-base sm:text-lg text-blue-400 italic mb-2 sm:mb-4">
              Hang tight, your dream {contentType === 'job' ? 'job' : 'opportunity'} might be in this batch! 🚀
            </div>
            <div className="w-full max-w-xs sm:max-w-md h-3 sm:h-4 bg-blue-100 rounded-full overflow-hidden shadow mb-1 sm:mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-xs sm:text-sm text-blue-700 font-semibold">{progress}%</div>
          </div>
        )}
        
        {showAutoRefreshMsg && (
          <div className="fixed top-2 right-2 sm:top-4 sm:right-4 bg-blue-600 text-white px-3 sm:px-4 py-1 sm:py-2 rounded shadow-lg z-50 transition text-xs sm:text-base">
            {contentType === 'job' ? 'Jobs' : 'Scholarships'} auto-refreshed!
          </div>
        )}
        
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading {contentType === 'job' ? 'jobs' : 'scholarships'}...</p>
          </div>
        )}

        {/* Items Grid - Jobs */}
        {!loading && contentType === 'job' && jobs.length > 0 && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job, index) => (
              <JobCard
                key={job.wwrJobId || job._id || job.guid || job.link || `job-${index}`}
                job={job}
                showFeed={true}
              />
            ))}
          </div>
        )}
        
        {/* Empty State - Jobs */}
        {!loading && contentType === 'job' && jobs.length === 0 && (
          <div className="text-center py-12">
            <BriefcaseIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-500 mb-4">
              We couldn't find any jobs from your feeds for today. Try checking your preferences or adding more feeds.
            </p>
          </div>
        )}
        
        {/* Items Grid - Scholarships */}
        {!loading && contentType === 'scholarship' && scholarships.length > 0 && (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {scholarships.map((scholarship, index) => (
              <ScholarshipCard
                key={scholarship._id || scholarship.guid || scholarship.link || `scholarship-${index}`}
                scholarship={scholarship}
                showFeed={true}
              />
            ))}
          </div>
        )}
        
        {/* Empty State - Scholarships */}
        {!loading && contentType === 'scholarship' && scholarships.length === 0 && (
          <div className="text-center py-12">
            <AcademicCapIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No scholarships found</h3>
            <p className="text-gray-500 mb-4">
              We couldn't find any scholarships from your feeds for today. Try checking your preferences or adding more feeds.
            </p>
          </div>
        )}
        
        {/* Toggle for viewing older items */}
        <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
          <button
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold shadow transition text-sm sm:text-base ${!showOlderItems ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setShowOlderItems(false)}
          >
            Recent {contentType === 'job' ? 'Jobs' : 'Scholarships'} (Last 3 Days)
          </button>
          <button
            className={`w-full sm:w-auto px-4 py-2 rounded-lg font-semibold shadow transition text-sm sm:text-base ${showOlderItems ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setShowOlderItems(true)}
          >
            View Older {contentType === 'job' ? 'Jobs' : 'Scholarships'}
          </button>
        </div>
        
        {/* --- Raw Feed Viewer Section --- */}
        <div className="mt-8 sm:mt-16">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-2 sm:mb-4">
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={rawFeedKeyword}
              onChange={e => {
                setRawFeedKeyword(e.target.value);
                if (e.target.value === '') fetchAllFeedsWithProgress();
              }}
              className="border px-3 py-2 rounded-lg w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm sm:text-base"
            />
            <input
              type="date"
              value={rawFeedDate}
              onChange={e => {
                setRawFeedDate(e.target.value);
                fetchAllFeedsWithProgress();
              }}
              className="border px-3 py-2 rounded-lg w-full sm:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition text-sm sm:text-base"
            />
            <button
              onClick={() => fetchAllFeedsWithProgress()}
              className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-4 sm:px-6 py-2 rounded-lg shadow hover:from-blue-700 hover:to-blue-500 transition font-semibold text-sm sm:text-base"
              disabled={rawFeedLoading}
            >
              {rawFeedLoading ? 'Loading...' : 'Fetch Feeds'}
            </button>
          </div>
          
          {rawFeedError && <div className="text-red-600 mb-2 font-semibold text-sm sm:text-base">{rawFeedError}</div>}
          
          <div className="space-y-6 sm:space-y-8">
            {filteredByKeywordFeedResults.map(feedResult => (
              <div key={feedResult.feed.url} className="bg-white rounded-xl shadow-lg overflow-x-auto">
                <button
                  className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-3 sm:py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-t-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition gap-2 sm:gap-0"
                  onClick={() => setExpandedFeed(expandedFeed === feedResult.feed.url ? null : feedResult.feed.url)}
                >
                  <span className="text-lg sm:text-xl font-semibold text-blue-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                    {feedResult.feed.name || feedResult.feed.url}
                  </span>
                  <span className="text-sm text-gray-500 mt-1 sm:mt-0">
                    {feedResult.items.length} {contentType === 'job' ? 'job' : 'scholarship'}{feedResult.items.length === 1 ? '' : 's'}
                  </span>
                  <svg className={`w-5 h-5 ml-0 sm:ml-2 transform transition-transform ${expandedFeed === feedResult.feed.url ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                
                {expandedFeed === feedResult.feed.url && (
                  <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-1 sm:pt-2">
                    {feedResult.error ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 font-medium shadow-sm text-sm sm:text-base">
                        {feedResult.error}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {feedResult.items.map((item, idx) => (
                          <div
                            key={item.guid || item.link || idx}
                            className="bg-white border border-gray-200 rounded-xl shadow-md p-3 sm:p-5 hover:shadow-xl hover:border-blue-400 transition cursor-pointer flex flex-col justify-between min-h-[180px]"
                            onClick={() => window.open(item.link, '_blank')}
                          >
                            <div>
                              <div className="font-bold text-base sm:text-lg mb-1 text-gray-900 line-clamp-2" dangerouslySetInnerHTML={{ __html: highlightKeywords(item.title) }} />
                              <div className="text-xs text-gray-500 mb-2">{item.pubDate && new Date(item.pubDate).toLocaleString()}</div>
                              {/* Render HTML if present, else fallback to snippet/description, with highlighting */}
                              {item.content && /<\/?[a-z][\s\S]*>/i.test(item.content) ? (
                                <div className="text-gray-700 mb-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: highlightKeywords(item.content) }} />
                              ) : item.description && /<\/?[a-z][\s\S]*>/i.test(item.description) ? (
                                <div className="text-gray-700 mb-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: highlightKeywords(item.description) }} />
                              ) : (
                                <div className="text-gray-700 mb-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: highlightKeywords(item.contentSnippet || item.description || '') }} />
                              )}
                            </div>
                            <div className="mt-2 text-blue-600 font-semibold text-xs sm:text-sm underline self-end">
                              View {contentType === 'job' ? 'Job' : 'Scholarship'}
                            </div>
                          </div>
                        ))}
                        {feedResult.items.length === 0 && (
                          <div className="text-gray-400 italic text-xs sm:text-base">
                            No {contentType === 'job' ? 'jobs' : 'scholarships'} found for this feed.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* --- End Raw Feed Viewer Section --- */}
      </div>
    </Layout>
  );
} 