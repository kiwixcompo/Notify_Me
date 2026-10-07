import { useState, useEffect } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function ClientPitchPage() {
  const [activeTab, setActiveTab] = useState('scout'); // 'scout' | 'leads'

  // Scout Search Form States
  const [channel, setChannel] = useState('directory_free');
  const [keyword, setKeyword] = useState('plumber');
  const [location, setLocation] = useState('Dallas, TX');
  const [apiKey, setApiKey] = useState('');

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
        keyword: keyword.trim(),
        location: location.trim(),
        apiKey: apiKey.trim()
      }, { headers: getHeaders() });

      if (res.data?.success) {
        setDiscoveredLeads(res.data.leads || []);
        if (res.data.leads?.length === 0) {
          setError('No unwebbed businesses found for this specific query. Try a broader service category or nearby city.');
        } else {
          setSuccess(`Discovered ${res.data.leads.length} verified businesses without websites!`);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to discover client leads. Please try another query.');
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
                <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-400 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                  100% Free • Zero API Keys • Unrestricted
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Pitch Web Development to Businesses
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
                Discover active local businesses operating without websites. Automatically extracts phone numbers, emails, verifies business legitimacy, and crafts instant high-converting pitches.
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
                <span>🔍</span> Free Scout
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
                  <span>🎯</span> Free Lead Discovery Engines
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select a zero-cost discovery channel. All searches operate 100% free with contact extraction &amp; legitimacy verification.
                </p>
              </div>

              {/* 100% Free Channel Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    id: 'directory_free',
                    label: 'Local Directory & Map Scout',
                    sub: 'YellowPages & Local Registries',
                    icon: '🗺️',
                    badge: '100% Free • Zero Key'
                  },
                  {
                    id: 'social_free',
                    label: 'Social-Only Businesses',
                    sub: 'Facebook & Instagram Only',
                    icon: '📱',
                    badge: '100% Free • Zero Key'
                  },
                  {
                    id: 'parked_domains_free',
                    label: 'Unlaunched & Parked Domains',
                    sub: 'Pre-Launch Website Pitches',
                    icon: '🌐',
                    badge: '100% Free • Zero Key'
                  }
                ].map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChannel(m.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      channel === m.id
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span className="text-2xl">{m.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          {m.badge}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800">{m.label}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{m.sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic Search Parameters Form */}
              <form onSubmit={handleDiscoverLeads} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                <div className={channel === 'parked_domains_free' ? 'md:col-span-12' : 'md:col-span-7'}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Industry / Service Niche <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Plumber, Roofing, Dentist Clinic, Auto Repair, Electrician..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[44px]"
                    required
                  />
                </div>

                {channel !== 'parked_domains_free' && (
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Target City / Location <span className="text-red-500">*</span>
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
                        <span>Discovering &amp; Verifying Businesses Lacking Websites...</span>
                      </>
                    ) : (
                      <span>🔍 Run Free Opportunity Discovery (Zero API Keys)</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex justify-between items-center">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')} className="text-red-500 font-bold ml-2">✕</button>
              </div>
            )}

            {/* Success Message */}
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
                    Discovered Businesses ({discoveredLeads.length})
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

                          {lead.verification?.isLegitimate ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <span>✓</span> Verified Legit ({lead.verification.confidenceScore}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                              Listing ({lead.verification?.confidenceScore || 40}%)
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-slate-900 text-base leading-snug">
                          {lead.businessName}
                        </h4>
                        
                        {lead.address && (
                          <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                            <span className="shrink-0 mt-0.5">📍</span> <span className="line-clamp-2">{lead.address}</span>
                          </p>
                        )}

                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Phone</span>
                            <p className="font-semibold text-slate-700">
                              {lead.phone || 'Scout on file'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400">Email</span>
                            <p className="font-semibold text-slate-700 truncate">
                              {lead.email || 'Direct Phone Outreach'}
                            </p>
                          </div>
                        </div>

                        {lead.verification?.checks?.activitySignals && (
                          <div className="mt-2 text-[11px] bg-slate-50 px-2 py-1 rounded text-slate-600 flex items-center gap-1">
                            <span>⭐</span> <span>{lead.verification.checks.activitySignals}</span>
                          </div>
                        )}

                        {lead.domain && (
                          <div className="mt-2 text-xs bg-blue-50/60 p-2 rounded-lg text-blue-800 font-mono text-[11px] truncate">
                            Domain / Social: {lead.domain}
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
              <button
                onClick={fetchSavedLeads}
                disabled={loadingSaved}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1.5 rounded-lg"
              >
                {loadingSaved ? 'Refreshing...' : '↻ Refresh'}
              </button>
            </div>

            {savedLeads.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <span className="text-3xl block mb-2">📭</span>
                <p className="text-sm font-medium">No saved leads in your pipeline yet.</p>
                <p className="text-xs mt-1">Discover businesses lacking websites in the Scout tab and save them here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedLeads.map((item) => (
                  <div
                    key={item._id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {item.status || 'discovered'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(item.updatedAt || item.firstSeen).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-sm">{item.businessName}</h3>
                      <p className="text-xs text-slate-500">{item.address || 'Address on record'}</p>
                      
                      <div className="text-xs mt-2 text-slate-600 space-y-0.5">
                        {item.phone && <div>📞 {item.phone}</div>}
                        {item.email && <div>✉️ {item.email}</div>}
                      </div>

                      {item.pitchDeck?.subject && (
                        <div className="mt-3 bg-white p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">Saved Pitch</span>
                          <p className="font-semibold text-slate-800 text-[11px] truncate">
                            {item.pitchDeck.subject}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <button
                        onClick={() => handleGeneratePitch(item)}
                        className="flex-1 bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 text-xs font-semibold py-1.5 px-3 rounded-lg transition"
                      >
                        ✍️ Pitch Deck
                      </button>
                      <button
                        onClick={() => handleDeleteSavedLead(item._id)}
                        className="text-red-500 hover:text-red-700 text-xs p-1.5"
                        title="Delete lead"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: HIGH-CONVERTING PITCH PROPOSAL */}
        {activePitchLead && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
              
              {/* Modal Header */}
              <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 p-5 flex justify-between items-center z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎯</span>
                    <h3 className="font-bold text-slate-900 text-base">
                      Website Proposal Pitch: {activePitchLead.businessName}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Targeted cold outreach proposal, service packages, and objection rebuttals.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActivePitchLead(null);
                    setPitchResult(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-xl font-bold px-2 py-1"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {generatingPitch ? (
                  <div className="py-16 text-center space-y-3">
                    <div className="inline-block animate-spin text-3xl">✨</div>
                    <p className="text-sm font-semibold text-slate-700">
                      Crafting tailored, high-converting website pitch...
                    </p>
                    <p className="text-xs text-slate-400">
                      Analyzing local service competitors, pricing models, and mobile value propositions
                    </p>
                  </div>
                ) : pitchResult ? (
                  <div className="space-y-6">

                    {/* Subject Line Variations */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Suggested Email Subject Lines
                      </h4>
                      <div className="space-y-1.5">
                        {(pitchResult.subjectLines || []).map((sub, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center bg-slate-50 hover:bg-slate-100 border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-800 transition"
                          >
                            <span className="font-medium truncate mr-2">{sub}</span>
                            <button
                              onClick={() => copyToClipboard(sub, `subj-${i}`)}
                              className="text-blue-600 hover:text-blue-800 text-[11px] font-bold shrink-0"
                            >
                              {copiedKey === `subj-${i}` ? '✓ Copied' : 'Copy'}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cold Outreach Email Body */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Personalized Cold Outreach Pitch
                        </h4>
                        <button
                          onClick={() => copyToClipboard(pitchResult.emailBody, 'body')}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg"
                        >
                          {copiedKey === 'body' ? '✓ Copied Email' : '📋 Copy Entire Pitch'}
                        </button>
                      </div>
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-700 font-sans whitespace-pre-wrap leading-relaxed">
                        {pitchResult.emailBody}
                      </div>
                    </div>

                    {/* Pricing Packages */}
                    {pitchResult.suggestedPackages && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Tiered Website Service Packages
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {pitchResult.suggestedPackages.map((pkg, i) => (
                            <div key={i} className="border border-blue-100 bg-blue-50/40 p-3.5 rounded-xl text-xs space-y-1">
                              <div className="flex justify-between items-center font-bold text-slate-900">
                                <span>{pkg.tier}</span>
                                <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded text-[11px]">
                                  {pkg.priceRange}
                                </span>
                              </div>
                              <p className="text-slate-600 text-[11px] leading-relaxed">
                                {pkg.deliverables}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Objection Handlers */}
                    {pitchResult.objectionHandlers && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Handling Client Objections
                        </h4>
                        <div className="space-y-2">
                          {pitchResult.objectionHandlers.map((obj, i) => (
                            <div key={i} className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-slate-800">“{obj.objection}”</p>
                              <p className="text-slate-600 leading-relaxed text-[11px]">👉 {obj.rebuttal}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Modal Footer Actions */}
                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => {
                          handleSaveLead(activePitchLead, pitchResult);
                          setActivePitchLead(null);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 px-4 rounded-xl shadow-sm transition"
                      >
                        💾 Save Lead &amp; Generated Pitch
                      </button>
                    </div>

                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
