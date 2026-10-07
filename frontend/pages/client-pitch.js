import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function ClientPitchPage() {
  const [activeTab, setActiveTab] = useState('scout'); // 'scout' | 'leads' | 'settings'

  // Scout Search Form States
  const [channel, setChannel] = useState('yellowpages_directory');
  const [keyword, setKeyword] = useState('plumber');
  const [location, setLocation] = useState('Austin, TX');
  const [apiKey, setApiKey] = useState('');
  const [dateString, setDateString] = useState('');

  // Results & Loading States
  const [searching, setSearching] = useState(false);
  const [discoveredLeads, setDiscoveredLeads] = useState([]);
  const [savedLeads, setSavedLeads] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pitch Generation Modal State
  const [activePitchLead, setActivePitchLead] = useState(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [pitchResult, setPitchResult] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Optional custom Groq key
  const [groqApiKey, setGroqApiKey] = useState('');

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('user_groq_api_key');
    if (savedKey) setGroqApiKey(savedKey);

    const savedPlacesKey = localStorage.getItem('user_places_api_key');
    if (savedPlacesKey && channel === 'google_places') setApiKey(savedPlacesKey);

    fetchSavedLeads();
  }, []);

  const fetchSavedLeads = async () => {
    setLoadingSaved(true);
    try {
      const res = await axios.get(`${API_BASE}/api/client-pitch/saved`, { headers: getHeaders() });
      setSavedLeads(res.data?.leads || []);
    } catch (err) {
      console.warn('Could not fetch saved leads:', err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleDiscoverLeads = async (e) => {
    if (e) e.preventDefault();
    setSearching(true);
    setError('');
    setSuccess('');
    setDiscoveredLeads([]);

    try {
      const res = await axios.post(`${API_BASE}/api/client-pitch/discover`, {
        channel,
        keyword,
        location,
        apiKey: apiKey.trim(),
        dateString: dateString.trim()
      }, { headers: getHeaders() });

      if (res.data?.success) {
        setDiscoveredLeads(res.data.leads || []);
        if (res.data.leads?.length === 0) {
          setError('No businesses without websites found for this query. Try a different niche or location.');
        } else {
          setSuccess(`Found ${res.data.leads.length} high-intent business leads without websites!`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to discover client leads. Please verify parameters or API key.');
    } finally {
      setSearching(false);
    }
  };

  const handleGeneratePitch = async (lead) => {
    setActivePitchLead(lead);
    setGeneratingPitch(true);
    setPitchResult(null);

    try {
      const res = await axios.post(`${API_BASE}/api/client-pitch/generate-pitch`, {
        businessName: lead.businessName,
        location: lead.address || location,
        serviceNiche: keyword,
        websiteStatus: lead.websiteStatus,
        domain: lead.domain,
        ownerName: lead.businessName,
        groqApiKey: groqApiKey.trim()
      }, { headers: getHeaders() });

      if (res.data?.success) {
        setPitchResult(res.data.pitch);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate proposal pitch.');
    } finally {
      setGeneratingPitch(false);
    }
  };

  const handleSaveLead = async (lead, customPitch = null) => {
    try {
      const leadPayload = {
        ...lead,
        pitchDeck: customPitch || lead.pitchDeck || {}
      };

      const res = await axios.post(`${API_BASE}/api/client-pitch/save`, {
        leadData: leadPayload
      }, { headers: getHeaders() });

      if (res.data?.success) {
        setSavedLeads(prev => {
          const filtered = prev.filter(l => l.businessName !== lead.businessName);
          return [res.data.lead, ...filtered];
        });
        alert(`Saved ${lead.businessName} to your pipeline!`);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save lead.');
    }
  };

  const handleDeleteSavedLead = async (id) => {
    if (!window.confirm('Remove this lead from your saved pipeline?')) return;
    try {
      await axios.delete(`${API_BASE}/api/client-pitch/delete/${id}`, { headers: getHeaders() });
      setSavedLeads(prev => prev.filter(l => l._id !== id));
    } catch (err) {
      alert('Failed to remove lead.');
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <Layout>
      <div className="space-y-6 px-4 sm:px-0 pt-3 md:pt-0">
        
        {/* Header Hero Section */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🚀</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-cyan-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  B2B Client Outreach &amp; Lead Engine
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Pitch Web Development to Businesses
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Scan Google Places, YellowPages, Outscraper B2B, Facebook Pages, and Fresh Domains for businesses missing websites. Automatically generate irresistible, high-converting cold pitches and demo proposals.
              </p>
            </div>

            {/* Quick Segmented Nav */}
            <div className="flex items-center bg-white/10 p-1 rounded-xl backdrop-blur-sm border border-white/10 shrink-0">
              <button
                onClick={() => setActiveTab('scout')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'scout' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>🔍</span> Scout Leads
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeTab === 'leads' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>📁</span> Saved Pipeline ({savedLeads.length})
              </button>
            </div>
          </div>
        </div>

        {/* TAB 1: SCOUT CLIENT LEADS */}
        {activeTab === 'scout' && (
          <div className="space-y-6">
            
            {/* Search Configuration Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>🎯</span> Lead Acquisition Channels
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select your discovery engine. YellowPages operates 100% free with no API keys. Places, Outscraper, Facebook, and Whois allow deep specialized scraping.
                </p>
              </div>

              {/* 5-Method Channel Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2.5">
                {[
                  {
                    id: 'yellowpages_directory',
                    label: 'Local Directory',
                    sub: 'YellowPages (100% Free)',
                    icon: '📖',
                    badge: 'No API Key Needed'
                  },
                  {
                    id: 'google_places',
                    label: 'Google Places (New)',
                    sub: 'Missing websiteUri',
                    icon: '📍',
                    badge: 'Google Maps'
                  },
                  {
                    id: 'outscraper_b2b',
                    label: 'Outscraper B2B',
                    sub: 'Maps + Emails in 1 Call',
                    icon: '⚡',
                    badge: 'Contact Scraper'
                  },
                  {
                    id: 'facebook_pages',
                    label: 'Facebook Pages',
                    sub: 'Via Serverless Apify',
                    icon: '👥',
                    badge: 'Social Leads'
                  },
                  {
                    id: 'whois_new_domains',
                    label: 'Newly Registered',
                    sub: 'WhoisXML 24h Feed',
                    icon: '🌐',
                    badge: 'Pre-Launch Leads'
                  }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setChannel(m.id);
                      if (m.id === 'whois_new_domains' && !dateString) {
                        setDateString(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      channel === m.id
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-xl">{m.icon}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {m.badge}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-slate-800">{m.label}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">{m.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic Search Parameters Form */}
              <form onSubmit={handleDiscoverLeads} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                {channel !== 'whois_new_domains' ? (
                  <>
                    <div className="md:col-span-5">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Business Industry or Service Niche <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Plumber, Roofer, Dental Clinic, Electrician, Auto Repair..."
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Target Location / City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Dallas, TX, London, UK, Miami, FL, Chicago, IL..."
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-9">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Registration Date (YYYY-MM-DD) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dateString}
                      onChange={(e) => setDateString(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                      required
                    />
                  </div>
                )}

                {/* API Key input for non-YellowPages channels */}
                {channel !== 'yellowpages_directory' && (
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {channel === 'google_places' && 'Google Places API Key'}
                      {channel === 'outscraper_b2b' && 'Outscraper API Key'}
                      {channel === 'facebook_pages' && 'Apify API Token'}
                      {channel === 'whois_new_domains' && 'WhoisXML API Key'}
                    </label>
                    <input
                      type="password"
                      placeholder="Optional or Custom Key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                    />
                  </div>
                )}

                <div className="md:col-span-12 mt-1">
                  <button
                    type="submit"
                    disabled={searching}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm min-h-[44px]"
                  >
                    {searching ? (
                      <>
                        <span className="animate-spin text-base">⚡</span>
                        <span>Scanning Businesses Lacking Active Websites...</span>
                      </>
                    ) : (
                      <span>🔍 Run Opportunity Scan for Unwebbed Businesses</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Error / Success Notifications */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex justify-between items-center">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} className="text-red-500 font-bold ml-2">✕</button>
              </div>
            )}
            {success && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex justify-between items-center">
                <span>✓ {success}</span>
                <button onClick={() => setSuccess('')} className="text-emerald-500 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Discovered Leads List */}
            {discoveredLeads.length > 0 && (
              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    Discovered Potential Clients ({discoveredLeads.length})
                  </h3>
                  <span className="text-xs text-slate-500">
                    Channel: <span className="font-semibold text-slate-700">{channel.replace(/_/g, ' ').toUpperCase()}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {discoveredLeads.map((lead, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all shadow-sm space-y-3"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                            <span>🚫</span> No Website Found
                          </span>
                          <span className="text-xs font-medium text-slate-500">
                            {lead.sourceChannel.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <h4 className="font-bold text-slate-900 text-base leading-snug">
                          {lead.businessName}
                        </h4>
                        
                        {lead.address && (
                          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                            <span>📍</span> <span>{lead.address}</span>
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Phone</span>
                            <p className="font-semibold text-slate-700">
                              {lead.phone || 'Not listed'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Email</span>
                            <p className="font-semibold text-slate-700 truncate">
                              {lead.email || 'Needs Contact Discovery'}
                            </p>
                          </div>
                        </div>

                        {lead.domain && (
                          <div className="mt-2 text-xs bg-slate-50 p-2 rounded-lg text-slate-600 font-mono">
                            Domain: {lead.domain}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleGeneratePitch(lead)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition shadow-sm flex items-center justify-center gap-1"
                        >
                          <span>✍️</span> Generate Website Pitch
                        </button>
                        <button
                          onClick={() => handleSaveLead(lead)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-xl transition"
                          title="Save to pipeline"
                        >
                          💾 Save
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: SAVED LEADS PIPELINE */}
        {activeTab === 'leads' && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  📁 Client Outreach Pipeline ({savedLeads.length})
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Track client communications, review custom pitch proposals, and manage deal progression.
                </p>
              </div>
            </div>

            {loadingSaved ? (
              <div className="p-8 text-center text-xs text-slate-500">Loading your saved pipeline...</div>
            ) : savedLeads.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl">
                No saved business leads in your repository yet. Run a scout search above and click "Save".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedLeads.map((lead) => (
                  <div key={lead._id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white hover:border-blue-200 transition">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-slate-900">{lead.businessName}</h3>
                        <p className="text-xs text-slate-500">{lead.address}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {lead.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      {lead.phone && <div>📞 <strong>Phone:</strong> {lead.phone}</div>}
                      {lead.email && <div>📧 <strong>Email:</strong> {lead.email}</div>}
                      {lead.domain && <div>🌐 <strong>Domain:</strong> {lead.domain}</div>}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleGeneratePitch(lead)}
                        className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                      >
                        📄 Open / Regenerate Pitch
                      </button>
                      <button
                        onClick={() => handleDeleteSavedLead(lead._id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                      >
                        ✕ Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PITCH PROPOSAL MODAL */}
        {activePitchLead && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-5 sm:p-6 space-y-5 border border-slate-200 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                    High-Converting Website Development Pitch
                  </span>
                  <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl mt-1">
                    {activePitchLead.businessName}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Target Niche: {keyword} &bull; Location: {activePitchLead.address || location}
                  </p>
                </div>
                <button
                  onClick={() => setActivePitchLead(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm transition"
                >
                  ✕
                </button>
              </div>

              {generatingPitch ? (
                <div className="py-12 text-center space-y-3">
                  <span className="animate-spin text-3xl inline-block">⚡</span>
                  <p className="text-sm font-semibold text-slate-700">
                    Crafting personalized cold email pitch and ROI justification...
                  </p>
                </div>
              ) : pitchResult ? (
                <div className="space-y-4">
                  
                  {/* Elevator Pitch Box */}
                  <div className="bg-blue-50/70 border border-blue-200/80 p-3.5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900">
                      💡 Core Opportunity Angle
                    </span>
                    <p className="text-xs text-blue-900 font-medium leading-relaxed">
                      {pitchResult.elevatorPitch}
                    </p>
                  </div>

                  {/* Subject Lines */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Suggested Cold Subject Lines
                      </h4>
                    </div>
                    <div className="space-y-1">
                      {pitchResult.subjectLines?.map((subj, sIdx) => (
                        <div
                          key={sIdx}
                          onClick={() => copyToClipboard(subj, `subj_${sIdx}`)}
                          className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2 rounded-lg text-xs font-medium text-slate-800 cursor-pointer flex justify-between items-center transition"
                        >
                          <span>{subj}</span>
                          <span className="text-[10px] text-blue-600 font-bold">
                            {copiedKey === `subj_${sIdx}` ? '✓ Copied' : 'Copy'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cold Email Body */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Tailored Cold Email Body
                      </h4>
                      <button
                        onClick={() => copyToClipboard(pitchResult.emailBody, 'email_body')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        {copiedKey === 'email_body' ? '✓ Copied Full Email!' : '📋 Copy Email'}
                      </button>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed font-sans">
                      {pitchResult.emailBody}
                    </div>
                  </div>

                  {/* Suggested Packages */}
                  {pitchResult.suggestedPackages && (
                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Recommended Service Packages
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {pitchResult.suggestedPackages.map((pkg, pIdx) => (
                          <div key={pIdx} className="border border-slate-200 p-3 rounded-xl bg-slate-50 text-xs space-y-1">
                            <div className="flex justify-between items-center font-bold text-slate-900">
                              <span>{pkg.tier}</span>
                              <span className="text-emerald-700">{pkg.priceRange}</span>
                            </div>
                            <p className="text-[11px] text-slate-600">{pkg.deliverables}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Objection Handling */}
                  {pitchResult.objectionHandlers && (
                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Common Objection &amp; Rebuttal
                      </h4>
                      {pitchResult.objectionHandlers.map((obj, oIdx) => (
                        <div key={oIdx} className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-xl text-xs space-y-1">
                          <p className="font-semibold text-amber-900">Client: &ldquo;{obj.objection}&rdquo;</p>
                          <p className="text-amber-800 text-[11px]">Your Response: {obj.rebuttal}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 flex justify-between items-center border-t border-slate-100">
                    <button
                      onClick={() => handleSaveLead(activePitchLead, pitchResult)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-xl text-xs transition shadow-sm"
                    >
                      💾 Save Lead &amp; Pitch to Pipeline
                    </button>
                    <button
                      onClick={() => setActivePitchLead(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
                    >
                      Close
                    </button>
                  </div>

                </div>
              ) : null}

            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
