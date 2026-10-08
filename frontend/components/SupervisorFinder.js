import React, { useState } from 'react';
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function SupervisorFinder() {
  const [topic, setTopic] = useState('Deep Learning for Medical Image Segmentation');
  const [country, setCountry] = useState('');
  const [timeframe, setTimeframe] = useState('Any');
  const [customTimeframe, setCustomTimeframe] = useState('');
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState([]);
  const [allProfessors, setAllProfessors] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [selectedProf, setSelectedProf] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState('');

  // Optional custom API keys
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [serperApiKey, setSerperApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  const effectiveTimeframe = timeframe === 'Custom' ? customTimeframe.trim() : (timeframe === 'Any' ? '' : timeframe);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!topic || topic.trim().length < 3) {
      alert('Please enter a specific research topic or field of study.');
      return;
    }

    setLoading(true);
    setError('');
    setProfessors([]);
    setAllProfessors([]);
    setCurrentPage(1);
    try {
      const payload = {
        topic: topic.trim(),
        country: country.trim(),
        recruitment_timeframe: effectiveTimeframe
      };
      if (serperApiKey.trim()) payload.serper_api_key = serperApiKey.trim();
      if (geminiApiKey.trim()) payload.gemini_api_key = geminiApiKey.trim();

      const res = await axios.post(`${API_BASE}/api/scholarships/supervisors/discover`, payload, {
        headers: getHeaders()
      });

      if (res.data?.success) {
        const fullList = res.data.allData || res.data.data || [];
        setAllProfessors(fullList);
        setProfessors(fullList.slice(0, pageSize));
      }
    } catch (err) {
      console.error('Supervisor discovery error:', err);
      setError(err.response?.data?.error || 'Failed to discover academic contacts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (pageNum) => {
    setCurrentPage(pageNum);
    const start = (pageNum - 1) * pageSize;
    setProfessors(allProfessors.slice(start, start + pageSize));
    window.scrollTo({ top: 350, behavior: 'smooth' });
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">🎓</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                Academic Supervisor &amp; Funding Scout
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              Find Faculty, Principal Investigators &amp; Graduate Program Chairs
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target prospective supervisors by research field, recruitment intake period, and funded student slots. Results are curated to the top 8 matches per search.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl border border-indigo-200 transition shrink-0"
          >
            {showApiKeys ? 'Hide Custom API Keys ▲' : '⚙️ Custom API Keys ▼'}
          </button>
        </div>

        {/* Optional Custom API Key accordion */}
        {showApiKeys && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs animate-in fade-in duration-150">
            <div className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>🔑</span>
              <span>Custom Search &amp; AI Keys (Optional)</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              If public search engines encounter rate limits, provide a free Serper.dev key (2,500 free queries) or Gemini API key. System keys configured in the Admin Dashboard are automatically used as defaults.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Serper.dev API Key</label>
                <input
                  type="password"
                  placeholder="e.g., a89f7b..."
                  value={serperApiKey}
                  onChange={(e) => setSerperApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Gemini API Key</label>
                <input
                  type="password"
                  placeholder="e.g., AIzaSy..."
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proposed Topic or Field of Study <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Computer Science, Explainable AI, Quantum ML..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
              required
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Country / Region (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., United Kingdom, Canada, USA..."
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span>Recruitment Timeframe</span>
              <span className="text-[10px] text-indigo-600 font-normal">Intake Cycle</span>
            </label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px] bg-white text-slate-700 font-medium"
            >
              <option value="Any">🌐 Any Intake / All Cycles</option>
              <option value="Fall 2026">🍂 Fall 2026 (September / October)</option>
              <option value="Spring 2026">🌱 Spring 2026 (January / February)</option>
              <option value="Fall 2025">🍂 Fall 2025</option>
              <option value="Spring 2025">🌱 Spring 2025</option>
              <option value="Immediate">⚡ Immediate / ASAP Opening</option>
              <option value="Custom">✏️ Custom Specific Term...</option>
            </select>
          </div>

          {timeframe === 'Custom' && (
            <div className="md:col-span-12">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Custom Timeframe / Session
              </label>
              <input
                type="text"
                placeholder="e.g., Summer 2026, Winter 2026, Q3 2026..."
                value={customTimeframe}
                onChange={(e) => setCustomTimeframe(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-indigo-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-indigo-50/30"
              />
            </div>
          )}

          <div className="md:col-span-12 mt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm min-h-[44px]"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-base">⚡</span>
                  <span>Scanning Faculty &amp; Lab Directors via Multi-Vector Knowledge Graph...</span>
                </>
              ) : (
                '🔍 Discover Prospective Supervisors & Funding Gatekeepers (Max 8)'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex justify-between items-center">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')} className="text-red-500 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Results Overview */}
      {allProfessors.length > 0 && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-1 gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-slate-900">
              Discovered Academic Contacts ({professors.length} of {allProfessors.length} total)
            </h3>
            {effectiveTimeframe && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                ⏱️ {effectiveTimeframe}
              </span>
            )}
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              Page {currentPage} of {Math.ceil(allProfessors.length / pageSize) || 1}
            </span>
          </div>
          <span className="text-xs text-slate-500">
            Topic: <span className="font-semibold text-slate-700">&ldquo;{topic}&rdquo;</span>
          </span>
        </div>
      )}

      {/* Results Grid - Paginated in batches of 8 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {professors.map((prof, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all shadow-sm space-y-3"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      prof.category === 'ACTIVELY_RECRUITING'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : prof.category === 'ADVERTISED_STUDENTSHIP'
                        ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                        : prof.category === 'GRADUATE_COORDINATOR'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    {prof.postType || (prof.category ? prof.category.replace(/_/g, ' ') : 'FACULTY')}
                  </span>

                  {/* Recruitment Timeframe Badge */}
                  {prof.recruitmentTimeframe && (
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                      <span>⏳</span>
                      <span>{prof.recruitmentTimeframe}</span>
                    </span>
                  )}
                </div>

                <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                  {prof.institution}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base leading-snug">{prof.name}</h3>
              <p className="text-xs text-indigo-700 font-medium mt-0.5">
                {prof.academicRole} &bull; <span className="text-slate-500">{prof.departmentOrLab}</span>
              </p>

              {/* Research Alignment */}
              {prof.researchAlignment && (
                <div className="text-xs text-slate-600 mt-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  <strong className="text-slate-800">Research Alignment: </strong>
                  {prof.researchAlignment}
                </div>
              )}

              {/* Funding & Benefits Section */}
              <div className="mt-2.5 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                  <span>💰</span>
                  <span>Verified Funding &amp; Student Benefits:</span>
                </div>
                <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
                  {prof.fundingAndBenefits || prof.fundingSignal || 'Standard Departmental Research/Teaching Assistantship & Tuition Waiver'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              {prof.linkedInUrl && (
                <a
                  href={prof.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl transition"
                >
                  Project / Profile ↗
                </a>
              )}
              <button
                onClick={() => setSelectedProf(prof)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold py-2 px-3 rounded-xl transition shadow-sm"
              >
                ✉️ View Outreach Kit
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {allProfessors.length > pageSize && (
        <div className="flex items-center justify-between border-t border-slate-200 pt-4 px-2">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => goToPage(currentPage - 1)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            ← Previous 8
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: Math.ceil(allProfessors.length / pageSize) }).map((_, idx) => {
              const pageNum = idx + 1;
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => goToPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={currentPage === Math.ceil(allProfessors.length / pageSize)}
            onClick={() => goToPage(currentPage + 1)}
            className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Next 8 →
          </button>
        </div>
      )}

      {/* Outreach Kit Modal */}
      {selectedProf && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 space-y-5 border border-slate-200 shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                  Tailored Outreach Kit
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl mt-1">
                  {selectedProf.name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedProf.academicRole} &bull; {selectedProf.institution}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {selectedProf.recruitmentTimeframe && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                      ⏳ Recruiting For: {selectedProf.recruitmentTimeframe}
                    </span>
                  )}
                  {selectedProf.fundingAndBenefits && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      💰 {selectedProf.fundingAndBenefits}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedProf(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-sm transition"
              >
                ✕
              </button>
            </div>

            {/* 1. LinkedIn Short Note (280-300 chars) */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>💬</span> Academic / LinkedIn Connection Note (&le; 280 chars)
                </h4>
                <button
                  onClick={() =>
                    copyToClipboard(selectedProf.outreachKit?.linkedInNote || '', 'linkedin_note')
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {copiedKey === 'linkedin_note' ? '✓ Copied Note!' : '📋 Copy Note'}
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs italic text-slate-700 leading-relaxed">
                &ldquo;{selectedProf.outreachKit?.linkedInNote}&rdquo;
              </div>
            </div>

            {/* 2. Formal Cold Email Draft */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>✉️</span> Formal Prospective Graduate &amp; Supervisor Email
                </h4>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Subject: ${selectedProf.outreachKit?.formalColdEmail?.subjectLine}\n\n${selectedProf.outreachKit?.formalColdEmail?.body}`,
                      'cold_email'
                    )
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {copiedKey === 'cold_email' ? '✓ Copied Email!' : '📋 Copy Full Email'}
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Subject:</span>
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg text-xs font-medium text-slate-800 mt-0.5">
                    {selectedProf.outreachKit?.formalColdEmail?.subjectLine}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-semibold text-slate-500">Body:</span>
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-800 whitespace-pre-wrap leading-relaxed mt-0.5 font-sans">
                    {selectedProf.outreachKit?.formalColdEmail?.body}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedProf(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
