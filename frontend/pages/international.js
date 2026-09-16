import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function InternationalPortals() {
  const [activeTab, setActiveTab] = useState('portals'); // 'portals', 'assist', 'visaguide'
  const [portalsConfig, setPortalsConfig] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [keywords, setKeywords] = useState('Software Engineer');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Candidate context
  const [candidateName, setCandidateName] = useState('International Candidate');
  const [resumeText, setResumeText] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [uploadingResume, setUploadingResume] = useState(false);

  // Application Assist state
  const [selectedJobForAssist, setSelectedJobForAssist] = useState(null);
  const [assistLoading, setAssistLoading] = useState(false);
  const [applicationPackage, setApplicationPackage] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('token')) {
        window.location.href = '/login';
        return;
      }
    }
    fetchPortalsConfig();
    const savedResume = localStorage.getItem('user_resume_text');
    if (savedResume) setResumeText(savedResume);
    const savedKey = localStorage.getItem('user_groq_api_key');
    if (savedKey) setGroqApiKey(savedKey);
    const savedName = localStorage.getItem('user_candidate_name');
    if (savedName) setCandidateName(savedName);

    // Initial search
    searchPortals('Software Engineer', 'All');
  }, []);

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchPortalsConfig = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/portals/config`);
      setPortalsConfig(res.data?.portals || []);
    } catch (err) {
      console.warn('Could not load portal configs:', err);
    }
  };

  const searchPortals = async (kw, country) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/api/portals/search`, {
        keywords: kw || keywords,
        country: country || selectedCountry,
        max_results: 15
      }, { headers: getHeaders() });

      setJobs(res.data?.jobs || []);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Failed to search international portals.');
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

    try {
      const res = await axios.post(`${API_BASE}/api/job-hunter/resume/upload`, formData, {
        headers: {
          ...getHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.data?.raw_text) {
        setResumeText(res.data.raw_text);
        localStorage.setItem('user_resume_text', res.data.raw_text);
      }
      if (res.data?.structured?.name && res.data.structured.name !== 'Candidate') {
        setCandidateName(res.data.structured.name);
        localStorage.setItem('user_candidate_name', res.data.structured.name);
      }
      if (res.data?.structured?.skills && res.data.structured.skills.length > 0) {
        const primarySkill = res.data.structured.skills[0];
        setKeywords(`${primarySkill} Developer`);
      }
    } catch (err) {
      console.error('Resume upload error:', err);
      setError(err.response?.data?.error || 'Could not parse resume. Please ensure it is a PDF or DOCX.');
    } finally {
      setUploadingResume(false);
    }
  };

  const generateAssistPackage = async (job) => {
    setSelectedJobForAssist(job);
    setActiveTab('assist');
    setAssistLoading(true);
    setApplicationPackage(null);
    setError('');

    try {
      const res = await axios.post(`${API_BASE}/api/portals/assist`, {
        candidate_name: candidateName,
        target_role: job.title,
        job_title: job.title,
        company: job.company,
        country: job.country,
        portal_name: job.portal_name,
        job_description: job.description,
        resume_text: resumeText,
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setApplicationPackage(res.data?.application_package || '');
    } catch (err) {
      console.error('Assist error:', err);
      setError(err.response?.data?.error || 'Failed to generate application package. Verify your Groq API key.');
    } finally {
      setAssistLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const countries = ['All', 'Luxembourg', 'Denmark', 'Estonia', 'Lithuania', 'Germany', 'EU / EEA', 'United Kingdom'];

  return (
    <Layout>
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 px-4 pt-5 pb-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
            Official Portals
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
            Shortage Track
          </span>
        </div>
        <h1 className="text-xl font-extrabold">🌍 Global Talent Portals</h1>
        <p className="text-slate-300 text-xs mt-0.5">Europe &amp; UK official vacancy feeds &amp; visa sponsorship</p>

        {/* Mobile Segmented Control */}
        <div className="segmented-control mt-4 bg-white/10">
          {[
            { id: 'portals', label: '🔍 Portals' },
            { id: 'assist', label: '✉️ Dossier' },
            { id: 'visaguide', label: '📘 Visa Guide' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={activeTab === t.id ? 'active' : ''}
              style={activeTab === t.id ? { background: 'white', color: '#312e81' } : { color: '#c7d2fe' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-0 md:space-y-6 pb-0 md:pb-8">
        {/* Desktop Header — hidden on mobile */}
        <div className="hidden md:block bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Official National Talent Portals
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Shortage Track Verified
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                European & UK International Career Studio
              </h1>
              <p className="mt-1 text-sm sm:text-base text-slate-300 max-w-2xl">
                Match your resume against shortage occupations on official government portals (Luxembourg ADEM, Workindenmark, Work in Estonia, Lithuania, Germany EU Blue Card, UK Sponsor Register) with 1-click tailored application dossiers.
              </p>
            </div>

            {/* Resume Upload Pill */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/15">
              <div>
                <p className="text-xs text-slate-300">Active Candidate Profile:</p>
                <p className="text-sm font-semibold text-white truncate max-w-[200px]">
                  {candidateName}
                </p>
                <p className="text-[11px] text-indigo-200">
                  {resumeText ? `✓ Resume Loaded (${resumeText.length} chars)` : 'No resume uploaded yet'}
                </p>
              </div>
              <label className="cursor-pointer px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-1.5 whitespace-nowrap">
                <span>📄</span> {uploadingResume ? 'Parsing...' : 'Upload CV'}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt"
                  className="hidden"
                  onChange={handleResumeUpload}
                  disabled={uploadingResume}
                />
              </label>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="mt-6 flex flex-wrap gap-2 border-t border-white/10 pt-4">
            <button
              onClick={() => setActiveTab('portals')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'portals'
                  ? 'bg-white text-indigo-950 shadow-md font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              🔍 National Portals & Vacancies
            </button>
            <button
              onClick={() => setActiveTab('assist')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'assist'
                  ? 'bg-white text-indigo-950 shadow-md font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <span>✉️</span> AI Application & Visa Dossier {selectedJobForAssist ? `(${selectedJobForAssist.company})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('visaguide')}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'visaguide'
                  ? 'bg-white text-indigo-950 shadow-md font-bold'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              📘 National Shortage & Visa Rules
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center justify-between">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-800 text-xs font-bold">Dismiss</button>
          </div>
        )}

        {/* TAB 1: PORTALS & VACANCIES */}
        {activeTab === 'portals' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            {/* Search Filter Bar */}
            <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  searchPortals(keywords, selectedCountry);
                }}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end"
              >
                <div className="sm:col-span-6">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Role / Technical Domain
                  </label>
                  <input
                    type="text"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="e.g. Senior Software Engineer, DevOps, Cybersecurity, Data Architect"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Target Country
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value);
                      searchPortals(keywords, e.target.value);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c === 'All' ? '🌍 All Official Portals' : c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {loading ? 'Searching...' : 'Search Portals'}
                  </button>
                </div>
              </form>
            </div>

            {/* Official Portals Quick Directory */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">
                  Official Government Pathways Included
                </h3>
                <span className="text-xs text-slate-500">Curated & Shortage-Compliant</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {portalsConfig.map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md rounded-xl transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                        {p.country}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 mt-1.5 group-hover:text-indigo-600 transition-colors">
                        {p.name}
                      </h4>
                    </div>
                    <span className="text-[11px] text-indigo-600 font-medium mt-2 flex items-center gap-0.5">
                      Open Portal ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Job Listings Grid */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Shortage IT & Engineering Vacancies ({jobs.length})
                </h3>
                {resumeText && (
                  <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Ready for 1-Click AI Application Assist
                  </span>
                )}
              </div>

              {loading ? (
                <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                  <div className="animate-spin text-3xl mb-2">🔄</div>
                  <p className="text-sm font-medium text-slate-600">
                    Scanning official national talent portals and shortage rosters...
                  </p>
                </div>
              ) : jobs.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                  <p className="text-slate-500 text-sm">No vacancies found for your search query. Try broader keywords or click on the direct portal links above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-indigo-300 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {job.country}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-700">
                              {job.portal_name}
                            </span>
                          </div>
                          {job.is_shortage_list && (
                            <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Shortage Track
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-bold text-slate-900 mt-2.5 line-clamp-1">
                          {job.title}
                        </h4>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {job.company}
                        </p>

                        <p className="text-xs text-slate-600 mt-3 line-clamp-3 leading-relaxed">
                          {job.description}
                        </p>

                        {/* Visa & Language Details Box */}
                        <div className="mt-3.5 p-2.5 bg-slate-50 rounded-lg text-xs space-y-1.5 border border-slate-100">
                          <div className="flex items-start gap-1 text-slate-700">
                            <span className="font-semibold text-indigo-700 shrink-0">🛂 Visa/Relocation:</span>
                            <span className="text-slate-600">{job.visa_info}</span>
                          </div>
                          <div className="flex items-start gap-1 text-slate-700">
                            <span className="font-semibold text-emerald-700 shrink-0">🗣️ Language:</span>
                            <span className="text-slate-600">{job.language_requirements}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={job.job_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1"
                        >
                          Official Portal ↗
                        </a>

                        <button
                          onClick={() => generateAssistPackage(job)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <span>✨</span> AI Application Dossier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AI APPLICATION & VISA ASSIST DOSSIER */}
        {activeTab === 'assist' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Application Dossier & Immigration Strategy
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedJobForAssist ? `${selectedJobForAssist.title} at ${selectedJobForAssist.company} (${selectedJobForAssist.country})` : 'Select a vacancy from the portal list to customize'}
                  </p>
                </div>

                {selectedJobForAssist && (
                  <button
                    onClick={() => generateAssistPackage(selectedJobForAssist)}
                    disabled={assistLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>🔄</span> {assistLoading ? 'Generating...' : 'Regenerate Dossier'}
                  </button>
                )}
              </div>

              {!resumeText && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center justify-between">
                  <span>💡 Upload your CV at the top to make the cover letter and visa alignment 100% personalized to your exact experience!</span>
                </div>
              )}

              {assistLoading ? (
                <div className="py-20 text-center">
                  <div className="animate-spin text-4xl mb-3">🤖</div>
                  <h4 className="text-base font-bold text-slate-800">
                    Drafting Tailored European Application Package...
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Analyzing shortage occupation lists ({selectedJobForAssist?.country}), structuring Europass/UK compliant cover letter, and generating direct recruiter outreach messages.
                  </p>
                </div>
              ) : applicationPackage ? (
                <div className="mt-6 space-y-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => copyToClipboard(applicationPackage, 'all')}
                      className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <span>📋</span> {copiedSection === 'all' ? 'Copied to Clipboard!' : 'Copy Full Dossier'}
                    </button>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto">
                    {applicationPackage}
                  </div>
                </div>
              ) : (
                <div className="py-16 text-center text-slate-400">
                  <span className="text-4xl">📁</span>
                  <p className="mt-2 text-sm text-slate-600 font-medium">
                    No dossier generated yet.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Select any shortage opportunity from the "National Portals & Vacancies" tab and click "AI Application Dossier".
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NATIONAL SHORTAGE & VISA REFERENCE GUIDE */}
        {activeTab === 'visaguide' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  European & UK Fast-Track Immigration Guide for IT Professionals
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Official procedures, salary minimums, and shortage occupation mechanisms for non-EU/international talent.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Luxembourg */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇱🇺</span>
                    <h4 className="font-bold text-slate-900 text-base">Luxembourg (ADEM & Work in Luxembourg)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Launched officially in January 2026 by the Ministry of Economy and Ministry of Labour. Only opens vacancies for occupations with severe shortages cross-referenced against the official ADEM list.
                  </p>
                  <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <p><strong>Exemption:</strong> Shortage IT jobs bypass the standard 3-week local labour market test.</p>
                    <p><strong>Permit Type:</strong> Salarié qualifié (Skilled Employee) or EU Blue Card.</p>
                    <p><strong>Salary Threshold:</strong> ~1.5x average gross annual wage for EU Blue Card.</p>
                  </div>
                </div>

                {/* Denmark */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇩🇰</span>
                    <h4 className="font-bold text-slate-900 text-base">Denmark (Workindenmark & SIRI)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Operated by the Ministry of Employment and Danish Agency for International Recruitment and Integration (SIRI).
                  </p>
                  <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <p><strong>Key Scheme:</strong> The Positive List for People with Higher Education (covers Software Developers, Systems Architects, IT Analysts).</p>
                    <p><strong>Alternative:</strong> Fast-Track scheme for SIRI-certified companies with immediate right to work.</p>
                    <p><strong>Pay Limit Scheme:</strong> Available if salary meets standard threshold regardless of education.</p>
                  </div>
                </div>

                {/* Estonia */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇪🇪</span>
                    <h4 className="font-bold text-slate-900 text-base">Estonia (Work in Estonia & e-Residency)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Part of Enterprise Estonia. World leader in digital government with zero immigration quotas for IT specialists.
                  </p>
                  <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <p><strong>Quota Exemption:</strong> ICT professionals and startup employees are 100% exempt from the national immigration quota.</p>
                    <p><strong>Visa Types:</strong> Short-term D-Visa (quick entry within days) + Temporary Residence Permit for Employment.</p>
                    <p><strong>Language:</strong> 100% English operating environment in tech startups & banks.</p>
                  </div>
                </div>

                {/* Lithuania */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇱🇹</span>
                    <h4 className="font-bold text-slate-900 text-base">Lithuania (Work in Lithuania & Invest Lithuania)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Rapidly growing tech and fintech capital in Europe (Revolut, Vinted, tech engineering centers).
                  </p>
                  <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <p><strong>Relocation Grant:</strong> Government provides a one-off arrival allowance (~€3,000) for highly qualified specialists in shortage professions.</p>
                    <p><strong>Permit:</strong> Fast-track EU Blue Card issued in 1-2 months.</p>
                    <p><strong>Family:</strong> Immediate right for spouses to work without separate permits.</p>
                  </div>
                </div>

                {/* Germany */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇩🇪</span>
                    <h4 className="font-bold text-slate-900 text-base">Germany (Make it in Germany & Chancenkarte)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Federal Government portal run by the Federal Ministry for Economic Affairs and Federal Employment Agency.
                  </p>
                  <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <p><strong>EU Blue Card:</strong> Lowered salary minimum for shortage occupations (IT, mathematics, engineering).</p>
                    <p><strong>Opportunity Card (Chancenkarte):</strong> Points-based job search visa allowing 1 year to look for work locally.</p>
                    <p><strong>Experience Track:</strong> IT specialists can qualify based on 3+ years demonstrable experience without a formal university degree.</p>
                  </div>
                </div>

                {/* United Kingdom */}
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇬🇧</span>
                    <h4 className="font-bold text-slate-900 text-base">United Kingdom (Find a Job & Sponsor Register)</h4>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Official UK Government pathways for overseas technology professionals.
                  </p>
                  <div className="text-xs space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                    <p><strong>Skilled Worker Visa:</strong> Requires a job offer from an employer on the official Register of Licensed Sponsors.</p>
                    <p><strong>Global Talent Visa (Tech Nation):</strong> No job offer or sponsor required. Endorsement based on exceptional talent or promise.</p>
                    <p><strong>Scale-up Visa:</strong> 6-month initial sponsorship, transitioning into an unsponsored open work visa.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

