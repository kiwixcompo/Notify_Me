import React, { useState } from 'react';

export default function JobResearchModal({
  isOpen,
  onClose,
  job,
  researchData,
  loading,
  error,
  onRefresh
}) {
  const [copiedKey, setCopiedKey] = useState(null);

  if (!isOpen) return null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const dossier = researchData?.data || researchData;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 text-white p-4 sm:p-6 flex justify-between items-start shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-xl">🔬</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 bg-indigo-900/60 px-2.5 py-0.5 rounded-full border border-indigo-700">
                Deep Job Intelligence Dossier
              </span>
              {researchData?.cached && (
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-700">
                  ⚡ Instant Cached Dossier
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold tracking-tight truncate">
              {job?.title || 'Job Opening'}
            </h2>
            <p className="text-xs text-indigo-200 mt-0.5 truncate">
              Company: <span className="font-semibold text-white">{job?.company || 'Target Organization'}</span> &bull; {job?.location || 'Remote'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={loading}
                className="p-2 text-indigo-200 hover:text-white hover:bg-white/10 rounded-lg transition"
                title="Rerun Live Multi-Vector Search"
              >
                🔄
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition"
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-6 flex-1 text-slate-800">
          
          {loading && (
            <div className="py-16 text-center space-y-4">
              <div className="inline-block animate-spin text-4xl">⚡</div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Executing 4-Stage Deep Research Pipeline</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Resolving official company careers portals &bull; Running Google Dorks for recruiters on LinkedIn &bull; Benchmarking compensation &bull; Synthesizing intelligence...
                </p>
              </div>
              <div className="flex justify-center gap-2 text-[11px] font-medium text-indigo-600 pt-2">
                <span className="bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">1. Portal Resolver</span>
                <span className="bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">2. Recruiter Dorking</span>
                <span className="bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">3. Pay Analysis</span>
                <span className="bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">4. AI Synthesis</span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs space-y-2">
              <div className="font-bold flex items-center gap-1.5">
                <span>⚠️</span> Research Encountered an Issue
              </div>
              <p>{error}</p>
              {onRefresh && (
                <button
                  onClick={onRefresh}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg font-semibold text-xs hover:bg-red-700 transition"
                >
                  Retry Research
                </button>
              )}
            </div>
          )}

          {!loading && dossier && (
            <>
              {/* STAGE 1: Company Profile & Careers Portal */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  <span>🏢</span> Stage 1: Company &amp; Careers Portal Resolver
                </div>

                {dossier.companyProfile?.disambiguationNotes && (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                    <span className="font-bold">Entity Resolution: </span>
                    {dossier.companyProfile.disambiguationNotes}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-2.5">
                  {(dossier.companyProfile?.identifiedEntities || []).map((entity, i) => (
                    <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{entity.name}</div>
                          <div className="text-xs text-slate-500">{entity.industry}</div>
                        </div>
                        {entity.isDirectMatch && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                            Verified Match
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1 text-xs font-semibold">
                        {entity.officialCareersUrl && (
                          <a
                            href={entity.officialCareersUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-indigo-600 hover:text-indigo-800 hover:border-indigo-400 transition"
                          >
                            🌐 Official Careers Portal ↗
                          </a>
                        )}
                        {entity.quickApplyUrl && entity.quickApplyUrl !== entity.officialCareersUrl && (
                          <a
                            href={entity.quickApplyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-700 hover:bg-indigo-100 transition"
                          >
                            ⚡ Direct / Quick Apply ↗
                          </a>
                        )}
                        {entity.companyLinkedInUrl && (
                          <a
                            href={entity.companyLinkedInUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-blue-700 hover:text-blue-900 hover:border-blue-400 transition"
                          >
                            💼 LinkedIn Company Page ↗
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 2: Recruiter & Talent Discovery */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                    <span>🎯</span> Stage 2: Recruiter &amp; Talent Discovery (LinkedIn Dorks)
                  </div>
                  <span className="text-[11px] text-slate-400">Direct hiring contacts</span>
                </div>

                <div className="space-y-2">
                  {(dossier.recruiters || []).map((recruiter, i) => (
                    <div
                      key={i}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span>👤 {recruiter.name}</span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5">{recruiter.title}</div>
                        {recruiter.recommendedAction && (
                          <div className="text-[11px] text-slate-400 italic mt-1">
                            Tip: {recruiter.recommendedAction}
                          </div>
                        )}
                      </div>

                      {recruiter.profileUrl && (
                        <a
                          href={recruiter.profileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shrink-0 flex items-center gap-1"
                        >
                          View Profile ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* STAGE 3: Salary & Compensation Engine */}
              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  <span>💰</span> Stage 3: Salary &amp; Compensation Engine
                </div>

                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        Estimated Compensation Band
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5">
                        {dossier.compensation?.estimatedRange || 'Market Benchmark Unavailable'}
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {dossier.compensation?.isExplicitInPost ? 'Verified in Job Listing' : 'Multi-Vector Market Estimate'}
                    </span>
                  </div>

                  {dossier.compensation?.structureDetails && (
                    <p className="text-xs text-emerald-900/90 leading-relaxed pt-1">
                      {dossier.compensation.structureDetails}
                    </p>
                  )}

                  {dossier.compensation?.adviceOnInquiring && (
                    <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-800">
                      <span className="font-bold">Negotiation Advice: </span>
                      {dossier.compensation.adviceOnInquiring}
                    </div>
                  )}
                </div>
              </div>

              {/* STAGE 4: Ready-to-Send Outreach Scripts */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 uppercase tracking-wider">
                  <span>✉️</span> Stage 4: Synthesized Outreach Scripts
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* LinkedIn Connection Note */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-800">LinkedIn Connection Note</span>
                        <span className="text-[10px] text-slate-400">&le; 300 chars</span>
                      </div>
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        &ldquo;{dossier.outreachScripts?.recruiterConnectionNote}&rdquo;
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          dossier.outreachScripts?.recruiterConnectionNote || '',
                          'connection_note'
                        )
                      }
                      className="w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      {copiedKey === 'connection_note' ? '✓ Copied Note!' : '📋 Copy Connection Note'}
                    </button>
                  </div>

                  {/* Salary Inquiry Script */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-800">Salary Band Inquiry Message</span>
                        <span className="text-[10px] text-slate-400">Professional Inquiries</span>
                      </div>
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/80 leading-relaxed">
                        &ldquo;{dossier.outreachScripts?.salaryInquiryScript}&rdquo;
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          dossier.outreachScripts?.salaryInquiryScript || '',
                          'salary_script'
                        )
                      }
                      className="w-full py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      {copiedKey === 'salary_script' ? '✓ Copied Script!' : '📋 Copy Salary Inquiry'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <div>
            {dossier && (
              <span>
                Engine: <strong className="text-slate-700">{researchData?.engine || 'gemini-2.5-flash'}</strong>
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
