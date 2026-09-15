import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LinkedInCrawler() {
  const [activePlatform, setActivePlatform] = useState('linkedin'); // 'linkedin', 'x', 'facebook'
  const [activeTab, setActiveTab] = useState('jobs'); // 'jobs', 'posts'
  
  // Phase 1: Jobs
  const [keywords, setKeywords] = useState('Full Stack Developer');
  const [location, setLocation] = useState('Worldwide');
  const [isRemote, setIsRemote] = useState(true);
  const [timeFilter, setTimeFilter] = useState('r604800'); // r86400 (24h), r604800 (week)
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobDetailsLoading, setJobDetailsLoading] = useState(false);

  // Phase 2: Feed Posts
  const [postQuery, setPostQuery] = useState('Computer Science');
  const [postType, setPostType] = useState('all'); // 'all', 'scholarship', 'job'
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  // X (Twitter) State
  const [xQuery, setXQuery] = useState('Computer Science');
  const [xType, setXType] = useState('all');
  const [xPosts, setXPosts] = useState([]);
  const [xLoading, setXLoading] = useState(false);
  const [xAuthToken, setXAuthToken] = useState('');
  const [xCt0, setXCt0] = useState('');
  const [showXCookieSettings, setShowXCookieSettings] = useState(false);

  // Facebook State
  const [fbQuery, setFbQuery] = useState('Computer Science');
  const [fbType, setFbType] = useState('all');
  const [fbGroupUrl, setFbGroupUrl] = useState('');
  const [fbPosts, setFbPosts] = useState([]);
  const [fbLoading, setFbLoading] = useState(false);

  // Common UI State
  const [error, setError] = useState('');
  const [savedSuccessMap, setSavedSuccessMap] = useState({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('token')) {
        window.location.href = '/login';
        return;
      }
    }
    fetchJobs();
    const savedXAuth = localStorage.getItem('x_auth_token');
    const savedXCt0 = localStorage.getItem('x_ct0');
    if (savedXAuth) setXAuthToken(savedXAuth);
    if (savedXCt0) setXCt0(savedXCt0);
  }, []);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchJobs = async () => {
    setJobsLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/linkedin/jobs`, {
        params: {
          keywords,
          location,
          isRemote,
          timeFilter
        },
        headers: getHeaders()
      });
      setJobs(res.data?.jobs || []);
    } catch (err) {
      console.error('LinkedIn jobs fetch error:', err);
      setError(err.response?.data?.error || 'Failed to crawl LinkedIn Jobs.');
    } finally {
      setJobsLoading(false);
    }
  };

  const fetchDetails = async (job) => {
    setSelectedJob(job);
    setJobDetailsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/linkedin/job/${job.jobId}`, {
        headers: getHeaders()
      });
      setSelectedJob(prev => ({
        ...prev,
        details: res.data?.details
      }));
    } catch (err) {
      console.warn('Could not load detailed description:', err);
    } finally {
      setJobDetailsLoading(false);
    }
  };

  const fetchFeedPosts = async () => {
    setPostsLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/linkedin/posts`, {
        params: {
          query: postQuery,
          type: postType,
          maxResults: 20
        },
        headers: getHeaders()
      });
      setPosts(res.data?.posts || []);
    } catch (err) {
      console.error('LinkedIn feed posts fetch error:', err);
      setError(err.response?.data?.error || 'Failed to crawl LinkedIn feed posts.');
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchXPosts = async () => {
    setXLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/linkedin/x-posts`, {
        params: {
          query: xQuery,
          type: xType,
          maxResults: 15,
          authToken: xAuthToken || undefined,
          ct0: xCt0 || undefined
        },
        headers: getHeaders()
      });
      setXPosts(res.data?.posts || []);
    } catch (err) {
      console.error('X fetch error:', err);
      setError(err.response?.data?.error || 'Failed to crawl X opportunities.');
    } finally {
      setXLoading(false);
    }
  };

  const fetchFbPosts = async () => {
    setFbLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/linkedin/fb-posts`, {
        params: {
          query: fbQuery,
          type: fbType,
          targetGroupUrl: fbGroupUrl || undefined,
          maxResults: 15
        },
        headers: getHeaders()
      });
      setFbPosts(res.data?.posts || []);
    } catch (err) {
      console.error('Facebook fetch error:', err);
      setError(err.response?.data?.error || 'Failed to crawl Facebook opportunities.');
    } finally {
      setFbLoading(false);
    }
  };

  const saveOpportunity = async (item, type, identifier) => {
    try {
      await axios.post(`${API_BASE}/api/linkedin/save-opportunity`, {
        type,
        item
      }, { headers: getHeaders() });

      setSavedSuccessMap(prev => ({ ...prev, [identifier]: true }));
      setTimeout(() => {
        setSavedSuccessMap(prev => ({ ...prev, [identifier]: false }));
      }, 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save opportunity');
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Multi-Platform Intelligence Engine
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Zero Account Ban Architecture
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Social Media Opportunity Crawler
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-300 max-w-2xl">
                Crawl remote tech jobs and funded supervisor scholarships across <strong>LinkedIn</strong>, <strong>X (Twitter)</strong>, and <strong>Facebook</strong> using lightweight guest endpoints and GraphQL network extraction.
              </p>
            </div>
          </div>

          {/* Platform Switcher */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              onClick={() => {
                setActivePlatform('linkedin');
                setActiveTab('jobs');
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activePlatform === 'linkedin'
                  ? 'bg-blue-600 text-white shadow-lg font-bold ring-2 ring-blue-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>🌐</span> LinkedIn
            </button>
            <button
              onClick={() => {
                setActivePlatform('x');
                if (xPosts.length === 0) fetchXPosts();
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activePlatform === 'x'
                  ? 'bg-sky-600 text-white shadow-lg font-bold ring-2 ring-sky-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>✖️</span> X (Twitter)
            </button>
            <button
              onClick={() => {
                setActivePlatform('facebook');
                if (fbPosts.length === 0) fetchFbPosts();
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activePlatform === 'facebook'
                  ? 'bg-indigo-600 text-white shadow-lg font-bold ring-2 ring-indigo-400'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>📘</span> Facebook Groups
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 text-xs font-bold">Dismiss</button>
          </div>
        )}

        {/* ======================================================== */}
        {/* PLATFORM 1: LINKEDIN CRAWLER                             */}
        {/* ======================================================== */}
        {activePlatform === 'linkedin' && (
          <div className="space-y-6">
            {/* Engine Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('jobs')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'jobs'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                ⚡ Phase 1: Structured Remote Jobs (Guest API)
              </button>
              <button
                onClick={() => {
                  setActiveTab('posts');
                  if (posts.length === 0) fetchFeedPosts();
                }}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'posts'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                🔍 Phase 2: Recruiter DMs & Supervisor Scholarships
              </button>
            </div>

            {/* PHASE 1 JOBS SEARCH */}
            {activeTab === 'jobs' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchJobs();
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keywords / Role
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. Full Stack Developer, DevOps, Python"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Worldwide, United States, Europe"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Posted Within
                  </label>
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="r86400">Past 24 Hours</option>
                    <option value="r604800">Past Week</option>
                    <option value="r2592000">Past Month</option>
                  </select>
                </div>

                <div className="sm:col-span-1 flex items-center justify-center pb-2 sm:pb-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isRemote}
                      onChange={(e) => setIsRemote(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span>Remote</span>
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={jobsLoading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {jobsLoading ? 'Crawling...' : '⚡ Crawl Jobs'}
                  </button>
                </div>
              </form>
            </div>

            {/* Results Overview */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                Discovered Remote Opportunities ({jobs.length})
              </h3>
              <span className="text-xs text-slate-500">
                Source: LinkedIn Jobs Public Guest API (Cheerio)
              </span>
            </div>

            {/* Content Display: 2 Columns when modal or selected */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Job Cards */}
              <div className={`${selectedJob ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
                {jobsLoading ? (
                  <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <div className="animate-spin text-3xl mb-2">🔄</div>
                    <p className="text-sm font-medium text-slate-600">
                      Querying LinkedIn Guest API (no browser overhead)...
                    </p>
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
                    No jobs found. Try adjusting the keywords or widening the date filter.
                  </div>
                ) : (
                  jobs.map((job) => (
                    <div
                      key={job.jobId}
                      className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
                        selectedJob?.jobId === job.jobId ? 'border-blue-500 shadow-md ring-1 ring-blue-500' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                              {job.location}
                            </span>
                            {job.isRemote && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Remote
                              </span>
                            )}
                          </div>
                          <h4 className="text-base font-bold text-slate-900 mt-1.5 hover:text-blue-600 cursor-pointer" onClick={() => fetchDetails(job)}>
                            {job.title}
                          </h4>
                          <p className="text-xs font-medium text-slate-600 mt-0.5">
                            {job.company} • <span className="text-slate-400">{job.postedTime}</span>
                          </p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <button
                            onClick={() => saveOpportunity(job, 'job', job.jobId)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 transition-colors"
                          >
                            {savedSuccessMap[job.jobId] ? '✓ Saved!' : '💾 Save to Hunter'}
                          </button>
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            LinkedIn ↗
                          </a>
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          onClick={() => fetchDetails(job)}
                          className="text-blue-600 font-semibold hover:text-blue-800"
                        >
                          {selectedJob?.jobId === job.jobId ? 'Viewing Full Details ▾' : 'View Requirements & Criteria ▾'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Side Detail Panel */}
              {selectedJob && (
                <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-lg h-fit sticky top-20 space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{selectedJob.title}</h4>
                      <p className="text-xs font-medium text-slate-600">{selectedJob.company} • {selectedJob.location}</p>
                    </div>
                    <button
                      onClick={() => setSelectedJob(null)}
                      className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                    >
                      ×
                    </button>
                  </div>

                  {jobDetailsLoading ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      Fetching full description & criteria...
                    </div>
                  ) : selectedJob.details ? (
                    <div className="space-y-4 text-xs">
                      {selectedJob.details.criteria && selectedJob.details.criteria.length > 0 && (
                        <div>
                          <h5 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5">Role Criteria</h5>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedJob.details.criteria.map((c, i) => (
                              <span key={i} className="px-2 py-1 bg-slate-100 rounded text-slate-700 text-[11px]">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <h5 className="font-bold text-slate-700 uppercase tracking-wider mb-1.5">Description</h5>
                        <div className="max-h-96 overflow-y-auto pr-2 text-slate-700 leading-relaxed space-y-2 whitespace-pre-wrap font-sans text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                          {selectedJob.details.descriptionText || 'No full description text returned.'}
                        </div>
                      </div>

                      <div className="pt-2 flex items-center justify-between">
                        <a
                          href={selectedJob.url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-all shadow"
                        >
                          Apply on LinkedIn ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      No extra detail metadata available. You can view the full listing directly on LinkedIn.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* PHASE 2: FEED POSTS & SUPERVISOR SCHOLARSHIPS            */}
        {/* ======================================================== */}
        {activeTab === 'posts' && (
          <div className="space-y-6">
            {/* Search Controls */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  fetchFeedPosts();
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Search Focus / Domain
                  </label>
                  <input
                    type="text"
                    value={postQuery}
                    onChange={(e) => setPostQuery(e.target.value)}
                    placeholder="e.g. Artificial Intelligence, Bioinformatics, Cybersecurity"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Opportunity Classification
                  </label>
                  <select
                    value={postType}
                    onChange={(e) => setPostType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="all">🌍 All Unstructured Posts</option>
                    <option value="scholarship">🎓 Supervisor Grants & PhD Positions</option>
                    <option value="job">💼 Recruiter Hiring Shouts ("DM me")</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={postsLoading}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {postsLoading ? 'Extracting...' : '🔍 Search Posts'}
                  </button>
                </div>
              </form>
            </div>

            {/* Informational Advisory */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 space-y-1">
              <p className="font-bold">💡 How Phase 2 Operates (Safe Zero-Account Mode):</p>
              <p>
                Professors, principal investigators, and hiring recruiters regularly post funding or direct-hire notices without formal job listings. Our parser extracts <strong>direct contact emails</strong>, <strong>remote eligibility</strong>, and <strong>application links</strong> while completely bypassing account-suspension risks.
              </p>
            </div>

            {/* Feed Posts Grid */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900">
                  Extracted Feed Posts ({posts.length})
                </h3>
              </div>

              {postsLoading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <div className="animate-spin text-3xl mb-2">🤖</div>
                  <p className="text-sm font-medium text-slate-600">
                    Extracting and parsing unstructured LinkedIn posts, contact emails, and deadlines...
                  </p>
                </div>
              ) : posts.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
                  No posts extracted for this search. Try broader terms like "Computer Science" or "Software".
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {posts.map((post, idx) => (
                    <div
                      key={idx}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                              post.metadata?.category === 'SCHOLARSHIP'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}>
                              {post.metadata?.category === 'SCHOLARSHIP' ? '🎓 Scholarship / PhD' : '💼 Hiring Post'}
                            </span>
                            {post.metadata?.isRemote && (
                              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Remote Flex
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">Post Extract</span>
                        </div>

                        <h4 className="text-sm font-bold text-slate-900 mt-2.5 line-clamp-2">
                          {post.title}
                        </h4>

                        <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                          {post.snippet}
                        </p>

                        {/* Extracted Metadata Pills */}
                        <div className="mt-3.5 space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                          {post.metadata?.extractedEmails && post.metadata.extractedEmails.length > 0 && (
                            <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                              <span>✉️ Contact:</span>
                              <span className="font-mono">{post.metadata.extractedEmails.join(', ')}</span>
                            </div>
                          )}
                          {post.metadata?.deadline && (
                            <div className="flex items-center gap-1.5 text-amber-800 font-medium">
                              <span>⏰ Deadline:</span>
                              <span>{post.metadata.deadline}</span>
                            </div>
                          )}
                          {post.metadata?.extractedLinks && post.metadata.extractedLinks.length > 0 && (
                            <div className="flex items-center gap-1.5 text-indigo-800 truncate">
                              <span>🔗 Link:</span>
                              <a href={post.metadata.extractedLinks[0]} target="_blank" rel="noreferrer" className="underline truncate">
                                {post.metadata.extractedLinks[0]}
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <a
                          href={post.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          View Original Post ↗
                        </a>

                        <button
                          onClick={() => saveOpportunity(
                            post,
                            post.metadata?.category === 'SCHOLARSHIP' ? 'scholarship' : 'job',
                            `post_${idx}`
                          )}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                        >
                          {savedSuccessMap[`post_${idx}`] ? '✓ Saved' : '+ Save to Studio'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )}

    {/* ======================================================== */}
    {/* PLATFORM 2: X (TWITTER) CRAWLER                          */}
    {/* ======================================================== */}
    {activePlatform === 'x' && (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchXPosts();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                X Search Query / Domain
              </label>
              <input
                type="text"
                value={xQuery}
                onChange={(e) => setXQuery(e.target.value)}
                placeholder="e.g. Python, AI Researcher, Bioinformatics"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Post Intent Filter
              </label>
              <select
                value={xType}
                onChange={(e) => setXType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 focus:outline-none"
              >
                <option value="all">🌍 All Opportunities</option>
                <option value="job">💼 Tech Hiring ("DM me your CV")</option>
                <option value="scholarship">🎓 Funded PhDs & Scholarships</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={xLoading}
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {xLoading ? 'Crawling...' : '✖️ Crawl X'}
              </button>
            </div>
          </form>

          {/* Optional GraphQL Session Injection Accordion */}
          <div className="pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => setShowXCookieSettings(!showXCookieSettings)}
              className="text-slate-500 hover:text-sky-700 font-semibold flex items-center gap-1"
            >
              <span>⚙️</span> {showXCookieSettings ? 'Hide Session Settings' : 'Configure X Session Cookies (Optional GraphQL Interception)'}
            </button>

            {showXCookieSettings && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">auth_token cookie</label>
                  <input
                    type="password"
                    value={xAuthToken}
                    onChange={(e) => {
                      setXAuthToken(e.target.value);
                      localStorage.setItem('x_auth_token', e.target.value);
                    }}
                    placeholder="Paste auth_token from x.com"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">ct0 cookie (csrf)</label>
                  <input
                    type="password"
                    value={xCt0}
                    onChange={(e) => {
                      setXCt0(e.target.value);
                      localStorage.setItem('x_ct0', e.target.value);
                    }}
                    placeholder="Paste ct0 token from x.com"
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* X Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              X (Twitter) Discovered Opportunities ({xPosts.length})
            </h3>
            <span className="text-xs text-slate-500">
              Network Interception & Safe Anti-Ban Extraction
            </span>
          </div>

          {xLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <div className="animate-spin text-3xl mb-2">🔄</div>
              <p className="text-sm font-medium text-slate-600">
                Intercepting X developer & supervisor streams...
              </p>
            </div>
          ) : xPosts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              No posts extracted for this search. Click "Crawl X" to discover active calls.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {xPosts.map((post, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        post.metadata?.category === 'SCHOLARSHIP'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-sky-50 text-sky-700 border border-sky-200'
                      }`}>
                        {post.metadata?.category === 'SCHOLARSHIP' ? '🎓 Scholarship / PhD' : '💼 Hiring / Project'}
                      </span>
                      <span className="text-[11px] text-slate-400">{post.postedTime}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2.5 line-clamp-2">
                      {post.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                      {post.content || post.snippet}
                    </p>

                    <div className="mt-3.5 space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span>👤 Account:</span>
                        <span className="font-semibold">{post.author}</span>
                      </div>
                      {post.metadata?.extractedEmails?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                          <span>✉️ Direct Email:</span>
                          <span className="font-mono">{post.metadata.extractedEmails.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-sky-600 hover:text-sky-800 flex items-center gap-1"
                    >
                      View on X ↗
                    </a>

                    <button
                      onClick={() => saveOpportunity(
                        post,
                        post.metadata?.category === 'SCHOLARSHIP' ? 'scholarship' : 'job',
                        `x_${idx}`
                      )}
                      className="px-3 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                    >
                      {savedSuccessMap[`x_${idx}`] ? '✓ Saved' : '+ Save to Studio'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}

    {/* ======================================================== */}
    {/* PLATFORM 3: FACEBOOK GROUPS CRAWLER                      */}
    {/* ======================================================== */}
    {activePlatform === 'facebook' && (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchFbPosts();
            }}
            className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Field / Domain
              </label>
              <input
                type="text"
                value={fbQuery}
                onChange={(e) => setFbQuery(e.target.value)}
                placeholder="e.g. Computer Science, AI, Remote Work"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Public Group / Page (Optional)
              </label>
              <input
                type="text"
                value={fbGroupUrl}
                onChange={(e) => setFbGroupUrl(e.target.value)}
                placeholder="https://www.facebook.com/groups/your_group_name/"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={fbLoading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {fbLoading ? 'Crawling...' : '📘 Crawl Facebook'}
              </button>
            </div>
          </form>

          {/* Technical Guardrail Notice */}
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-900 leading-relaxed">
            <strong>🛡️ Anti-Ban Architecture:</strong> We avoid querying <code>facebook.com/search/posts/</code> directly, as automated global searches trigger aggressive checkpoint suspensions. Instead, we extract from verified community notices and target public group feeds safely.
          </div>
        </div>

        {/* FB Results */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Facebook Community Opportunities ({fbPosts.length})
            </h3>
          </div>

          {fbLoading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <div className="animate-spin text-3xl mb-2">🔄</div>
              <p className="text-sm font-medium text-slate-600">
                Scanning Facebook group feeds and community notices...
              </p>
            </div>
          ) : fbPosts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              No opportunities found. Click "Crawl Facebook" to extract latest community calls.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fbPosts.map((post, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                        post.metadata?.category === 'SCHOLARSHIP'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {post.metadata?.category === 'SCHOLARSHIP' ? '🎓 Scholarship / PhD' : '💼 Hiring Post'}
                      </span>
                      <span className="text-[11px] text-slate-400">{post.postedTime}</span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 mt-2.5 line-clamp-2">
                      {post.title}
                    </h4>

                    <p className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">
                      {post.content || post.snippet}
                    </p>

                    <div className="mt-3.5 space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <span>👥 Community Group:</span>
                        <span className="font-semibold">{post.author}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      View Community Post ↗
                    </a>

                    <button
                      onClick={() => saveOpportunity(
                        post,
                        post.metadata?.category === 'SCHOLARSHIP' ? 'scholarship' : 'job',
                        `fb_${idx}`
                      )}
                      className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                    >
                      {savedSuccessMap[`fb_${idx}`] ? '✓ Saved' : '+ Save to Studio'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )}
  </div>
</Layout>
);
}
