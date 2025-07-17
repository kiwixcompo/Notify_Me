import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';
import Layout from '../components/Layout';
import JobCard from '../components/JobCard';
import { BriefcaseIcon, FunnelIcon, ClockIcon, CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
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

  // Fetch feeds list and then fetch each feed one by one for true progress
  const fetchAllFeedsWithProgress = async () => {
    setRawFeedLoading(true);
    setRawFeedError(null);
    setProgress(0);
    try {
      const token = localStorage.getItem('token');
      // 1. Get feeds list
      const feedsRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const feeds = feedsRes.data.feeds || [];
      setFeedsList(feeds);
      const results = [];
      for (let i = 0; i < feeds.length; i++) {
        const feed = feeds[i];
        try {
          const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user/rss-feeds/${feed._id}/raw`, {
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }
    
    fetchJobs(token);
    fetchCalendarData(token);
    // Fetch all jobs on initial load using new progress-aware method
    fetchAllFeedsWithProgress();
    // eslint-disable-next-line
  }, [router, selectedDate, showLast24h]);

  const fetchJobs = async (token) => {
    try {
      setLoading(true);
      setError('');
      let url = `${process.env.NEXT_PUBLIC_API_URL}/api/jobs?`;
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

  const fetchCalendarData = async (token) => {
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/jobs/calendar?month=${currentMonth}&year=${currentYear}&filterByPreferences=${filterByPreferences}`,
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
      const jobCount = calendarData[dateString] || 0;
      const hasJobs = jobCount > 0;

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`
            p-2 text-center cursor-pointer border border-gray-200 hover:bg-blue-50 transition-colors
            ${isToday(day) ? 'bg-blue-100 font-bold' : ''}
            ${isSelected(day) ? 'bg-blue-200 border-blue-400' : ''}
            ${hasJobs ? 'bg-green-50' : ''}
          `}
        >
          <div className="text-sm">{day}</div>
          {hasJobs && (
            <div className="text-xs text-green-600 font-bold">
              {jobCount} job{jobCount !== 1 ? 's' : ''}
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

  // Extract unique categories from all jobs in all feeds
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

  // Filter jobs by selected category
  const filteredFeedResults = useMemo(() => {
    if (!selectedCategory) return rawFeedResults;
    return rawFeedResults.map(feed => ({
      ...feed,
      items: (feed.items || []).filter(item =>
        item.categories && item.categories.includes(selectedCategory)
      )
    }));
  }, [rawFeedResults, selectedCategory]);

  // Calculate total jobs fetched across all feeds for the raw feed viewer
  const totalRawJobs = useMemo(() => rawFeedResults.reduce((sum, feed) => sum + (feed.items ? feed.items.length : 0), 0), [rawFeedResults]);

  // Show jobs from last 3 days by default
  const [showOlderJobs, setShowOlderJobs] = useState(false);

  // Filter jobs by date (last 3 days or all)
  const filteredByDateFeedResults = useMemo(() => {
    if (showOlderJobs) return filteredFeedResults;
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
  }, [filteredFeedResults, showOlderJobs]);

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Remote Jobs Dashboard</h1>
            <div className="text-gray-600 text-lg">
              {totalRawJobs} job{totalRawJobs === 1 ? '' : 's'} fetched across all feeds
            </div>
          </div>
          {/* Remove calendar and related controls */}
          {/* Calendar and calendar controls have been removed as requested */}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {rawFeedLoading && (
          <div className="flex flex-col items-center justify-center py-16 animate-pulse">
            <div className="text-2xl font-bold text-blue-600 mb-2">Fetching the freshest remote jobs for you...</div>
            <div className="text-lg text-blue-400 italic mb-4">Hang tight, your dream job might be in this batch! 🚀</div>
            <div className="w-full max-w-md h-4 bg-blue-100 rounded-full overflow-hidden shadow mb-2">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-200"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="text-sm text-blue-700 font-semibold">{progress}%</div>
          </div>
        )}

        {/* Jobs Grid */}
        {!loading && jobs.length === 0 && (
          <>
            {/* --- Category Filter Dropdown --- */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:space-x-4">
              <label className="font-semibold text-gray-700 mb-2 md:mb-0">Filter by Category:</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800"
              >
                <option value="">All Categories</option>
                {allCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            {/* --- End Category Filter Dropdown --- */}
          </>
        )}

        {/* Jobs List */}
        {!loading && jobs.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map(job => (
              <JobCard
                key={job.wwrJobId || job._id}
                job={job}
                showFeed={true}
              />
            ))}
          </div>
        )}

        {/* Toggle for viewing older jobs */}
        <div className="mb-6 flex items-center gap-4">
          <button
            className={`px-4 py-2 rounded-lg font-semibold shadow transition ${!showOlderJobs ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setShowOlderJobs(false)}
          >
            Recent Jobs (Last 3 Days)
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold shadow transition ${showOlderJobs ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setShowOlderJobs(true)}
          >
            View Older Jobs
          </button>
        </div>
        {/* --- End Toggle --- */}
        {/* --- Raw Feed Viewer Section --- */}
        <div className="mt-16">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <input
              type="text"
              placeholder="Filter by keyword..."
              value={rawFeedKeyword}
              onChange={e => {
                setRawFeedKeyword(e.target.value);
                if (e.target.value === '') fetchAllFeedsWithProgress();
              }}
              className="border px-3 py-2 rounded-lg w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
            <input
              type="date"
              value={rawFeedDate}
              onChange={e => {
                setRawFeedDate(e.target.value);
                fetchAllFeedsWithProgress();
              }}
              className="border px-3 py-2 rounded-lg w-full md:w-1/3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
            <button
              onClick={() => fetchAllFeedsWithProgress()}
              className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-6 py-2 rounded-lg shadow hover:from-blue-700 hover:to-blue-500 transition font-semibold"
              disabled={rawFeedLoading}
            >
              {rawFeedLoading ? 'Loading...' : 'Fetch Feeds'}
            </button>
          </div>
          {rawFeedError && <div className="text-red-600 mb-2 font-semibold">{rawFeedError}</div>}
          <div className="space-y-8">
            {filteredByDateFeedResults.map(feedResult => (
              <div key={feedResult.feed.url} className="bg-white rounded-xl shadow-lg">
                <button
                  className="w-full flex justify-between items-center px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-t-xl bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 transition"
                  onClick={() => setExpandedFeed(expandedFeed === feedResult.feed.url ? null : feedResult.feed.url)}
                >
                  <span className="text-xl font-semibold text-blue-700 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-400"></span>
                    {feedResult.feed.name || feedResult.feed.url}
                  </span>
                  <span className="text-sm text-gray-500">{feedResult.items.length} job{feedResult.items.length === 1 ? '' : 's'}</span>
                  <svg className={`w-5 h-5 ml-2 transform transition-transform ${expandedFeed === feedResult.feed.url ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {expandedFeed === feedResult.feed.url && (
                  <div className="px-6 pb-6 pt-2">
                    {feedResult.error ? (
                      <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 font-medium shadow-sm">
                        {feedResult.error}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {feedResult.items.map((item, idx) => (
                          <div
                            key={item.guid || item.link || idx}
                            className="bg-white border border-gray-200 rounded-xl shadow-md p-5 hover:shadow-xl hover:border-blue-400 transition cursor-pointer flex flex-col justify-between min-h-[180px]"
                            onClick={() => window.open(item.link, '_blank')}
                          >
                            <div>
                              <div className="font-bold text-lg mb-1 text-gray-900 line-clamp-2">{item.title}</div>
                              <div className="text-xs text-gray-500 mb-2">{item.pubDate && new Date(item.pubDate).toLocaleString()}</div>
                              {/* Render HTML if present, else fallback to snippet/description */}
                              {item.content && /<\/?[a-z][\s\S]*>/i.test(item.content) ? (
                                <div className="text-gray-700 mb-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: item.content }} />
                              ) : item.description && /<\/?[a-z][\s\S]*>/i.test(item.description) ? (
                                <div className="text-gray-700 mb-2 line-clamp-3" dangerouslySetInnerHTML={{ __html: item.description }} />
                              ) : (
                                <div className="text-gray-700 mb-2 line-clamp-3">{item.contentSnippet || item.description || ''}</div>
                              )}
                            </div>
                            <div className="mt-2 text-blue-600 font-semibold text-sm underline self-end">View Job</div>
                          </div>
                        ))}
                        {feedResult.items.length === 0 && <div className="text-gray-400 italic">No jobs found for this feed.</div>}
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