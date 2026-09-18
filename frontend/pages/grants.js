import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function GrantStudio() {
  const [activeTab, setActiveTab] = useState('finder'); // 'finder', 'writer', 'budget', 'saved'
  
  // Finder state
  const [fieldOfResearch, setFieldOfResearch] = useState('Artificial Intelligence, Health & Climate Science');
  const [careerStage, setCareerStage] = useState('Early to Mid-Career / Faculty');
  const [region, setRegion] = useState('Global');
  const [funderType, setFunderType] = useState('All');
  const [grants, setGrants] = useState([]);
  const [searchingGrants, setSearchingGrants] = useState(false);

  // Proposal writer state
  const [title, setTitle] = useState('');
  const [coreIdea, setCoreIdea] = useState('');
  const [targetFunder, setTargetFunder] = useState('National Science Foundation / Horizon Europe');
  const [fieldOfStudy, setFieldOfStudy] = useState('Computer Science & Digital Health');
  const [durationMonths, setDurationMonths] = useState(24);
  const [piName, setPiName] = useState('');
  const [methodNotes, setMethodNotes] = useState('');
  const [expectedOutcomes, setExpectedOutcomes] = useState('');
  const [generatedProposal, setGeneratedProposal] = useState('');
  const [generatingProposal, setGeneratingProposal] = useState(false);

  // Budget state
  const [budgetTitle, setBudgetTitle] = useState('');
  const [budgetAmount, setBudgetAmount] = useState(150000);
  const [budgetDuration, setBudgetDuration] = useState(24);
  const [personnelCount, setPersonnelCount] = useState(3);
  const [includeEquipment, setIncludeEquipment] = useState(true);
  const [includeTravel, setIncludeTravel] = useState(true);
  const [generatedBudget, setGeneratedBudget] = useState('');
  const [generatingBudget, setGeneratingBudget] = useState(false);

  // Saved proposals state
  const [savedProposals, setSavedProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [error, setError] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Real-Time Scholarship Sites Crawler state
  const [crawlerSites, setCrawlerSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('all');
  const [onlyFullyFunded, setOnlyFullyFunded] = useState(true);
  const [excludeExpired, setExcludeExpired] = useState(true);
  const [computerScienceOnly, setComputerScienceOnly] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [crawledScholarships, setCrawledScholarships] = useState([]);
  const [crawlingLive, setCrawlingLive] = useState(false);
  const [savedScholarshipMap, setSavedScholarshipMap] = useState({});
  const [testKeyStatus, setTestKeyStatus] = useState(null);

  // PhD & Candidate Alignment / Cold Outreach State
  const [fitInputMode, setFitInputMode] = useState('url'); // 'url' or 'text'
  const [fitUrl, setFitUrl] = useState('');
  const [fitPastedText, setFitPastedText] = useState('');
  const [fitCandidateName, setFitCandidateName] = useState('');
  const [fitCandidateProfile, setFitCandidateProfile] = useState(
    'Senior Computer Science & Software Systems professional with 7+ years building distributed applications, applied AI pipelines, data systems, and cloud infrastructure.'
  );
  const [fitPiName, setFitPiName] = useState('');
  // Per-scholarship alignment evaluation map: { [itemId]: { loading, result, error } }
  const [scholarshipAlignmentMap, setScholarshipAlignmentMap] = useState({});
  // Selected modal for full details
  const [activeDetailItem, setActiveDetailItem] = useState(null); // { item, analysis }
  const [activeOutreachItem, setActiveOutreachItem] = useState(null); // { item, analysis, type: 'email' | 'proposal' }
  const [copiedModalText, setCopiedModalText] = useState(false);

  // Active Explanatory Modal
  const [activeModalMetric, setActiveModalMetric] = useState(null); // 'matchScore', 'phdEligible', 'csEligible', 'recommendation'

  // Whitelist / Custom Source Domains (persisted in localStorage)
  const [whitelistedDomains, setWhitelistedDomains] = useState([
    'scholarshiptab.com',
    'scholarshipsads.com',
    'scholarshipsandaid.org',
    'scholarshipregion.com',
    'findaphd.com',
    'jobs.ac.uk'
  ]);
  const [newDomainInput, setNewDomainInput] = useState('');

  // Standalone Cold Email Builder State
  const [coldEmailTitle, setColdEmailTitle] = useState('');
  const [coldEmailUni, setColdEmailUni] = useState('');
  const [coldEmailPi, setColdEmailPi] = useState('');
  const [coldEmailSummary, setColdEmailSummary] = useState('');
  const [coldEmailResult, setColdEmailResult] = useState(null);
  const [generatingColdEmail, setGeneratingColdEmail] = useState(false);
  const [copiedStandaloneEmail, setCopiedStandaloneEmail] = useState(false);

  // Live compose email state (for outreach modal — generates fresh tailored email)
  const [liveEmailLoading, setLiveEmailLoading] = useState(false);
  const [liveEmailDraft, setLiveEmailDraft] = useState(null); // { subjectLines, emailBody, strategicTips }
  const [liveEmailError, setLiveEmailError] = useState('');

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

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Generate a fresh tailored cold email for a specific scholarship on demand
  const handleComposeEmailLive = async (item, analysis) => {
    setLiveEmailLoading(true);
    setLiveEmailDraft(null);
    setLiveEmailError('');

    const piName = item.supervisor && item.supervisor !== 'Not Stated' && item.supervisor !== 'Project Supervisor'
      ? item.supervisor.split(',')[0].trim()
      : (analysis?.emailDraft?.salutation?.replace(/^Dear\s+/, '').replace(/,$/, '').trim() || '');

    try {
      const res = await axios.post(`${API_BASE}/api/scholarships/generate-cold-email`, {
        project_title: item.title || '',
        university_or_lab: item.university || item.institution || '',
        pi_name: piName,
        project_summary: item.description ? item.description.substring(0, 1500) : '',
        candidate_name: fitCandidateName || 'Prospective Candidate',
        candidate_background: fitCandidateProfile || '',
        groq_api_key: groqApiKey
      }, {
        headers: getHeaders(),
        timeout: 65000
      });

      setLiveEmailDraft(res.data);
    } catch (err) {
      setLiveEmailError(err.response?.data?.error || 'Failed to compose email. Please try again.');
    } finally {
      setLiveEmailLoading(false);
    }
  };

  const fetchCrawlerSites = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/scholarships/crawler/sites`);
      setCrawlerSites(res.data?.sites || []);
    } catch (err) {
      console.warn('Could not load crawler sites:', err);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (!localStorage.getItem('token')) {
        window.location.href = '/login';
        return;
      }
    }
    fetchSavedProposals();
    fetchCrawlerSites();
    const savedKey = localStorage.getItem('user_groq_api_key');
    if (savedKey) setGroqApiKey(savedKey);

    const savedWhitelist = localStorage.getItem('scholarship_domain_whitelist');
    if (savedWhitelist) {
      try {
        setWhitelistedDomains(JSON.parse(savedWhitelist));
      } catch (e) {
        console.warn('Could not parse saved whitelist:', e);
      }
    }

    const savedResume = localStorage.getItem('user_resume_text');
    const savedProfile = localStorage.getItem('user_academic_profile');
    if (savedResume) {
      setFitCandidateProfile(savedResume);
    } else if (savedProfile) {
      setFitCandidateProfile(savedProfile);
    }

    const savedCandidateName = localStorage.getItem('user_candidate_name');
    if (savedCandidateName && savedCandidateName.trim()) {
      setFitCandidateName(savedCandidateName);
    }
  }, []);

  const saveWhitelistToStorage = (list) => {
    setWhitelistedDomains(list);
    localStorage.setItem('scholarship_domain_whitelist', JSON.stringify(list));
  };

  const handleAddDomain = () => {
    if (!newDomainInput.trim()) return;
    const cleanDomain = newDomainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!whitelistedDomains.includes(cleanDomain)) {
      const updated = [...whitelistedDomains, cleanDomain];
      saveWhitelistToStorage(updated);
    }
    setNewDomainInput('');
  };

  const handleRemoveDomain = (domainToRemove) => {
    const updated = whitelistedDomains.filter(d => d !== domainToRemove);
    saveWhitelistToStorage(updated);
  };

  const handleAnalyzeFit = async (overrideUrl = null, overrideText = null, overrideTitle = null) => {
    setAnalyzingFit(true);
    setFitError('');
    setFitAnalysisResult(null);

    const targetUrl = overrideUrl !== null ? overrideUrl : (fitInputMode === 'url' ? fitUrl : null);
    const targetText = overrideText !== null ? overrideText : (fitInputMode === 'text' ? fitPastedText : null);

    try {
      const res = await axios.post(`${API_BASE}/api/scholarships/analyze-fit`, {
        url: targetUrl,
        pasted_text: targetText,
        candidate_profile: fitCandidateProfile,
        candidate_name: fitCandidateName,
        pi_name: fitPiName,
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      if (res.data?.anti_scraping_triggered) {
        setFitError(res.data.error || 'Protected portal detected. Switched to Pasted Text mode.');
        setFitInputMode('text');
        return;
      }

      if (!res.data?.success) {
        setFitError(res.data?.error || 'Analysis failed. Please verify input.');
        return;
      }

      setFitAnalysisResult(res.data.analysis);
      if (res.data.groundedLinks) {
        setFitAnalysisResult(prev => ({
          ...prev,
          groundedLinks: res.data.groundedLinks
        }));
      }

      // Pre-fill cold email fields
      if (res.data.analysis) {
        setColdEmailTitle(overrideTitle || res.data.analysis.projectTitle || '');
        setColdEmailUni(res.data.analysis.institution || '');
      }
    } catch (err) {
      console.error('Fit analysis error:', err);
      setFitError(err.response?.data?.error || 'Failed to analyze fit. If target URL is protected, paste text directly.');
    } finally {
      setAnalyzingFit(false);
    }
  };

  const handleGenerateStandaloneColdEmail = async () => {
    if (!coldEmailTitle.trim()) {
      alert('Please enter a Project Title or Research Focus.');
      return;
    }
    setGeneratingColdEmail(true);
    try {
      const res = await axios.post(`${API_BASE}/api/scholarships/generate-cold-email`, {
        project_title: coldEmailTitle,
        university_or_lab: coldEmailUni,
        pi_name: coldEmailPi || 'Professor / Dr.',
        project_summary: coldEmailSummary,
        candidate_background: fitCandidateProfile,
        candidate_name: fitCandidateName,
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setColdEmailResult(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate cold email.');
    } finally {
      setGeneratingColdEmail(false);
    }
  };

  // Evaluate a specific scholarship card in-place using uploaded CV
  const handleEvaluateItemAlignment = async (item, specificCardKey = null) => {
    const cardKey = specificCardKey || item.id || item.url || item.title;
    setScholarshipAlignmentMap(prev => ({
      ...prev,
      [cardKey]: { loading: true, result: null, error: null }
    }));

    try {
      const primarySupervisor = item.supervisor && item.supervisor !== 'Not Stated' && item.supervisor !== 'Project Supervisor'
        ? item.supervisor.split(',')[0].trim()
        : null;

      const opportunityText = `Project Title: ${item.title}\nHost Institution: ${item.university || ''}\nTarget Supervisor(s): ${item.supervisor || ''}\nProject Summary & Technical Scope: ${item.description || ''}\nFunding & Benefits: ${item.benefits?.join(', ') || item.fundingType || ''}\nDeadline: ${item.rawDeadline || item.deadline || ''}\nOfficial Opportunity Link: ${item.url || ''}`;

      const res = await axios.post(`${API_BASE}/api/scholarships/analyze-fit`, {
        url: item.url,
        pasted_text: opportunityText,
        candidate_profile: fitCandidateProfile,
        candidate_name: fitCandidateName,
        pi_name: primarySupervisor,
        groq_api_key: groqApiKey
      }, {
        headers: getHeaders(),
        timeout: 60000
      });

      if (!res.data?.success) {
        setScholarshipAlignmentMap(prev => ({
          ...prev,
          [cardKey]: { loading: false, result: null, error: res.data?.error || 'Evaluation failed' }
        }));
        return;
      }

      const analysisData = {
        ...res.data.analysis,
        groundedLinks: res.data.groundedLinks || []
      };

      setScholarshipAlignmentMap(prev => ({
        ...prev,
        [cardKey]: { loading: false, result: analysisData, error: null }
      }));
    } catch (err) {
      console.error('Alignment evaluation error:', err);
      setScholarshipAlignmentMap(prev => ({
        ...prev,
        [cardKey]: {
          loading: false,
          result: null,
          error: err.response?.data?.error || err.message || 'Could not evaluate alignment.'
        }
      }));
    }
  };

  const handleCrawlScholarshipSites = async () => {
    setCrawlingLive(true);
    setError('');
    try {
      const res = await axios.get(`${API_BASE}/api/scholarships/crawler/live`, {
        params: {
          siteId: selectedSiteId,
          onlyFullyFunded,
          excludeExpired,
          computerScienceOnly,
          country: selectedCountry
        },
        headers: getHeaders()
      });
      setCrawledScholarships(res.data?.opportunities || []);
    } catch (err) {
      console.error('Scholarship crawl error:', err);
      setError(err.response?.data?.error || 'Failed to crawl scholarship websites.');
    } finally {
      setCrawlingLive(false);
    }
  };

  const handleSaveScholarship = async (item) => {
    try {
      await axios.post(`${API_BASE}/api/scholarships/crawler/save`, {
        item
      }, { headers: getHeaders() });

      setSavedScholarshipMap(prev => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setSavedScholarshipMap(prev => ({ ...prev, [item.id]: false }));
      }, 3000);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save scholarship');
    }
  };

  const handleSearchGrants = async () => {
    setSearchingGrants(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/api/grants/search`, {
        field_of_research: fieldOfResearch,
        career_stage: careerStage,
        region,
        funder_type: funderType,
        max_results: 15
      }, { headers: getHeaders() });
      setGrants(res.data.grants || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to search grants.');
    } finally {
      setSearchingGrants(false);
    }
  };

  const handleGenerateProposal = async () => {
    if (!title.trim() || !coreIdea.trim()) {
      alert('Please provide a Research Title and Core Idea/Hypothesis.');
      return;
    }
    setGeneratingProposal(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/api/grants/generate-proposal`, {
        research_title: title,
        core_idea: coreIdea,
        target_funder_or_call: targetFunder,
        field_of_study: fieldOfStudy,
        duration_months: durationMonths,
        principal_investigator: piName || 'Lead Researcher',
        methodology_notes: methodNotes,
        expected_outcomes: expectedOutcomes,
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setGeneratedProposal(res.data.proposal);
      // Auto pre-populate budget title
      setBudgetTitle(title);
    } catch (err) {
      setError(err.response?.data?.error || 'Proposal generation failed.');
    } finally {
      setGeneratingProposal(false);
    }
  };

  const handleGenerateBudget = async () => {
    if (!budgetTitle.trim()) {
      alert('Please provide a Project Title for the budget.');
      return;
    }
    setGeneratingBudget(true);
    setError('');
    try {
      const res = await axios.post(`${API_BASE}/api/grants/generate-budget`, {
        project_title: budgetTitle,
        total_requested_usd: budgetAmount,
        duration_months: budgetDuration,
        personnel_count: personnelCount,
        includes_equipment: includeEquipment,
        includes_travel: includeTravel,
        funder_type: targetFunder,
        groq_api_key: groqApiKey
      }, { headers: getHeaders() });

      setGeneratedBudget(res.data.budget_breakdown);
    } catch (err) {
      setError(err.response?.data?.error || 'Budget generation failed.');
    } finally {
      setGeneratingBudget(false);
    }
  };

  const handleSaveProposal = async () => {
    try {
      await axios.post(`${API_BASE}/api/grants/proposals/save`, {
        title: title || budgetTitle || 'Untitled Grant Proposal',
        fieldOfStudy,
        coreIdea,
        targetFunder,
        durationMonths,
        requestedBudget: budgetAmount,
        proposalContent: generatedProposal,
        budgetBreakdown: generatedBudget,
        status: 'draft'
      }, { headers: getHeaders() });

      alert('Proposal and Budget saved successfully to your repository!');
      fetchSavedProposals();
    } catch (err) {
      alert('Failed to save proposal.');
    }
  };

  const fetchSavedProposals = async () => {
    setLoadingProposals(true);
    try {
      const res = await axios.get(`${API_BASE}/api/grants/proposals`, { headers: getHeaders() });
      setSavedProposals(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingProposals(false);
    }
  };

  return (
    <Layout>
      {/* Mobile Header */}
      <div className="md:hidden bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 px-4 pt-5 pb-4 text-white">
        <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-1">Academic &amp; Research</p>
        <h1 className="text-xl font-extrabold">🔬 Grants &amp; Scholarships</h1>
        <p className="text-purple-200 text-xs mt-0.5">PhD Finder · Supervisor Outreach · Proposal Studio</p>

        {/* Mobile Segmented Tabs */}
        <div className="segmented-control mt-4 bg-white/10">
          {[
            { id: 'crawler', label: '🌐 Sites' },
            { id: 'finder', label: '🔎 Grants' },
            { id: 'alignment', label: '🎯 Align' },
            { id: 'coldemail', label: '✉️ Email' },
            { id: 'writer', label: '✍️ Write' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id);
                if (t.id === 'crawler' && crawledScholarships.length === 0) handleCrawlScholarshipSites();
              }}
              className={activeTab === t.id ? 'active' : ''}
              style={activeTab === t.id ? { background: 'white', color: '#7c3aed' } : { color: '#c4b5fd' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-0 md:space-y-6">
        {/* Desktop Banner — hidden on mobile */}
        <div className="hidden md:block bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 text-xs font-semibold mb-2 border border-purple-400/30">
                Academic & Research Funding Engine
              </div>
              <h1 className="text-2xl font-bold tracking-tight">🔬 Grant Hunter & AI Proposal Studio</h1>
              <p className="text-purple-200 text-sm mt-1 max-w-2xl">
                Are you a lecturer or researcher with a great idea but no funding? Find suitable grants, turn raw concepts into fundable proposals, develop realistic project budgets, and align with funder priorities.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-black/30 p-1.5 rounded-xl border border-white/10">
              <button
                onClick={() => {
                  setActiveTab('crawler');
                  if (crawledScholarships.length === 0) handleCrawlScholarshipSites();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'crawler' ? 'bg-purple-600 text-white shadow' : 'text-purple-200 hover:text-white'
                }`}
              >
                <span>🌐</span> Real-Time Sites
              </button>
              <button
                onClick={() => setActiveTab('alignment')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'alignment' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-300 hover:text-white bg-emerald-500/10'
                }`}
              >
                <span>🎯</span> Candidate Alignment
              </button>
              <button
                onClick={() => setActiveTab('coldemail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                  activeTab === 'coldemail' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <span>✉️</span> Supervisor Outreach
              </button>
              <button
                onClick={() => setActiveTab('finder')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'finder' ? 'bg-purple-600 text-white shadow' : 'text-purple-200 hover:text-white'
                }`}
              >
                🔎 Grant Opportunities
              </button>
              <button
                onClick={() => setActiveTab('writer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'writer' ? 'bg-purple-600 text-white shadow' : 'text-purple-200 hover:text-white'
                }`}
              >
                ✍️ Proposal Writer
              </button>
              <button
                onClick={() => setActiveTab('budget')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'budget' ? 'bg-purple-600 text-white shadow' : 'text-purple-200 hover:text-white'
                }`}
              >
                💰 Budget & Justification
              </button>
              <button
                onClick={() => setActiveTab('saved')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'saved' ? 'bg-purple-600 text-white shadow' : 'text-purple-200 hover:text-white'
                }`}
              >
                📁 Saved ({savedProposals.length})
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex justify-between items-center">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 font-bold ml-4">✕</button>
          </div>
        )}

        {/* TAB 0: REAL-TIME SCHOLARSHIP SITES CRAWLER */}
        {activeTab === 'crawler' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🌐</span> Real-Time Target Sites Crawler (Adapter Architecture)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Live extraction across registered scholarship portals with polite throttling and heuristic normalization.
                  </p>
                </div>
                <button
                  onClick={handleCrawlScholarshipSites}
                  disabled={crawlingLive}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5 disabled:opacity-50"
                >
                  {crawlingLive ? 'Crawling Sites...' : '⚡ Run Real-Time Crawl'}
                </button>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Target Portal
                  </label>
                  <select
                    value={selectedSiteId}
                    onChange={(e) => setSelectedSiteId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="all">🌍 All Registered Portals ({crawlerSites.length})</option>
                    {crawlerSites.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.category})</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Country Filter
                  </label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="All">All Host Countries</option>
                    <option value="Canada">Canada</option>
                    <option value="USA">USA / United States</option>
                    <option value="United Kingdom">United Kingdom</option>
                    <option value="Germany">Germany</option>
                    <option value="Australia">Australia</option>
                    <option value="Netherlands">Netherlands</option>
                    <option value="Sweden">Sweden</option>
                    <option value="UAE">UAE</option>
                  </select>
                </div>

                <div className="sm:col-span-5 flex flex-wrap items-center gap-4 pt-4 sm:pt-6">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={onlyFullyFunded}
                      onChange={(e) => setOnlyFullyFunded(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Only Fully Funded</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={excludeExpired}
                      onChange={(e) => setExcludeExpired(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Active Only (Drop Expired)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={computerScienceOnly}
                      onChange={(e) => setComputerScienceOnly(e.target.checked)}
                      className="w-3.5 h-3.5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span>Tech / CS Only</span>
                  </label>
                </div>
              </div>

              {/* Registered Sites Pills */}
              <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className="text-[11px] font-bold text-slate-500">Configured in sites.config.js:</span>
                {crawlerSites.map(s => (
                  <a
                    key={s.id}
                    href={s.baseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2 py-0.5 rounded bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 text-[11px] font-medium transition-colors"
                  >
                    {s.name} ↗
                  </a>
                ))}
              </div>
            </div>

            {/* Crawled Results Grid */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">
                  Normalized Scholarship Opportunities ({crawledScholarships.length})
                </h3>
              </div>

              {crawlingLive ? (
                <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
                  <div className="animate-spin text-3xl mb-2">🔄</div>
                  <p className="text-xs font-semibold text-slate-600">
                    Crawling registered portals and extracting typed attributes (deadlines, benefits, funding status)...
                  </p>
                </div>
              ) : crawledScholarships.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500 text-xs">
                  No opportunities loaded. Click "Run Real-Time Crawl" to fetch live opportunities.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {crawledScholarships.map((item, idx) => {
                    const cardKey = item.id ? `${item.id}_${idx}` : `card_${idx}`;
                    return (
                    <div
                      key={cardKey}
                      className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-wrap gap-1.5">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                              {item.source}
                            </span>
                            {item.isFullyFunded && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                ✓ Fully Funded
                              </span>
                            )}
                            {item.isComputerScience && (
                              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                💻 CS / Tech Match
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 shrink-0">
                            <span>⏰</span>
                            <span>{item.deadline || item.rawDeadline}</span>
                          </div>
                        </div>

                        <h4 className="font-bold text-slate-900 text-sm mt-2.5 leading-snug line-clamp-2">
                          {item.title}
                        </h4>

                        <div className="mt-2 space-y-1 text-xs text-slate-600">
                          {item.university && (
                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                              <span>🏛️</span>
                              <span className="line-clamp-1">{item.university}</span>
                            </div>
                          )}

                          {item.matchedCountries && item.matchedCountries.length > 0 && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <span>📍</span>
                              <span className="truncate">Countries: {item.matchedCountries.join(', ')}</span>
                            </div>
                          )}

                          {item.supervisor && item.supervisor !== 'Not Stated' && (
                            <div className="flex items-center gap-1.5 text-slate-500">
                              <span>👤</span>
                              <span className="truncate">Supervisor: {item.supervisor}</span>
                            </div>
                          )}
                        </div>

                        {/* Benefits Badges */}
                        {item.benefits && item.benefits.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.benefits.map((b, bi) => (
                              <span key={bi} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-medium rounded-md border border-slate-200">
                                🎁 {b}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Inline Candidate Alignment & Match Section */}
                        {scholarshipAlignmentMap[cardKey]?.loading && (
                          <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-center gap-2 text-xs text-purple-700">
                            <span className="animate-spin">🔄</span>
                            <span className="font-semibold">Evaluating candidate resume & opportunity alignment...</span>
                          </div>
                        )}

                        {scholarshipAlignmentMap[cardKey]?.error && (
                          <div className="mt-3 p-2.5 bg-rose-50 rounded-lg border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
                            <span>⚠️ {scholarshipAlignmentMap[cardKey].error}</span>
                            <button
                              onClick={() => handleEvaluateItemAlignment(item, cardKey)}
                              className="px-2 py-0.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded text-[11px]"
                            >
                              Retry
                            </button>
                          </div>
                        )}

                        {scholarshipAlignmentMap[cardKey]?.result && (
                          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${
                                  scholarshipAlignmentMap[cardKey].result.matchScore >= 75
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : scholarshipAlignmentMap[cardKey].result.matchScore >= 50
                                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                                    : 'bg-rose-50 text-rose-800 border-rose-200'
                                }`}>
                                  {scholarshipAlignmentMap[cardKey].result.matchScore}% Match
                                </span>

                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  scholarshipAlignmentMap[cardKey].result.recommendation === 'Strong Apply'
                                    ? 'bg-emerald-600 text-white'
                                    : scholarshipAlignmentMap[cardKey].result.recommendation === 'Conditional Apply'
                                    ? 'bg-amber-500 text-white'
                                    : 'bg-rose-600 text-white'
                                }`}>
                                  {scholarshipAlignmentMap[cardKey].result.recommendation === 'Strong Apply' && '🚀 Proceed with Application'}
                                  {scholarshipAlignmentMap[cardKey].result.recommendation === 'Conditional Apply' && '⚡ Review Gaps & Proceed'}
                                  {scholarshipAlignmentMap[cardKey].result.recommendation === 'Do Not Apply' && '🔍 Keep Searching'}
                                </span>
                              </div>

                              <button
                                onClick={() => setActiveDetailItem({ item, analysis: scholarshipAlignmentMap[cardKey].result })}
                                className="text-[11px] font-bold text-purple-600 hover:text-purple-800 underline"
                              >
                                View Breakdown ↗
                              </button>
                            </div>

                            <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-2">
                              {scholarshipAlignmentMap[cardKey].result.recommendationRationale || scholarshipAlignmentMap[cardKey].result.matchScoreRationale}
                            </p>

                            {/* What You Have vs What You Need Preview */}
                            {scholarshipAlignmentMap[cardKey].result.candidateAssets && (
                              <div className="pt-1.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                                <div className="bg-emerald-50/70 p-2 rounded border border-emerald-100 text-emerald-900">
                                  <span className="font-bold block mb-0.5">✓ What You Have:</span>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {scholarshipAlignmentMap[cardKey].result.candidateAssets.whatCandidateHas?.slice(0, 2).map((h, hi) => (
                                      <li key={hi} className="truncate">{h}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="bg-amber-50/70 p-2 rounded border border-amber-100 text-amber-900">
                                  <span className="font-bold block mb-0.5">📋 What You Need:</span>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {scholarshipAlignmentMap[cardKey].result.candidateAssets.whatCandidateNeeds?.slice(0, 2).map((n, ni) => (
                                      <li key={ni} className="truncate">
                                        {n.item}
                                        {n.helpfulLink && (
                                          <a href={n.helpfulLink} target="_blank" rel="noreferrer" className="underline ml-1 text-blue-700">Get ↗</a>
                                        )}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}

                            {/* Outreach Actions */}
                            <div className="pt-2 flex flex-wrap gap-2">
                              <button
                                onClick={() => setActiveOutreachItem({
                                  item,
                                  analysis: scholarshipAlignmentMap[cardKey].result,
                                  type: 'email'
                                })}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors flex items-center gap-1"
                              >
                                <span>✉️</span> Draft Supervisor Email
                              </button>

                              <button
                                onClick={() => setActiveOutreachItem({
                                  item,
                                  analysis: scholarshipAlignmentMap[cardKey].result,
                                  type: 'proposal'
                                })}
                                className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors flex items-center gap-1"
                              >
                                <span>✍️</span> Draft Research Proposal
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                        >
                          Official Post ↗
                        </a>

                        <div className="flex items-center gap-2">
                          {!scholarshipAlignmentMap[cardKey]?.result && (
                            <button
                              onClick={() => handleEvaluateItemAlignment(item, cardKey)}
                              disabled={scholarshipAlignmentMap[cardKey]?.loading}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200 transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Evaluate match against your uploaded resume"
                            >
                              <span>🎯</span> Check Alignment
                            </button>
                          )}

                          <button
                            onClick={() => handleSaveScholarship(item)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-colors"
                          >
                            {savedScholarshipMap[item.id] ? '✓ Saved' : '+ Save'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );})}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB: CANDIDATE ALIGNMENT & ELIGIBILITY ENGINE */}
        {activeTab === 'alignment' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            {/* Input & Dual Ingestion Panel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>🎯</span> Dual-Input Opportunity Ingestion & Alignment Engine
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluates PhD funding status, checks CS/Tech eligibility vs hard discipline mismatches, calculates weighted match score, and formats an application roadmap.
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => setFitInputMode('url')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      fitInputMode === 'url' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔗 Direct URL
                  </button>
                  <button
                    onClick={() => setFitInputMode('text')}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                      fitInputMode === 'text' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    📝 Pasted Text (Fallback)
                  </button>
                </div>
              </div>

              {/* Scraper Guardrail / Warning Notification */}
              {fitError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start gap-2">
                  <span className="text-base">🛡️</span>
                  <div className="flex-1">
                    <span className="font-bold">Scraper Notice: </span>
                    <span>{fitError}</span>
                  </div>
                  <button onClick={() => setFitError('')} className="text-amber-600 font-bold hover:text-amber-900">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fitInputMode === 'url' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Opportunity URL (FindAPhD, University Portal, Lab Vacancy)
                    </label>
                    <input
                      type="url"
                      value={fitUrl}
                      onChange={(e) => setFitUrl(e.target.value)}
                      placeholder="https://www.findaphd.com/phds/project/..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Auto-ingests live DOM content. If the portal employs bot firewalls (HTTP 403), switch to Pasted Text.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Pasted Project Brief or Job Specification
                    </label>
                    <textarea
                      rows={4}
                      value={fitPastedText}
                      onChange={(e) => setFitPastedText(e.target.value)}
                      placeholder="Paste project description, funding eligibility criteria, requirements, and supervisor information..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Candidate Academic Profile & Technical Strengths
                  </label>
                  <textarea
                    rows={4}
                    value={fitCandidateProfile}
                    onChange={(e) => {
                      setFitCandidateProfile(e.target.value);
                      localStorage.setItem('user_academic_profile', e.target.value);
                    }}
                    placeholder="Candidate CV summary, core research skills, programming languages, previous publications or degree details..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Applicant Name</label>
                  <input
                    type="text"
                    value={fitCandidateName}
                    onChange={(e) => setFitCandidateName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Prospective PI / Supervisor (Optional)</label>
                  <input
                    type="text"
                    value={fitPiName}
                    onChange={(e) => setFitPiName(e.target.value)}
                    placeholder="e.g. Prof. Alan Smith"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => handleAnalyzeFit()}
                    disabled={analyzingFit}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {analyzingFit ? '⚡ Ingesting & Analyzing Fit...' : '🚀 Evaluate Alignment & Draft Outreach'}
                  </button>
                </div>
              </div>
            </div>

            {/* Analysis Results View */}
            {fitAnalysisResult && (
              <div className="space-y-5">
                {/* Tactical Verdict & Match Header */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                        Target Opportunity
                      </span>
                      <h3 className="text-lg font-bold text-slate-900">
                        {fitAnalysisResult.projectTitle}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        🏛️ {fitAnalysisResult.institution} • 📍 {fitAnalysisResult.location}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Weighted Match Score Gauge */}
                      <div
                        onClick={() => setActiveModalMetric('matchScore')}
                        className={`cursor-pointer px-4 py-2 rounded-xl text-center border transition-transform hover:scale-105 ${
                          fitAnalysisResult.matchScore >= 75
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : fitAnalysisResult.matchScore >= 50
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                        title="Click to view full match score explanation"
                      >
                        <div className="text-2xl font-black">{fitAnalysisResult.matchScore}%</div>
                        <div className="text-[10px] font-bold uppercase tracking-wider">Alignment Score ℹ️</div>
                      </div>

                      {/* Strategic Recommendation */}
                      <div
                        onClick={() => setActiveModalMetric('recommendation')}
                        className={`cursor-pointer px-4 py-2 rounded-xl text-center border transition-transform hover:scale-105 ${
                          fitAnalysisResult.recommendation === 'Strong Apply'
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                            : fitAnalysisResult.recommendation === 'Conditional Apply'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-md'
                            : 'bg-rose-600 text-white border-rose-700 shadow-md'
                        }`}
                        title="Click to view strategic recommendation breakdown"
                      >
                        <div className="text-xs font-bold uppercase tracking-wide">Verdict ℹ️</div>
                        <div className="text-sm font-black">{fitAnalysisResult.recommendation}</div>
                      </div>
                    </div>
                  </div>

                  {/* Degree & Discipline Validation Badges */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      onClick={() => setActiveModalMetric('phdEligible')}
                      className={`cursor-pointer p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                        fitAnalysisResult.phdEligible
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : 'bg-rose-50 border-rose-200 text-rose-900'
                      }`}
                    >
                      <span className="text-lg">{fitAnalysisResult.phdEligible ? '🎓' : '⚠️'}</span>
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>Degree Validation: {fitAnalysisResult.phdEligible ? 'PhD Funded' : 'Disqualified Level'}</span>
                          <span className="text-[10px] underline">Details ↗</span>
                        </div>
                        <p className="text-[11px] mt-0.5 line-clamp-2">{fitAnalysisResult.phdEligibilityDetails}</p>
                      </div>
                    </div>

                    <div
                      onClick={() => setActiveModalMetric('csEligible')}
                      className={`cursor-pointer p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-colors ${
                        fitAnalysisResult.csEligible
                          ? 'bg-blue-50 border-blue-200 text-blue-900'
                          : 'bg-amber-50 border-amber-200 text-amber-900'
                      }`}
                    >
                      <span className="text-lg">{fitAnalysisResult.csEligible ? '💻' : '🔬'}</span>
                      <div className="flex-1">
                        <div className="font-bold flex items-center justify-between">
                          <span>Discipline Fit: {fitAnalysisResult.csEligible ? 'CS / Tech Aligned' : 'Discipline Mismatch'}</span>
                          <span className="text-[10px] underline">Details ↗</span>
                        </div>
                        <p className="text-[11px] mt-0.5 line-clamp-2">{fitAnalysisResult.csEligibilityDetails}</p>
                      </div>
                    </div>
                  </div>

                  {/* Remuneration Badges */}
                  {fitAnalysisResult.benefits && fitAnalysisResult.benefits.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        💰 Funding & Remuneration Package:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {fitAnalysisResult.benefits.map((benefit, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-50 text-purple-800 text-xs font-semibold rounded-lg border border-purple-200 flex items-center gap-1.5 shadow-sm"
                          >
                            <span>✓</span> {benefit}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Application Roadmap & Grounded Resources */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>🗺️</span> Step-by-Step Application Pipeline
                    </h4>
                    <div className="space-y-2.5">
                      {fitAnalysisResult.applicationSteps?.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>

                    {/* Grounded Links */}
                    {fitAnalysisResult.groundedLinks && fitAnalysisResult.groundedLinks.length > 0 && (
                      <div className="pt-2 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                          🔗 Grounded Portals & Verified Directories:
                        </span>
                        <div className="space-y-1">
                          {fitAnalysisResult.groundedLinks.map((link, lidx) => (
                            <a
                              key={lidx}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:text-blue-800 underline block truncate"
                            >
                              ↗ {link.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Document Procurement Checklist */}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>📋</span> Document Procurement Checklist
                    </h4>
                    <div className="space-y-2">
                      {fitAnalysisResult.documentChecklist?.map((doc, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="text-emerald-600">📄</span>
                            <span>{doc.document}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">{doc.instructions}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Supervisor Cold Outreach Panel */}
                {fitAnalysisResult.emailDraft && (
                  <div className="bg-white p-6 rounded-xl border border-indigo-200 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                          <span>✉️</span> Supervisor Cold Outreach (Research Partner Framework)
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tailored cold outreach anchored on the PI's research problem space, avoiding generic applicant templates.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const fullEmail = fitAnalysisResult.emailDraft.fullEmailText ||
                            `${fitAnalysisResult.emailDraft.salutation}\n\n${fitAnalysisResult.emailDraft.opening}\n\n${fitAnalysisResult.emailDraft.alignment}\n\n${fitAnalysisResult.emailDraft.proposalSnippet}\n\n${fitAnalysisResult.emailDraft.callToAction}`;
                          navigator.clipboard.writeText(fullEmail);
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 2500);
                        }}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-1.5"
                      >
                        {copiedEmail ? '✓ Copied to Clipboard!' : '📋 Copy Outreach Email'}
                      </button>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs">
                        <span className="font-bold text-slate-700">Subject: </span>
                        <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          {fitAnalysisResult.emailDraft.subject}
                        </span>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed space-y-3">
                        {fitAnalysisResult.emailDraft.fullEmailText || (
                          <>
                            <p>{fitAnalysisResult.emailDraft.salutation}</p>
                            <p>{fitAnalysisResult.emailDraft.opening}</p>
                            <p>{fitAnalysisResult.emailDraft.alignment}</p>
                            <p>{fitAnalysisResult.emailDraft.proposalSnippet}</p>
                            <p>{fitAnalysisResult.emailDraft.callToAction}</p>
                            <p>Sincerely,<br />{fitCandidateName}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Whitelist Management Section */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <span>⚙️</span> Crawler Domain Whitelist Management
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Persisted in localStorage. Add or remove target aggregator domains you want the discovery tools to respect.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {whitelistedDomains.map((dom) => (
                  <span
                    key={dom}
                    className="px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md border border-slate-200 flex items-center gap-1.5"
                  >
                    <span>{dom}</span>
                    <button
                      onClick={() => handleRemoveDomain(dom)}
                      className="text-slate-400 hover:text-red-600 font-bold ml-1 text-xs"
                      title="Remove domain"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newDomainInput}
                  onChange={(e) => setNewDomainInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                  placeholder="e.g. jobs.ethz.ch or scholarship-positions.com"
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs flex-1 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <button
                  onClick={handleAddDomain}
                  className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                >
                  + Add Whitelist Domain
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: DEDICATED SUPERVISOR COLD OUTREACH BUILDER */}
        {activeTab === 'coldemail' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>✉️</span> Dedicated Supervisor Outreach Generator (Research Partner Framework)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Synthesize an email to prospective principal investigators (PIs). Anchored on a collaborative research-partner framework, bridging software engineering and systems design into the lab's technical bottlenecks.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Project Title or Research Topic</label>
                  <input
                    type="text"
                    value={coldEmailTitle}
                    onChange={(e) => setColdEmailTitle(e.target.value)}
                    placeholder="e.g. Distributed Consensus in Decentralized Storage Systems"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">University, Institute, or Research Lab</label>
                  <input
                    type="text"
                    value={coldEmailUni}
                    onChange={(e) => setColdEmailUni(e.target.value)}
                    placeholder="e.g. University of Edinburgh / Informatics Forum"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Supervisor / PI Name</label>
                  <input
                    type="text"
                    value={coldEmailPi}
                    onChange={(e) => setColdEmailPi(e.target.value)}
                    placeholder="e.g. Prof. Jane Doe"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Background Summary</label>
                  <input
                    type="text"
                    value={fitCandidateProfile}
                    onChange={(e) => setFitCandidateProfile(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Specific Problem Space / Lab Focus (Optional)</label>
                <textarea
                  rows={3}
                  value={coldEmailSummary}
                  onChange={(e) => setColdEmailSummary(e.target.value)}
                  placeholder="e.g. Focus on low-latency state replication, Byzantine fault tolerance, or AI models deployed to edge devices..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerateStandaloneColdEmail}
                  disabled={generatingColdEmail}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {generatingColdEmail ? '⚡ Synthesizing Research Partner Email...' : '✉️ Generate Personalized Cold Outreach'}
                </button>
              </div>
            </div>

            {/* Generated Cold Email Result */}
            {coldEmailResult && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-bold text-slate-900">Custom Research Partner Outreach Package</h4>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(coldEmailResult.emailBody);
                      setCopiedStandaloneEmail(true);
                      setTimeout(() => setCopiedStandaloneEmail(false), 2500);
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow"
                  >
                    {copiedStandaloneEmail ? '✓ Copied!' : '📋 Copy Email'}
                  </button>
                </div>

                {/* Subject Options */}
                {coldEmailResult.subjectLines && (
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Recommended Subject Line Variations:
                    </span>
                    <div className="space-y-1">
                      {coldEmailResult.subjectLines.map((subj, sidx) => (
                        <div
                          key={sidx}
                          onClick={() => {
                            navigator.clipboard.writeText(subj);
                            alert(`Subject copied: ${subj}`);
                          }}
                          className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 text-slate-800 text-xs font-mono rounded-lg border border-slate-200 cursor-pointer transition-colors"
                        >
                          📋 {subj}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Body */}
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Full Outreach Email Body:
                  </span>
                  <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {coldEmailResult.emailBody}
                  </div>
                </div>

                {/* Strategic Tips */}
                {coldEmailResult.strategicTips && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      💡 Strategic Sending & Follow-up Protocols:
                    </span>
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                      {coldEmailResult.strategicTips.map((tip, tidx) => (
                        <li key={tidx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* IN-CARD SCHOLARSHIP BREAKDOWN MODAL */}
        {activeDetailItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Opportunity Candidate Alignment Overview
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    {activeDetailItem.item.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeDetailItem.item.source} • {activeDetailItem.item.university || activeDetailItem.analysis.institution || 'Target Institution'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveDetailItem(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-base ml-2"
                >
                  ✕
                </button>
              </div>

              {/* Recommendation & Alignment Score */}
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Admissions Recommendation:
                  </span>
                  <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-black mt-1 ${
                    activeDetailItem.analysis.recommendation === 'Strong Apply'
                      ? 'bg-emerald-600 text-white'
                      : activeDetailItem.analysis.recommendation === 'Conditional Apply'
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-600 text-white'
                  }`}>
                    {activeDetailItem.analysis.recommendation === 'Strong Apply' && '🚀 Proceed with Application'}
                    {activeDetailItem.analysis.recommendation === 'Conditional Apply' && '⚡ Review Gaps & Proceed'}
                    {activeDetailItem.analysis.recommendation === 'Do Not Apply' && '🔍 Keep Searching'}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Match Alignment:
                  </span>
                  <span className="text-2xl font-black text-purple-700">
                    {activeDetailItem.analysis.matchScore}%
                  </span>
                </div>
              </div>

              {/* Strategic Tactical Verdict */}
              <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-800 block mb-1">🎯 Strategic Tactical Verdict:</span>
                <p>{activeDetailItem.analysis.recommendationRationale || activeDetailItem.analysis.matchScoreRationale}</p>
              </div>

              {/* ELI10 Metaphor / Plain Language Summary */}
              {activeDetailItem.analysis.eli10Summary && (
                <div className="p-3.5 bg-indigo-50/70 rounded-xl border border-indigo-200/80 text-xs">
                  <span className="font-bold text-indigo-900 block mb-1 flex items-center gap-1.5">
                    <span>💡</span> Explain Like I'm 10 (What You Will Build):
                  </span>
                  <p className="text-indigo-950 leading-relaxed italic">
                    "{activeDetailItem.analysis.eli10Summary}"
                  </p>
                </div>
              )}

              {/* Profile Alignment Breakdown */}
              {activeDetailItem.analysis.profileAlignment && activeDetailItem.analysis.profileAlignment.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    🔬 Candidate Alignment & Strategic Fit:
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {activeDetailItem.analysis.profileAlignment.map((align, ai) => (
                      <div key={ai} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                        <span className="font-bold text-slate-900 block text-[11px]">{align.title}</span>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">{align.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Funding & Benefits */}
              {activeDetailItem.analysis.benefits && activeDetailItem.analysis.benefits.length > 0 && (
                <div>
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    💰 Scholarship Benefits & Funding:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeDetailItem.analysis.benefits.map((b, bi) => (
                      <span key={bi} className="px-2.5 py-1 bg-purple-50 text-purple-800 text-[11px] font-semibold rounded-md border border-purple-200">
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* What Candidate Currently Has vs Needs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-2">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span>✓</span> What You Already Have (From CV):
                  </div>
                  <ul className="list-disc list-inside text-emerald-800 space-y-1 text-[11px]">
                    {activeDetailItem.analysis.candidateAssets?.whatCandidateHas?.map((has, hi) => (
                      <li key={hi} className="leading-snug">{has}</li>
                    )) || <li>Strong software systems and engineering background</li>}
                  </ul>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-2">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <span>📋</span> What You Still Need to Get:
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    {activeDetailItem.analysis.candidateAssets?.whatCandidateNeeds?.map((need, ni) => (
                      <div key={ni} className="bg-white/80 p-2 rounded border border-amber-200/60">
                        <div className="font-bold text-amber-950 flex items-center justify-between">
                          <span>{need.item}</span>
                          {need.helpfulLink && (
                            <a
                              href={need.helpfulLink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-700 hover:text-blue-900 underline font-semibold text-[10px]"
                            >
                              Get Resource ↗
                            </a>
                          )}
                        </div>
                        <p className="text-[10px] text-amber-800 mt-0.5">{need.howToGet || need.reason}</p>
                      </div>
                    )) || <div>All primary documents verified.</div>}
                  </div>
                </div>
              </div>

              {/* Action Pipeline Steps / How to Apply */}
              {(activeDetailItem.analysis.howToApply || activeDetailItem.analysis.applicationSteps) && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    🗺️ Action Roadmap & How to Apply:
                  </span>
                  <div className="space-y-1.5">
                    {(activeDetailItem.analysis.howToApply || activeDetailItem.analysis.applicationSteps.map((s, idx) => ({ step: `Step ${idx + 1}`, action: s }))).map((stepItem, si) => (
                      <div key={si} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start justify-between gap-2 text-slate-700">
                        <div className="flex items-start gap-2">
                          <span className="font-bold text-purple-700 shrink-0">{stepItem.step || `${si + 1}.`}</span>
                          <span className="text-[11px] leading-relaxed">{stepItem.action || stepItem}</span>
                        </div>
                        {stepItem.link && (
                          <a href={stepItem.link} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 underline shrink-0">
                            Apply Portal ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setLiveEmailDraft(null);
                      setLiveEmailError('');
                      setActiveOutreachItem({
                        item: activeDetailItem.item,
                        analysis: activeDetailItem.analysis,
                        type: 'email'
                      });
                      setActiveDetailItem(null);
                      // Trigger live email generation for this scholarship
                      handleComposeEmailLive(activeDetailItem.item, activeDetailItem.analysis);
                    }}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors"
                  >
                    ✉️ Compose Email
                  </button>
                  <button
                    onClick={() => {
                      setActiveOutreachItem({
                        item: activeDetailItem.item,
                        analysis: activeDetailItem.analysis,
                        type: 'proposal'
                      });
                      setActiveDetailItem(null);
                    }}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors"
                  >
                    ✍️ Open Proposal Draft
                  </button>
                </div>
                <button
                  onClick={() => setActiveDetailItem(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* IN-CARD OUTREACH / PROPOSAL MODAL */}
        {activeOutreachItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {activeOutreachItem.type === 'email' ? '✉️ Supervisor Cold Outreach' : '✍️ Tailored Research Proposal'}
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-0.5">
                    {activeOutreachItem.item.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: {activeOutreachItem.item.supervisor || 'Principal Investigator'} • {activeOutreachItem.item.university || 'Target Institution'}
                  </p>
                </div>
                <button
                  onClick={() => setActiveOutreachItem(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-base ml-2"
                >
                  ✕
                </button>
              </div>

              {activeOutreachItem.type === 'email' ? (
                <div className="space-y-3">
                  {/* Loading state */}
                  {liveEmailLoading && (
                    <div className="flex flex-col items-center justify-center py-8 gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <p className="text-sm text-slate-600 font-medium">Composing tailored email for <strong>{activeOutreachItem.item.title?.substring(0, 50)}</strong>...</p>
                      <p className="text-xs text-slate-400">Analysing project scope and generating a personalised outreach</p>
                    </div>
                  )}

                  {/* Error state */}
                  {liveEmailError && !liveEmailLoading && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      ⚠️ {liveEmailError}
                      <button
                        onClick={() => handleComposeEmailLive(activeOutreachItem.item, activeOutreachItem.analysis)}
                        className="ml-2 underline font-bold"
                      >Retry</button>
                    </div>
                  )}

                  {/* Live email result */}
                  {liveEmailDraft && !liveEmailLoading && (
                    <>
                      {/* Subject line options */}
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">Subject Line Options:</span>
                        <div className="space-y-1">
                          {(liveEmailDraft.subjectLines || []).map((subject, i) => (
                            <div
                              key={i}
                              className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-xs font-mono cursor-pointer hover:bg-purple-100 flex items-center justify-between group"
                              onClick={() => navigator.clipboard.writeText(subject)}
                            >
                              <span>{subject}</span>
                              <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2">click to copy</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Email body */}
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1">Email Body (Research Partner Tone):</span>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                          {liveEmailDraft.emailBody}
                        </div>
                      </div>

                      {/* Strategic tips */}
                      {liveEmailDraft.strategicTips && liveEmailDraft.strategicTips.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <span className="text-xs font-bold text-amber-800 block mb-1">💡 Sending Tips:</span>
                          <ul className="text-xs text-amber-700 space-y-0.5">
                            {liveEmailDraft.strategicTips.map((tip, i) => (
                              <li key={i}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}

                  {/* Fallback: show pre-stored draft if live email not yet loaded */}
                  {!liveEmailDraft && !liveEmailLoading && !liveEmailError && (
                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-1">Email Draft (pre-generated):</span>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-sans text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {activeOutreachItem.analysis.emailDraft?.fullEmailText || (
                          <>
                            <p>{activeOutreachItem.analysis.emailDraft?.salutation}</p>
                            <p>{activeOutreachItem.analysis.emailDraft?.opening}</p>
                            <p>{activeOutreachItem.analysis.emailDraft?.alignment}</p>
                            <p>{activeOutreachItem.analysis.emailDraft?.callToAction}</p>
                            <p>Sincerely,<br />{fitCandidateName}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-1">Proposed Project Title:</span>
                    <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold">
                      {activeOutreachItem.analysis.researchProposalDraft?.title || activeOutreachItem.item.title}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-2">
                    <div>
                      <span className="font-bold text-slate-800 block">Problem Context & Research Gap:</span>
                      <p className="text-slate-600 mt-0.5">
                        {activeOutreachItem.analysis.researchProposalDraft?.backgroundAndGap || 'Addresses computational and systems challenges in the project domain.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-800 block">Methodology & Technical Approach:</span>
                      <p className="text-slate-600 mt-0.5">
                        {activeOutreachItem.analysis.researchProposalDraft?.methodology || 'Employs scalable distributed algorithms, applied machine learning pipelines, and empirical benchmarking.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-slate-800 block">Anticipated Contributions:</span>
                      <p className="text-slate-600 mt-0.5">
                        {activeOutreachItem.analysis.researchProposalDraft?.expectedContributions || 'Publication-grade technical models and open-source systems components.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const textToCopy = activeOutreachItem.type === 'email'
                        ? (liveEmailDraft?.emailBody || activeOutreachItem.analysis.emailDraft?.fullEmailText || activeOutreachItem.analysis.emailDraft?.opening || '')
                        : `${activeOutreachItem.analysis.researchProposalDraft?.title}\n\n${activeOutreachItem.analysis.researchProposalDraft?.backgroundAndGap}\n\nMethodology:\n${activeOutreachItem.analysis.researchProposalDraft?.methodology}`;
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedModalText(true);
                      setTimeout(() => setCopiedModalText(false), 2000);
                    }}
                    disabled={activeOutreachItem.type === 'email' && liveEmailLoading}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow flex items-center gap-1.5"
                  >
                    {copiedModalText ? '✓ Copied!' : '📋 Copy to Clipboard'}
                  </button>
                  {activeOutreachItem.type === 'email' && !liveEmailLoading && (
                    <button
                      onClick={() => handleComposeEmailLive(activeOutreachItem.item, activeOutreachItem.analysis)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                    >
                      🔄 Regenerate
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setActiveOutreachItem(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: GRANT OPPORTUNITIES FINDER */}
        {activeTab === 'finder' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-800">🎯 Find Suitable Grant Opportunities</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Research / Topic</label>
                  <input
                    type="text"
                    value={fieldOfResearch}
                    onChange={(e) => setFieldOfResearch(e.target.value)}
                    placeholder="e.g. Bio-nanotechnology, Renewable Energy, Public Policy"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Career Stage / Role</label>
                  <select
                    value={careerStage}
                    onChange={(e) => setCareerStage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Postdoctoral / Early Career">Postdoc / Early Career</option>
                    <option value="Early to Mid-Career / Faculty">Lecturer / Mid-Career Faculty</option>
                    <option value="Senior Investigator / Professor">Senior Professor / Chair</option>
                    <option value="Independent Researcher">Independent Researcher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Geographic Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="Global">Global / International</option>
                    <option value="United States / NIH / NSF">United States (NIH / NSF)</option>
                    <option value="Europe / Horizon / ERC">Europe (Horizon / ERC)</option>
                    <option value="United Kingdom / UKRI">United Kingdom (UKRI / Wellcome)</option>
                    <option value="Africa / Developing Regions">Africa & Developing Regions</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSearchGrants}
                  disabled={searchingGrants}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow transition-all flex items-center gap-2"
                >
                  {searchingGrants ? '⚡ Scanning Global Funding Portals...' : '🔍 Search Active Grant Calls'}
                </button>
              </div>
            </div>

            {/* Grant Results */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-700">Found {grants.length} Funding Opportunities</h3>
              </div>

              {grants.length === 0 && !searchingGrants && (
                <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                  <span className="text-3xl block mb-2">🏛️</span>
                  No grants searched yet. Select your discipline and click "Search Active Grant Calls" above.
                </div>
              )}

              {grants.map((grant) => (
                <div key={grant.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{grant.title}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                        <span className="font-semibold text-purple-700">{grant.funder}</span>
                        <span>•</span>
                        <span>📍 {grant.region}</span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                          🟢 Active (2026/2027)
                        </span>
                        <span>•</span>
                        <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          {grant.deadline || 'Accepting Applications'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setTargetFunder(grant.funder);
                          setTitle(`Proposal targeting ${grant.funder}: ${grant.title.substring(0, 45)}...`);
                          setActiveTab('writer');
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        ✍️ Draft Proposal For This
                      </button>
                      <a
                        href={grant.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Portal ↗
                      </a>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3">{grant.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: PROPOSAL WRITER */}
        {activeTab === 'writer' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">✍️ Turn Your Research Idea Into A Fundable Proposal</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Synthesizes your preliminary ideas into an international-standard proposal with Problem Statement, Specific Aims, Work Packages (WPs), Risk Contingencies, and Funder Alignment.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Next-Generation Multimodal Diagnostic AI for Rural Healthcare"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Funder / Funding Call</label>
                  <input
                    type="text"
                    value={targetFunder}
                    onChange={(e) => setTargetFunder(e.target.value)}
                    placeholder="e.g. Wellcome Trust Early-Career Award, Horizon Europe Cluster 1"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Field of Study</label>
                  <input
                    type="text"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Biomedical Engineering & Machine Learning"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration & Principal Investigator</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={durationMonths}
                      onChange={(e) => setDurationMonths(Number(e.target.value))}
                      placeholder="Months"
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={piName}
                      onChange={(e) => setPiName(e.target.value)}
                      placeholder="PI Full Name & Title (e.g. Dr. Jane Doe)"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Core Research Idea, Novelty & Hypothesis <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={coreIdea}
                  onChange={(e) => setCoreIdea(e.target.value)}
                  rows={4}
                  placeholder="Describe what question your research answers, why existing approaches fail, and what novel breakthrough you are proposing..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Preliminary Methodology Notes</label>
                  <textarea
                    value={methodNotes}
                    onChange={(e) => setMethodNotes(e.target.value)}
                    rows={3}
                    placeholder="Data sources, models, clinical trials, hardware architectures, experimental protocols..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Targeted Impact & Deliverables</label>
                  <textarea
                    value={expectedOutcomes}
                    onChange={(e) => setExpectedOutcomes(e.target.value)}
                    rows={3}
                    placeholder="Publications in Nature/IEEE, open-source software, patent disclosures, clinical guidelines..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerateProposal}
                  disabled={generatingProposal}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow transition-all flex items-center gap-2"
                >
                  {generatingProposal ? '⚡ Synthesizing Complete Academic Proposal...' : '🚀 Generate Complete Proposal'}
                </button>
              </div>
            </div>

            {/* Generated Proposal Output */}
            {generatedProposal && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-base font-bold text-slate-900">Generated Research Proposal</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedProposal);
                        alert('Proposal copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      📋 Copy Markdown
                    </button>
                    <button
                      onClick={handleSaveProposal}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                    >
                      💾 Save to Repository
                    </button>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none bg-slate-50 p-5 rounded-lg border border-slate-200 font-sans text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {generatedProposal}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: BUDGET BUILDER & JUSTIFICATION */}
        {activeTab === 'budget' && (
          <div className="space-y-4 px-4 md:px-0 pt-4 md:pt-0">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">💰 Develop Realistic Project Budgets & Justifications</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Generates an audit-ready line-item breakdown (Personnel, Equipment, Operating Costs, Indirect F&A) and bulletproof justification text tailored to review panels.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project Title</label>
                  <input
                    type="text"
                    value={budgetTitle}
                    onChange={(e) => setBudgetTitle(e.target.value)}
                    placeholder="Project Title"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Total Requested Budget ($ USD)</label>
                  <input
                    type="number"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Duration & Team Size</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={budgetDuration}
                      onChange={(e) => setBudgetDuration(Number(e.target.value))}
                      placeholder="Months"
                      className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={personnelCount}
                      onChange={(e) => setPersonnelCount(Number(e.target.value))}
                      placeholder="Personnel"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeEquipment}
                    onChange={(e) => setIncludeEquipment(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  Includes Dedicated Capital / Cloud Computing Equipment
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTravel}
                    onChange={(e) => setIncludeTravel(e.target.checked)}
                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  Includes Fieldwork & Conference Travel Dissemination
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerateBudget}
                  disabled={generatingBudget}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-semibold shadow transition-all flex items-center gap-2"
                >
                  {generatingBudget ? '⚡ Calculating & Justifying Breakdown...' : '📊 Generate Budget Breakdown & Justification'}
                </button>
              </div>
            </div>

            {/* Generated Budget Output */}
            {generatedBudget && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="text-base font-bold text-slate-900">Itemized Budget & Review Justification</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedBudget);
                        alert('Budget breakdown copied to clipboard!');
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                    >
                      📋 Copy Markdown
                    </button>
                    <button
                      onClick={handleSaveProposal}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold"
                    >
                      💾 Save Package
                    </button>
                  </div>
                </div>

                <div className="prose prose-sm max-w-none bg-slate-50 p-5 rounded-lg border border-slate-200 font-sans text-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                  {generatedBudget}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SAVED PROPOSALS */}
        {activeTab === 'saved' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">📁 Your Grant Proposals Repository</h3>
              {savedProposals.length > 0 && (
                <button
                  onClick={async () => {
                    if (window.confirm('Clear all saved grant proposals from your repository?')) {
                      await axios.delete(`${API_BASE}/api/grants/proposals/clear`, { headers: getHeaders() });
                      fetchSavedProposals();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  🗑️ Clear All Proposals
                </button>
              )}
            </div>
            {savedProposals.length === 0 && !loadingProposals && (
              <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                <span className="text-3xl block mb-2">📄</span>
                No saved proposals yet. Generate a proposal or budget and click "Save to Repository".
              </div>
            )}

            {savedProposals.map((item) => (
              <div key={item._id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">{item.title}</h4>
                    <p className="text-xs text-slate-500">
                      Target Funder: <span className="font-semibold text-purple-700">{item.targetFunder}</span> • Budget: ${item.requestedBudget?.toLocaleString()} USD • {item.durationMonths} Months
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    {item.status}
                  </span>
                </div>

                {item.proposalContent && (
                  <div className="text-xs text-slate-700 line-clamp-3 bg-slate-50 p-3 rounded-lg font-mono">
                    {item.proposalContent.substring(0, 300)}...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}


