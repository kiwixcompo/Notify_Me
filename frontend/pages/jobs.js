import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import JobResearchModal from '../components/JobResearchModal';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function AIJobHunter() {
  const [tab, setTab] = useState('search'); // 'search', 'resume', 'pipeline'
  const [keywords, setKeywords] = useState('Full Stack Software Engineer');
  const [location, setLocation] = useState('Remote');
  const [customUrl, setCustomUrl] = useState('');
  const [customUrls, setCustomUrls] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [parsedResume, setParsedResume] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [activeCoverLetter, setActiveCoverLetter] = useState({ id: null, text: '', loading: false });
  const [timeFilter, setTimeFilter] = useState('any'); // '24h', '7d', '30d', 'any'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [pipeline, setPipeline] = useState([]);
  const [scoringMap, setScoringMap] = useState({});
  const [groqApiKey, setGroqApiKey] = useState('');
  const [reminderEmail, setReminderEmail] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [settingReminder, setSettingReminder] = useState(false);
  const [reminderStatus, setReminderStatus] = useState(null); // { success: bool, message: str }

  // Deep Job Research states
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [currentResearchJob, setCurrentResearchJob] = useState(null);
  const [researchData, setResearchData] = useState(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState('');
  const [researchLoadingId, setResearchLoadingId] = useState(null);

  // Direct Company + Role Bypass Research Form State
  const [bypassCompany, setBypassCompany] = useState('');
  const [bypassRole, setBypassRole] = useState('');
  const [bypassLocation, setBypassLocation] = useState('Remote');

  const handleDirectBypassSearch = (e) => {
    if (e) e.preventDefault();
    if (!bypassCompany.trim() || !bypassRole.trim()) {
      alert('Please provide both the Company Name and Job Role.');
      return;
    }

    const syntheticId = `bypass_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const syntheticJob = {
      id: syntheticId,
      title: bypassRole.trim(),
      company: bypassCompany.trim(),
      location: bypassLocation.trim() || 'Remote',
      url: '',
      description: `Target role: ${bypassRole.trim()} at ${bypassCompany.trim()}`
    };

    handleDeepResearch(syntheticJob, true);
  };

  const handleDeepResearch = async (job, forceRefresh = false) => {
    setCurrentResearchJob(job);
    setResearchModalOpen(true);
    setResearchLoading(true);
    setResearchError('');
    setResearchLoadingId(job.id);

    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/research/${job.id}`, {
        title: job.title,
        company: job.company,
        url: job.url,
        description: job.description,
        location: job.location,
        forceRefresh
      }, { headers: getHeaders() });

      setResearchData(res.data);
    } catch (err) {
      console.error('Job research error:', err);
      setResearchError(
        err.response?.data?.error || 'Failed to complete deep research. Please try again.'
      );
    } finally {
      setResearchLoading(false);
      setResearchLoadingId(null);
    }
  };

  const handleTestKey = async () => {
    setTestKeyStatus({ loading: true });
    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/test-key`, {
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setTestKeyStatus({ loading: false, valid: res.data.valid, message: res.data.message });
    } catch (err) {
      setTestKeyStatus({
        loading: false,
        valid: false,
        message: err.response?.data?.message || 'Connection to AI service failed.'
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('token')) {
        window.location.href = '/login';
        return;
      }
    }
    fetchPipeline();
    const saved = localStorage.getItem('user_resume_text');
    if (saved) setResumeText(saved);
    const savedKey = localStorage.getItem('user_groq_api_key');
    if (savedKey) setGroqApiKey(savedKey);
  }, []);

  const getHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleAddCustomUrl = () => {
    if (customUrl.trim() && !customUrls.includes(customUrl.trim())) {
      setCustomUrls([...customUrls, customUrl.trim()]);
      setCustomUrl('');
    }
  };

  const handleRemoveCustomUrl = (urlToRemove) => {
    setCustomUrls(customUrls.filter(u => u !== urlToRemove));
  };

  const handleSearch = async (customFilter) => {
    setLoading(true);
    setError('');
    setCurrentPage(1);
    const activeFilter = customFilter !== undefined ? customFilter : timeFilter;
    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/search`, {
        keywords,
        location,
        timeFilter: activeFilter,
        max_results: 100,
        custom_urls: customUrls
      }, { headers: getHeaders() });

      setJobs(res.data.jobs || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
        return;
      }
      setError(err.response?.data?.error || 'Failed to search jobs. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetReminder = async (e) => {
    e?.preventDefault();
    if (!reminderEmail && !localStorage.getItem('token')) {
      alert('Please enter your email to receive job reminders.');
      return;
    }
    setSettingReminder(true);
    setReminderStatus(null);
    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/alert-reminder`, {
        email: reminderEmail,
        keywords: keywords || 'Software Engineer',
        location: location || 'Remote',
        frequency: 'instant'
      }, { headers: getHeaders() });

      setReminderStatus({ success: true, message: res.data.message });
      setTimeout(() => {
        setShowReminderModal(false);
        setReminderStatus(null);
      }, 3500);
    } catch (err) {
      setReminderStatus({
        success: false,
        message: err.response?.data?.error || 'Failed to set job reminder.'
      });
    } finally {
      setSettingReminder(false);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingResume(true);
    setError('');
    const formData = new FormData();
    formData.append('resume', file);
    if (groqApiKey) formData.append('groq_api_key', groqApiKey);

    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/resume/upload`, formData, {
        headers: { ...getHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setResumeText(res.data.raw_text);
      setParsedResume(res.data.structured);
      localStorage.setItem('user_resume_text', res.data.raw_text);
    } catch (err) {
      setError(err.response?.data?.error || 'Resume parse failed');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleScoreMatch = async (job) => {
    if (!resumeText) {
      setTab('resume'); setError('Please upload or paste your resume in the Resume tab first.');
      setTab('resume');
      return;
    }
    setScoringMap(prev => ({ ...prev, [job.id]: { loading: true } }));
    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/match-score`, {
        resume_text: resumeText,
        job_title: job.title,
        job_description: job.description || job.title,
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setScoringMap(prev => ({ ...prev, [job.id]: { loading: false, data: res.data } }));
    } catch (err) {
      setScoringMap(prev => ({ ...prev, [job.id]: { loading: false, error: 'Failed' } }));
    }
  };

  const handleGenerateCoverLetter = async (job) => {
    if (!resumeText) {
      setTab('resume'); setError('Please upload or paste your resume in the Resume tab first.');
      setTab('resume');
      return;
    }
    setActiveCoverLetter({ id: job.id, text: '', loading: true });
    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/cover-letter`, {
        resume_text: resumeText,
        job_title: job.title,
        company: job.company,
        job_description: job.description || '',
        candidate_name: parsedResume?.name || 'Candidate',
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setActiveCoverLetter({ id: job.id, text: res.data.cover_letter, loading: false });
    } catch (err) {
      setActiveCoverLetter({ id: job.id, text: 'Failed to generate letter.', loading: false });
    }
  };

  const handleSaveToPipeline = async (job, status = 'saved') => {
    try {
      const scoreData = scoringMap[job.id]?.data;
      await axios.post(`${API_BASE}/api/job-hunter/pipeline/save`, {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        url: job.url,
        description: job.description,
        status,
        matchScore: scoreData?.score || 0,
        matchReasons: scoreData?.reasons || []
      }, { headers: getHeaders() });

      fetchPipeline();
      alert(`Job added to application pipeline (${status})!`);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPipeline = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/job-hunter/pipeline`, { headers: getHeaders() });
      setPipeline(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const updatePipelineStatus = async (jobId, newStatus) => {
    try {
      await axios.post(`${API_BASE}/api/job-hunter/pipeline/save`, {
        id: jobId,
        status: newStatus
      }, { headers: getHeaders() });
      fetchPipeline();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Layout>
      <div className="space-y-0 md:space-y-6">

        {/* ── Mobile Page Header (hidden on desktop) ── */}
        <div className="md:hidden bg-gradient-to-r from-blue-700 to-indigo-700 px-4 pt-5 pb-4 text-white">
          <h1 className="text-xl font-extrabold">💼 AI Job Hunter</h1>
          <p className="text-blue-200 text-xs mt-0.5">Resume scoring · Cover letters · Pipeline tracking</p>

          {/* Mobile Segmented Control */}
          <div className="segmented-control mt-4 bg-blue-900/40">
            {[
              { id: 'search', label: '🔍 Search' },
              { id: 'resume', label: '📄 Resume' },
              { id: 'pipeline', label: `📊 Pipeline` },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={tab === t.id ? 'active' : ''}
                style={tab === t.id ? { background: 'white', color: '#2563eb' } : { color: '#bfdbfe' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Desktop Header Banner (hidden on mobile) ── */}
        <div className="hidden md:block bg-gradient-to-r from-blue-900 to-indigo-800 rounded-2xl p-6 text-white shadow-lg mx-3 sm:mx-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">💼 AI Job Hunter</h1>
              <p className="text-blue-200 text-sm mt-1">
                Autonomous remote job discovery, custom ATS links, semantic resume scoring &amp; instant application drafts.
              </p>
            </div>
            <div className="flex items-center space-x-2 bg-blue-950/50 p-1.5 rounded-xl border border-blue-700/50">
              <button
                onClick={() => setTab('search')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'search' ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:text-white'
                }`}
              >
                🔍 Job Discovery
              </button>
              <button
                onClick={() => setTab('resume')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'resume' ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:text-white'
                }`}
              >
                📄 Resume Intelligence
              </button>
              <button
                onClick={() => setTab('pipeline')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === 'pipeline' ? 'bg-blue-600 text-white shadow' : 'text-blue-200 hover:text-white'
                }`}
              >
                📊 Pipeline ({pipeline.length})
              </button>
            </div>
          </div>
        </div>
        {/* End desktop header */}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 font-bold ml-4">✕</button>
          </div>
        )}

        {/* TAB 1: SEARCH & DISCOVERY */}
        {tab === 'search' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            {/* Direct Company & Role Bypass Research Box */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-2xl p-5 sm:p-6 text-white shadow-md space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/10 pb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xl">🎯</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-900/60 px-2.5 py-0.5 rounded-full border border-indigo-700">
                      Direct Application &amp; Recruiter Bypass
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-bold">
                    Target Specific Company &amp; Role
                  </h3>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Enter any company name and job title to bypass third-party job boards (LinkedIn, Indeed, ZipRecruiter) and discover their official direct ATS link, hiring managers, and verified salary band.
                  </p>
                </div>
              </div>

              <form onSubmit={handleDirectBypassSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-indigo-200 mb-1">
                    Company Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aptive, Stripe, Datadog, Anthropic…"
                    value={bypassCompany}
                    onChange={(e) => setBypassCompany(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300/60 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-indigo-200 mb-1">
                    Job Role / Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Web Developer, Senior DevOps, AI Engineer…"
                    value={bypassRole}
                    onChange={(e) => setBypassRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300/60 text-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="sm:col-span-3 flex items-end">
                  <button
                    type="submit"
                    disabled={researchLoading && researchLoadingId?.startsWith('bypass_')}
                    className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5 min-h-[44px] disabled:opacity-50"
                  >
                    {researchLoading && researchLoadingId?.startsWith('bypass_') ? (
                      <>
                        <span className="animate-spin text-sm">⚡</span>
                        <span>Bypassing...</span>
                      </>
                    ) : (
                      <>
                        <span>🔬</span>
                        <span>Find Direct Info</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* General Discovery Search Controls */}
            <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Keywords / Job Title</label>
                  <input
                    type="search"
                    inputMode="search"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="Senior Frontend Engineer, AI Researcher…"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[48px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location / Modality</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Remote, Worldwide, United States…"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[48px]"
                  />
                </div>
              </div>

              {/* Direct Website Links Section */}
              <div className="border-t border-slate-100 pt-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  🌐 Target Direct Websites & ATS Links (Greenhouse, Lever, Ashby, Company Career Pages)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://boards.greenhouse.io/company or https://careers.company.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-w-0"
                  />
                  <button
                    onClick={handleAddCustomUrl}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors shrink-0"
                  >
                    + Add Link
                  </button>
                </div>

                {customUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customUrls.map((u, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-200">
                        <span className="truncate max-w-xs">{u}</span>
                        <button onClick={() => handleRemoveCustomUrl(u)} className="text-blue-500 hover:text-blue-800 font-bold">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-3 border-t border-slate-100">
                {/* Timeframe Filter */}
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="text-xs font-semibold text-slate-600 whitespace-nowrap">⏳ Timeframe:</label>
                  <select
                    value={timeFilter}
                    onChange={(e) => {
                      const newFilter = e.target.value;
                      setTimeFilter(newFilter);
                      handleSearch(newFilter);
                    }}
                    className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="any">All Time</option>
                    <option value="24h">Past 24 Hours</option>
                    <option value="7d">Past Week</option>
                    <option value="30d">Past Month</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <button
                    onClick={() => setShowReminderModal(true)}
                    type="button"
                    className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm min-h-[44px] text-center"
                    title="Set email reminder for this search"
                  >
                    🔔 Remind Me of Matching Jobs
                  </button>
                  <button
                    onClick={() => handleSearch()}
                    disabled={loading}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow transition-all flex items-center justify-center gap-2 min-h-[44px]"
                  >
                    {loading ? '⚡ Searching Global Feeds...' : '🚀 Launch Search'}
                  </button>
                </div>
              </div>
            </div>

            {/* Reminder Subscription Modal */}
            {showReminderModal && (
              <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl shadow-md space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔔</span>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Get Instant Email Alerts for &ldquo;{keywords || 'Software Engineer'}&rdquo;
                    </h4>
                  </div>
                  <button
                    onClick={() => setShowReminderModal(false)}
                    className="text-slate-400 hover:text-slate-700 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Receive an immediate email with current direct opportunities, and automated alerts whenever new matching roles are indexed from global feeds.
                </p>
                <form onSubmit={handleSetReminder} className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="email"
                    required
                    value={reminderEmail}
                    onChange={(e) => setReminderEmail(e.target.value)}
                    placeholder="Enter your email address..."
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white min-h-[42px]"
                  />
                  <button
                    type="submit"
                    disabled={settingReminder}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition shadow min-h-[42px] flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    {settingReminder ? 'Subscribing...' : 'Activate Reminder'}
                  </button>
                </form>
                {reminderStatus && (
                  <p className={`text-xs font-semibold ${reminderStatus.success ? 'text-emerald-700' : 'text-red-600'}`}>
                    {reminderStatus.success ? '✅ ' : '⚠️ '}{reminderStatus.message}
                  </p>
                )}
              </div>
            )}

            {/* Search Results */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700">
                  Found {jobs.length} Verified Opportunities
                  {timeFilter !== 'any' && <span className="ml-1 text-xs font-normal text-slate-500">({timeFilter})</span>}
                </h3>
                {jobs.length > 0 && (
                  <button
                    onClick={() => setShowReminderModal(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  >
                    🔔 Alert me for this search
                  </button>
                )}
              </div>

              {jobs.length === 0 && !loading && (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                  <span className="text-3xl block mb-2">🔎</span>
                  No jobs loaded yet. Click &ldquo;Launch Search&rdquo; above to find opportunities.
                </div>
              )}

              {/* Pagination calculations */}
              {(() => {
                const totalPages = Math.ceil(jobs.length / pageSize) || 1;
                const paginatedJobs = jobs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

                return (
                  <>
                    {paginatedJobs.map((job) => {
                      const scoreInfo = scoringMap[job.id];
                      return (
                        <div key={job.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                            <div>
                              <h4 className="font-bold text-slate-900 text-base">{job.title}</h4>
                              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-semibold text-slate-700">{job.company}</span>
                                <span>•</span>
                                <span>📍 {job.location}</span>
                                <span>•</span>
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">{job.source}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {scoreInfo?.data && (
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  (scoreInfo.data.scorePercent >= 80 || scoreInfo.data.score >= 0.8) ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  Score: {scoreInfo.data.scorePercent !== undefined ? scoreInfo.data.scorePercent : Math.round(scoreInfo.data.score * (scoreInfo.data.score <= 1 ? 100 : 1))}%
                                </span>
                              )}
                              {scoreInfo?.error && (
                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                                  Score error
                                </span>
                              )}
                              <a
                                href={job.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
                              >
                                View Original Link ↗
                              </a>
                            </div>
                          </div>

                          {job.description && (
                            <p className="text-xs text-slate-600 line-clamp-2">{job.description}</p>
                          )}

                          {/* Match Reasons */}
                          {(scoreInfo?.data?.reasons || scoreInfo?.data?.match_reasons) && (
                            <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 space-y-1">
                              <span className="font-semibold text-slate-800">Match Analysis:</span>
                              <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                                {(scoreInfo.data.reasons || scoreInfo.data.match_reasons).map((r, i) => (
                                  <li key={i}>{r}</li>
                                ))}
                              </ul>
                              {scoreInfo?.data?.missing_skills?.length > 0 && (
                                <div className="pt-1.5 mt-1 border-t border-slate-200/60 text-slate-500">
                                  <span className="font-semibold text-slate-700">Recommended Skills to Add: </span>
                                  {scoreInfo.data.missing_skills.join(', ')}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Actions Bar */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 items-center justify-between">
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleDeepResearch(job)}
                                disabled={researchLoadingId === job.id}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                                title="Run automated 4-stage company & recruiter research"
                              >
                                {researchLoadingId === job.id ? (
                                  <>
                                    <span className="animate-spin text-[10px]">⚡</span>
                                    <span>Researching...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>🔬</span>
                                    <span>Deep Research</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleScoreMatch(job)}
                                disabled={scoreInfo?.loading}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                                  scoreInfo?.loading
                                    ? 'bg-blue-100 text-blue-700 animate-pulse'
                                    : scoreInfo?.data
                                      ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                {scoreInfo?.loading ? 'Scoring...' : scoreInfo?.data ? '✓ Recalculate Score' : '🎯 Calculate Resume Score'}
                              </button>
                              <button
                                onClick={() => handleGenerateCoverLetter(job)}
                                disabled={activeCoverLetter.id === job.id && activeCoverLetter.loading}
                                className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-xs font-medium transition-colors"
                              >
                                {activeCoverLetter.id === job.id && activeCoverLetter.loading ? 'Drafting...' : '✍️ 1-Click AI Cover Letter'}
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleSaveToPipeline(job, 'saved')}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded-md text-xs font-medium transition-colors"
                              >
                                📌 Save
                              </button>
                              <button
                                onClick={() => handleSaveToPipeline(job, 'applied')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-colors"
                              >
                                ✓ Mark Applied
                              </button>
                            </div>
                          </div>

                          {/* Cover Letter Accordion */}
                          {activeCoverLetter.id === job.id && activeCoverLetter.text && (
                            <div className="mt-3 p-4 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-indigo-900">Tailored Cover Letter / Cold Email Draft</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(activeCoverLetter.text);
                                  }}
                                  className="text-xs text-indigo-700 hover:text-indigo-900 font-semibold"
                                >
                                  📋 Copy Text
                                </button>
                              </div>
                              <textarea
                                readOnly
                                value={activeCoverLetter.text}
                                rows={6}
                                className="w-full text-xs font-mono p-3 bg-white border border-indigo-100 rounded-md focus:outline-none text-slate-800"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Pagination Controls */}
                    {jobs.length > pageSize && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-xl shadow-sm">
                        <div className="text-xs text-slate-500 font-medium">
                          Showing <span className="font-bold text-slate-800">{(currentPage - 1) * pageSize + 1}</span> to{' '}
                          <span className="font-bold text-slate-800">{Math.min(currentPage * pageSize, jobs.length)}</span> of{' '}
                          <span className="font-bold text-slate-800">{jobs.length}</span> opportunities
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setCurrentPage((p) => Math.max(p - 1, 1));
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                          >
                            &larr; Previous 10
                          </button>

                          <div className="flex items-center gap-1 max-w-[200px] sm:max-w-none overflow-x-auto scrollbar-hide py-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                              <button
                                key={pageNum}
                                onClick={() => {
                                  setCurrentPage(pageNum);
                                  window.scrollTo({ top: 400, behavior: 'smooth' });
                                }}
                                className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center shrink-0 ${
                                  currentPage === pageNum
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {pageNum}
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              setCurrentPage((p) => Math.min(p + 1, totalPages));
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
                          >
                            Next 10 &rarr;
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* TAB 2: RESUME INTELLIGENCE */}
        {tab === 'resume' && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900">📄 Resume Intelligence & Profile</h3>
            <p className="text-xs text-slate-500">
              Upload your CV/Resume (PDF, DOCX, or TXT). The system extracts your core capabilities and uses local LLM embeddings to semantically score matches and tailor applications.
            </p>

            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                className="block mx-auto text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {uploadingResume && <p className="text-xs text-blue-600 mt-2 font-medium">Extracting and embedding resume...</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Extracted Resume Text (Editable)</label>
              <textarea
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  localStorage.setItem('user_resume_text', e.target.value);
                }}
                rows={10}
                placeholder="Resume text will appear here automatically when uploaded, or you can paste directly..."
                className="w-full text-xs p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
              />
            </div>

            {parsedResume && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Structured Profile Elements</h4>
                <div className="text-xs text-slate-600">
                  <span className="font-semibold">Candidate:</span> {parsedResume.name || 'Not detected'}
                </div>
                {parsedResume.skills && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {parsedResume.skills.map((s, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: APPLICATION PIPELINE */}
        {tab === 'pipeline' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">📊 Application Status Kanban Pipeline</h3>
              {pipeline.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm('Clear all saved jobs in your pipeline?')) {
                      await axios.delete(`${API_BASE}/api/job-hunter/pipeline/clear`, { headers: getHeaders() });
                      fetchPipeline();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  🗑️ Clear Pipeline
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {['saved', 'applied', 'interviewing', 'offer'].map((colStatus) => {
                const columnJobs = pipeline.filter(j => (j.status || 'saved') === colStatus);
                return (
                  <div key={colStatus} className="bg-slate-100/70 p-4 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        {colStatus} ({columnJobs.length})
                      </span>
                    </div>

                    <div className="space-y-3">
                      {columnJobs.map((job) => (
                        <div key={job._id || job.wwrJobId} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm space-y-2">
                          <h5 className="font-bold text-xs text-slate-900 leading-tight">{job.title}</h5>
                          <p className="text-xs text-slate-500">{job.company}</p>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                            <select
                              value={job.status}
                              onChange={(e) => updatePipelineStatus(job.wwrJobId, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none"
                            >
                              <option value="saved">Saved</option>
                              <option value="applied">Applied</option>
                              <option value="interviewing">Interviewing</option>
                              <option value="offer">Offer</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDeepResearch({ id: job.wwrJobId, title: job.title, company: job.company, url: job.link, description: job.description })}
                                className="text-indigo-600 hover:text-indigo-800 font-semibold"
                                title="Run Deep Job Research"
                              >
                                🔬 Research
                              </button>
                              <a href={job.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                Link ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                      {columnJobs.length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-400">Empty</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Deep Job Research Dossier Modal */}
        <JobResearchModal
          isOpen={researchModalOpen}
          onClose={() => setResearchModalOpen(false)}
          job={currentResearchJob}
          researchData={researchData}
          loading={researchLoading}
          error={researchError}
          onRefresh={() => currentResearchJob && handleDeepResearch(currentResearchJob, true)}
        />
      </div>
    </Layout>
  );
}

