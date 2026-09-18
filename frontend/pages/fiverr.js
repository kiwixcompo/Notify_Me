import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import axios from 'axios';
import { getApiBase } from '../utils/apiBase';

const API_BASE = getApiBase();

export default function FiverrStudio() {
  const [gigUrl, setGigUrl] = useState('');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('titleTags');
  const [copiedKey, setCopiedKey] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('groq_api_key') || '';
    if (savedKey) setGroqApiKey(savedKey);
  }, []);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2500);
  };

  const handleAnalyze = async (e) => {
    if (e) e.preventDefault();
    if (!gigUrl.trim()) {
      setError('Please provide your Fiverr Gig URL');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.post(`${API_BASE}/api/fiverr/analyze`, {
        gigUrl: gigUrl.trim(),
        groq_api_key: groqApiKey.trim() || undefined
      }, { headers, timeout: 70000 });

      setResult(res.data);
      if (groqApiKey) localStorage.setItem('groq_api_key', groqApiKey);
    } catch (err) {
      console.error('Fiverr analysis error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to analyze Fiverr gig');
    } finally {
      setLoading(false);
    }
  };

  const gig = result?.gigData;
  const gap = result?.gapAnalysis;
  const opt = result?.optimizations;
  const rating = opt?.profileReadinessRating;

  return (
    <Layout>
      <Head>
        <title>Fiverr SEO & Profile Optimization Studio | Notify_Me</title>
      </Head>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl sm:text-3xl">🎯</span>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Fiverr SEO &amp; Profile Studio
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 uppercase tracking-wide">
              Algorithm Matrix
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Paste your Fiverr gig URL to decode the ranking algorithm, inspect algorithmic tag overlap, generate Midjourney thumbnails, and rate profile natural-client acquisition readiness.
          </p>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 mb-6">
          <form onSubmit={handleAnalyze} className="space-y-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">
                Fiverr Gig URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={gigUrl}
                  onChange={(e) => setGigUrl(e.target.value)}
                  placeholder="https://www.fiverr.com/yourname/design-modern-wordpress-website"
                  className="flex-1 px-3 py-2.5 sm:py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 sm:py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-sm font-bold rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Auditing Algorithm...</span>
                    </>
                  ) : (
                    <span>⚡ Run Full SEO Audit</span>
                  )}
                </button>
              </div>
            </div>

            {/* Powered by AI Engine */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>⚡ Powered by Universal High-Speed AI Inference</span>
              <span>Fiverr Algorithm v2026 Engine</span>
            </div>
          </form>

          {error && (
            <div className="mt-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Loading State skeleton */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm animate-pulse">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl animate-bounce">
              ⚡
            </div>
            <h3 className="text-base font-bold text-slate-800">Deconstructing Fiverr Search &amp; Ranking Matrix</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Extracting gig metadata, evaluating seller account age, comparing keyword tags, and designing optimal visual prompt guidelines...
            </p>
          </div>
        )}

        {/* Results Studio */}
        {result && (
          <div className="space-y-6">
            {/* Top Scorecard & Seller Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Profile Natural Client Readiness Card */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Natural Client Readiness
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold rounded-md">
                      Grade: {rating?.grade || 'A'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-black text-white">{rating?.score ?? 85}</span>
                    <span className="text-slate-400 text-xs font-semibold">/ 100 Algorithm Score</span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-3">
                    {rating?.accountAgeEvaluation || 'Evaluated against Fiverr natural organic search criteria.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Seller: <strong className="text-slate-200">@{gig?.sellerName}</strong></span>
                  <span>Member Since: <strong className="text-slate-200">{gig?.memberSince || 'Active'}</strong></span>
                </div>
              </div>

              {/* Title & SEO Gap Overview */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Title Health
                    </span>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${
                      gap?.isTitleOptimalLength ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {gap?.charCount} / 60 Chars
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 line-clamp-2 mb-2">
                    "{gig?.title}"
                  </h4>
                  <p className="text-xs text-slate-500">
                    {gap?.isTitleOptimalLength
                      ? 'Optimal length for mobile & desktop card viewports.'
                      : 'Fiverr favors titles under 60 characters to avoid truncation in mobile search.'}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Has "I will": {gap?.hasIWillFormat ? '✅ Yes' : '⚠️ Missing'}</span>
                  <span>Active Tags: <strong>{gig?.tags?.length || 0} / 5</strong></span>
                </div>
              </div>

              {/* Quick Action Plan */}
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 block mb-1">
                    Priority Algorithmic Action
                  </span>
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-950 mb-2">
                    {rating?.actionableChecklist?.[0] || 'Align 5 search tags with title keywords'}
                  </h4>
                  <p className="text-xs text-emerald-800">
                    {opt?.titleChangeRationale || 'Align primary keyword across URL slug, title, and first 100 words.'}
                  </p>
                </div>
                <div className="mt-3">
                  <button
                    onClick={() => setActiveTab('profileRating')}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    View All Priority Actions →
                  </button>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto gap-2 pb-1 scrollbar-none">
              {[
                { id: 'titleTags', label: '1. Title & 5 Tags', icon: '🏷️' },
                { id: 'description', label: '2. Description Strategy', icon: '📝' },
                { id: 'imagePrompt', label: '3. Gig Image Studio (Prompt)', icon: '🎨' },
                { id: 'faqs', label: '4. Conversion FAQs', icon: '❓' },
                { id: 'profileRating', label: '5. Profile Natural-Client Rating', icon: '⭐' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-xs sm:text-sm font-bold whitespace-nowrap rounded-xl transition flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab 1: Title & 5 Tags */}
            {activeTab === 'titleTags' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <span>✏️</span> Exact Title Replacement
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Current Title</span>
                        <span className="text-[11px] font-semibold text-slate-500">{gig?.title?.length} Chars</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 mb-2">"{gig?.title}"</p>
                      <span className="text-[11px] text-slate-500">From live scan</span>
                    </div>

                    <div className="p-4 rounded-xl border-2 border-emerald-400 bg-emerald-50/50 relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                          <span>✨</span> Recommended Algorithmic Title
                        </span>
                        <span className="text-[11px] font-bold text-emerald-700">
                          {opt?.optimizedTitle?.length || 45} Chars (Optimal)
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 mb-3">
                        "{opt?.optimizedTitle || 'I will design a high converting modern responsive website'}"
                      </p>
                      <button
                        onClick={() => handleCopy(opt?.optimizedTitle, 'title')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-lg transition flex items-center gap-1"
                      >
                        {copiedKey === 'title' ? '✓ Copied to Clipboard' : '📋 Copy Title'}
                      </button>
                    </div>
                  </div>

                  {opt?.titleChangeRationale && (
                    <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                      <strong>Why this change:</strong> {opt.titleChangeRationale}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>🏷️</span> 5 Exact Algorithm Search Tags
                      </h3>
                      <p className="text-xs text-slate-500">
                        Replace your tags with these exact 5 to maximize co-occurrence ranking in Fiverr search.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy((opt?.searchTags || []).join(', '), 'tags')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 self-start sm:self-auto"
                    >
                      {copiedKey === 'tags' ? '✓ All 5 Tags Copied' : '📋 Copy All 5 Tags'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                    {(opt?.searchTags || ['wordpress', 'web design', 'landing page', 'elementor', 'responsive']).map((tag, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 flex flex-col justify-between"
                      >
                        <span className="text-[10px] font-bold text-emerald-800 uppercase mb-1">Tag #{idx + 1}</span>
                        <span className="text-xs font-black text-slate-900 break-words">{tag}</span>
                        <button
                          onClick={() => handleCopy(tag, `tag_${idx}`)}
                          className="mt-2 text-[10px] text-emerald-700 hover:underline font-bold text-left"
                        >
                          {copiedKey === `tag_${idx}` ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {opt?.tagsRationale && (
                    <p className="mt-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <strong>Algorithm Strategy:</strong> {opt.tagsRationale}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Description */}
            {activeTab === 'description' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <span>📝</span> Conversion-Optimized Description
                    </h3>
                    <p className="text-xs text-slate-500">
                      Structured for Fiverr algorithm indexation (keyword density in first 100 words) and human buyer conversion.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      const fullDesc = `${opt?.descriptionStrategy?.first100WordsHook}\n\nWhat You Will Get:\n${(opt?.descriptionStrategy?.bulletPoints || []).map(b => `• ${b}`).join('\n')}\n\n${opt?.descriptionStrategy?.callToAction}`;
                      handleCopy(fullDesc, 'fulldesc');
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 self-start sm:self-auto"
                  >
                    {copiedKey === 'fulldesc' ? '✓ Full Description Copied' : '📋 Copy Full Description'}
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block mb-1">
                    1. First 100 Words Hook (Fiverr Algorithm Index Zone)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed">
                    {opt?.descriptionStrategy?.first100WordsHook || 'Are you looking for a modern, responsive website that converts visitors into paying customers? You are in the right place.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <span className="text-[11px] font-bold text-slate-700 uppercase block mb-2">
                    2. Clear Deliverables &amp; Benefits
                  </span>
                  <ul className="space-y-2 text-xs sm:text-sm text-slate-700">
                    {(opt?.descriptionStrategy?.bulletPoints || [
                      '100% responsive on all mobile, tablet, and desktop devices',
                      'SEO friendly markup and lightning fast loading speed',
                      'Free 30 days post-delivery support and revisions guarantee'
                    ]).map((b, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white">
                  <span className="text-[11px] font-bold text-slate-700 uppercase block mb-1">
                    3. High-Converting Call to Action
                  </span>
                  <p className="text-xs sm:text-sm text-slate-800 font-medium italic">
                    "{opt?.descriptionStrategy?.callToAction || 'Please message me before placing an order so we can discuss your exact project goals and ensure the best package for you.'}"
                  </p>
                </div>
              </div>
            )}

            {/* Tab 3: Image Studio */}
            {activeTab === 'imagePrompt' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                        <span>🎨</span> Generative AI Gig Image Prompt (Midjourney / DALL-E / Flux)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Copy this comprehensive prompt directly into Midjourney v6, DALL-E 3, or Leonardo to produce an ultra high-CTR cover image.
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(opt?.gigImagePrompt?.masterPrompt, 'imgprompt')}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1 self-start sm:self-auto"
                    >
                      {copiedKey === 'imgprompt' ? '✓ Master Prompt Copied' : '✨ Copy Master Prompt'}
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed border border-slate-800 mb-4">
                    <p className="whitespace-pre-wrap">{opt?.gigImagePrompt?.masterPrompt || 'Minimalist modern 3D isometric mockup of a high-converting digital service workspace, sleek laptop displaying clean responsive UI, warm studio rim lighting, 8k resolution, crisp negative space on right for badge text --ar 16:9 --v 6.0'}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Recommended Palette</span>
                      <div className="flex items-center gap-2">
                        {(opt?.gigImagePrompt?.recommendedPalette || ['#0F172A', '#10B981', '#F8FAFC']).map((col, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="w-4 h-4 rounded-full border border-slate-300" style={{ backgroundColor: col }}></span>
                            <span className="text-[11px] font-bold text-slate-700">{col}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Aspect Ratio &amp; Viewport</span>
                      <p className="text-xs font-bold text-slate-800">16:9 (1280 × 769 px)</p>
                      <span className="text-[10px] text-slate-500">Optimal fit for Fiverr cards</span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Text Overlay Rule</span>
                      <p className="text-xs font-semibold text-slate-800">Max 3 Words · Big Contrast</p>
                      <span className="text-[10px] text-slate-500">Never crowd with small text</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {opt?.gigImagePrompt?.compositionAdvice && (
                      <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900">
                        <strong>Composition Guidance:</strong> {opt.gigImagePrompt.compositionAdvice}
                      </div>
                    )}
                    {opt?.gigImagePrompt?.textBadgeGuidance && (
                      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                        <strong>Text Badge Strategy:</strong> {opt.gigImagePrompt.textBadgeGuidance}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: FAQs */}
            {activeTab === 'faqs' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span>❓</span> 3 SEO-Targeted Conversion FAQs
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Add these 3 FAQs to your gig to rank for long-tail buyer questions and reduce pre-order objections.
                </p>

                {(opt?.faqs || [
                  { question: 'What do I need to provide to get started?', answer: 'Simply send over your project brief, brand colors, logo, and any reference sites you like.' },
                  { question: 'Do you provide responsive mobile optimization?', answer: 'Yes! Every design is 100% responsive and tested across iOS and Android devices.' },
                  { question: 'What if I need revisions after delivery?', answer: 'I provide revisions to ensure you are 100% delighted with the outcome.' }
                ]).map((faq, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-900">Q: {faq.question}</span>
                      <button
                        onClick={() => handleCopy(`Q: ${faq.question}\nA: ${faq.answer}`, `faq_${idx}`)}
                        className="text-[11px] font-bold text-emerald-600 hover:underline"
                      >
                        {copiedKey === `faq_${idx}` ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{faq.answer}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 5: Profile Rating */}
            {activeTab === 'profileRating' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                        Profile Algorithmic Evaluation
                      </span>
                      <h3 className="text-lg font-black text-slate-900">
                        Organic Client Acquisition Readiness
                      </h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-2xl font-black text-emerald-600">{rating?.score ?? 85}</span>
                        <span className="text-xs text-slate-400">/100</span>
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-sm font-black rounded-xl">
                        Grade {rating?.grade || 'A'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs sm:text-sm text-blue-950">
                    <h4 className="font-bold flex items-center gap-1.5 mb-1 text-blue-900">
                      <span>⏳</span> Account Age Impact ({gig?.memberSince || 'Active Member'})
                    </h4>
                    <p className="text-xs text-blue-900/90 leading-relaxed">
                      {rating?.accountAgeEvaluation || 'Fiverr rewards consistent activity and rapid response times. Profiles with fewer reviews should price competitively to build initial review velocity.'}
                    </p>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      👏 What You're Doing Right (Keep Doing This)
                    </h4>
                    <div className="space-y-2">
                      {(rating?.commendations || [
                        'Clean, clear niche positioning that matches search demand',
                        'Active profile with defined delivery expectations'
                      ]).map((comm, idx) => (
                        <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
                          <span className="text-emerald-600 font-bold">★</span>
                          <span>{comm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      🚀 Priority Checklist to Trigger Natural Algorithm Inflow
                    </h4>
                    <div className="space-y-2">
                      {(rating?.actionableChecklist || [
                        'Update Gig Title to strictly match high-volume root keyword',
                        'Configure all 5 search tags to reinforce the title keyword',
                        'Upload modern 16:9 thumbnail using the generated studio prompt',
                        'Maintain under 1 hour response time on Fiverr mobile app'
                      ]).map((action, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="pt-0.5">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
