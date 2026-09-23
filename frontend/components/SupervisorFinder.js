import React, { useState } from 'react';
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function SupervisorFinder() {
  const [topic, setTopic] = useState('Deep Learning for Medical Image Segmentation');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [professors, setProfessors] = useState([]);
  const [selectedProf, setSelectedProf] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [error, setError] = useState('');

  const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token ? { Authorization: 'Bearer ' + token } : {};
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!topic || topic.trim().length < 3) {
      alert('Please enter a specific research topic or field of study.');
      return;
    }

    setLoading(true);
    setError('');
    setProfessors([]);
    try {
      const res = await axios.post(`${API_BASE}/api/scholarships/supervisors/discover`, {
        topic: topic.trim(),
        country: country.trim()
      }, { headers: getHeaders() });

      if (res.data?.success) {
        setProfessors(res.data.data || []);
      }
    } catch (err) {
      console.error('Supervisor discovery error:', err);
      setError(err.response?.data?.error || 'Failed to discover academic contacts. Please try again.');
    } finally {
      setLoading(false);
    }
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
              Execute multi-vector LinkedIn search dorks targeted specifically at assistant professors with startup grants, lab directors, and graduate chairs with funded openings.
            </p>
          </div>
        </div>

        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
          <div className="md:col-span-8">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Proposed Topic or Field of Study <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Explainable AI in Medical Diagnostics, Edge Computing, Quantum ML..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
              required
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Target Country / Region (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Canada, United Kingdom, USA, Germany..."
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="md:col-span-12 mt-1">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all disabled:opacity-50 flex justify-center items-center gap-2 shadow-sm min-h-[44px]"
            >
              {loading ? (
                <>
                  <span className="animate-spin text-base">⚡</span>
                  <span>Scanning Faculty &amp; Lab Directors via Multi-Vector Dorks...</span>
                </>
              ) : (
                '🔍 Discover Prospective Supervisors & Funding Gatekeepers'
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
      {professors.length > 0 && (
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold text-slate-900">
            Discovered Academic Profiles ({professors.length})
          </h3>
          <span className="text-xs text-slate-500">
            Topic: <span className="font-semibold text-slate-700">&ldquo;{topic}&rdquo;</span>
          </span>
        </div>
      )}

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {professors.map((prof, i) => (
          <div
            key={i}
            className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all shadow-sm space-y-3"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    prof.category === 'ACTIVELY_RECRUITING'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : prof.category === 'GRADUATE_COORDINATOR'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {prof.category ? prof.category.replace(/_/g, ' ') : 'FACULTY'}
                </span>
                <span className="text-xs font-semibold text-slate-600 truncate max-w-[200px]">
                  {prof.institution}
                </span>
              </div>

              <h3 className="font-bold text-slate-900 text-base leading-snug">{prof.name}</h3>
              <p className="text-xs text-indigo-700 font-medium mt-0.5">
                {prof.academicRole} &bull; <span className="text-slate-500">{prof.departmentOrLab}</span>
              </p>

              {prof.researchAlignment && (
                <div className="text-xs text-slate-600 mt-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                  <strong className="text-slate-800">Research Alignment: </strong>
                  {prof.researchAlignment}
                </div>
              )}

              {prof.fundingSignal && (
                <div className="text-[11px] text-emerald-700 font-medium mt-2 flex items-center gap-1.5">
                  <span>💰</span>
                  <span>{prof.fundingSignal}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
              {prof.linkedInUrl && (
                <a
                  href={prof.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold py-2 px-3 rounded-xl transition"
                >
                  LinkedIn Profile ↗
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
                  <span>💬</span> LinkedIn Connection Note (&le; 280 chars)
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

            {/* 2. Formal Academic Inquiry Email */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span>✉️</span> Formal Academic Cold Email
                </h4>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Subject: ${selectedProf.outreachKit?.formalColdEmail?.subjectLine || ''}\n\n${selectedProf.outreachKit?.formalColdEmail?.body || ''}`,
                      'formal_email'
                    )
                  }
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                >
                  {copiedKey === 'formal_email' ? '✓ Copied Full Email!' : '📋 Copy Full Email'}
                </button>
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2 text-xs text-slate-700">
                <p>
                  <strong className="text-slate-900">Subject: </strong>
                  <span className="text-indigo-900 font-semibold">
                    {selectedProf.outreachKit?.formalColdEmail?.subjectLine}
                  </span>
                </p>
                <div className="border-t border-slate-200/80 pt-2 whitespace-pre-line leading-relaxed">
                  {selectedProf.outreachKit?.formalColdEmail?.body}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-100">
              {selectedProf.linkedInUrl && (
                <a
                  href={selectedProf.linkedInUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  Open LinkedIn Profile ↗
                </a>
              )}
              <button
                onClick={() => setSelectedProf(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
