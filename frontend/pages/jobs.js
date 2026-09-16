import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

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
  const [pipeline, setPipeline] = useState([]);
  const [scoringMap, setScoringMap] = useState({});
  const [groqApiKey, setGroqApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [testKeyStatus, setTestKeyStatus] = useState(null); // { loading, valid, message }

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

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/search`, {
        keywords,
        location,
        max_results: 20,
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
              <button
                onClick={() => setShowKeyInput(!showKeyInput)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  showKeyInput ? 'bg-amber-500 text-white shadow' : 'text-amber-300 hover:text-white bg-amber-500/20'
                }`}
                title="Configure Groq API Key"
              >
                ⚙️ Groq API Key
              </button>
            </div>
          </div>
        </div>
        {/* End desktop header */}

        {/* Groq Key Configuration Banner */}
        {showKeyInput && (
          <div className="mx-4 md:mx-0 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                🔑 Groq Cloud API Key (Free High-Speed LLM Inference)
              </span>
              <button onClick={() => setShowKeyInput(false)} className="text-xs text-amber-700 font-bold hover:text-amber-900">
                ✕ Close
              </button>
            </div>
            <p className="text-xs text-amber-800">
              Get your 100% free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="underline font-semibold text-amber-900">console.groq.com/keys</a>. It is saved in your browser and used to power cover letter generation and semantic match scoring.
            </p>
            <div className="flex gap-2 pt-1">
              <input
                type="password"
                value={groqApiKey}
                onChange={(e) => {
                  setGroqApiKey(e.target.value);
                  localStorage.setItem('user_groq_api_key', e.target.value);
                }}
                placeholder="gsk_..."
                className="flex-1 px-3 py-1.5 border border-amber-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
              />
              <button
                onClick={() => {
                  localStorage.setItem('user_groq_api_key', groqApiKey);
                  /* toast: API key saved */
                }}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                Save Key
              </button>
              <button
                onClick={handleTestKey}
                disabled={testKeyStatus?.loading}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center gap-1.5"
              >
                {testKeyStatus?.loading ? '⚡ Testing...' : '🧪 Test Connection'}
              </button>
            </div>

            {testKeyStatus && (
              <div className={`p-2.5 rounded-lg text-xs font-medium border flex items-center gap-2 ${
                testKeyStatus.valid 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                <span>{testKeyStatus.valid ? '✅' : '❌'}</span>
                <span>{testKeyStatus.message}</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 font-bold ml-4">✕</button>
          </div>
        )}

        {/* TAB 1: SEARCH & DISCOVERY */}
        {tab === 'search' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            {/* Search Controls */}
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
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://boards.greenhouse.io/company or https://careers.company.com"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <button
                    onClick={handleAddCustomUrl}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
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

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow transition-all flex items-center gap-2"
                >
                  {loading ? '⚡ Discovering Live Opportunities...' : '🚀 Launch Search & ATS Dorking'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700">Found {jobs.length} Verified Opportunities</h3>
              </div>

              {jobs.length === 0 && !loading && (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                  <span className="text-3xl block mb-2">🔎</span>
                  No jobs loaded yet. Click "Launch Search & ATS Dorking" above to find opportunities.
                </div>
              )}

              {jobs.map((job) => {
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
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">{job.source}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {scoreInfo?.data && (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            scoreInfo.data.score >= 0.8 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            Score: {Math.round(scoreInfo.data.score * 100)}%
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
                    {scoreInfo?.data?.reasons && (
                      <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 space-y-1">
                        <span className="font-semibold text-slate-800">Match Analysis:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                          {scoreInfo.data.reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions Bar */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 items-center justify-between">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleScoreMatch(job)}
                          disabled={scoreInfo?.loading}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-medium transition-colors"
                        >
                          {scoreInfo?.loading ? 'Scoring...' : '🎯 Calculate Resume Score'}
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
                              /* toast: copied */
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
                            <a href={job.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              Link ↗
                            </a>
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
      </div>
    </Layout>
  );
}

