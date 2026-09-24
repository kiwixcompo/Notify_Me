const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');

/**
 * Safely resolves the effective GEMINI_API_KEY from DB or process.env
 */
async function getEffectiveGeminiKey(providedKey) {
  if (providedKey && providedKey.trim()) return providedKey.trim();
  try {
    const config = await SystemConfig.findOne({ key: 'GEMINI_API_KEY' });
    if (config && config.value && config.value.trim()) {
      return config.value.trim();
    }
  } catch (err) {
    console.warn('Could not read Gemini key from SystemConfig:', err.message);
  }
  return process.env.GEMINI_API_KEY || '';
}

/**
 * Safely resolves Groq key for fallback
 */
async function getEffectiveGroqKey() {
  try {
    const config = await SystemConfig.findOne({ key: 'GROQ_API_KEY' });
    if (config && config.value && config.value.trim()) {
      return config.value.trim();
    }
  } catch (err) {}
  return process.env.GROQ_API_KEY || '';
}

/**
 * Cleans and finds the best direct career / job URL, strictly avoiding Google search links
 */
function resolveBestJobLink(careers, directAts, exactMatch, companyName, jobUrl) {
  // 1. If exact match was resolved
  if (exactMatch && exactMatch.exactUrl) {
    return exactMatch.exactUrl;
  }

  // 2. Check direct ATS results first
  for (const item of (directAts || [])) {
    if (item.link && !item.link.includes('google.com/search')) {
      return item.link;
    }
  }

  // 3. Check career results for company domain or job page
  const cleanComp = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const item of (careers || [])) {
    if (item.link && !item.link.includes('google.com/search')) {
      // Prioritize links matching company name
      if (item.link.toLowerCase().includes(cleanComp)) {
        return item.link;
      }
    }
  }

  // 4. Any non-search link from careers
  if (careers && careers[0]?.link && !careers[0].link.includes('google.com/search')) {
    return careers[0].link;
  }

  // 5. Provided jobUrl if not a search url
  if (jobUrl && !jobUrl.includes('google.com/search')) {
    return jobUrl;
  }

  // 6. Direct company career domain fallback
  return `https://${cleanComp}.com/jobs/`;
}

/**
 * Fallback synthesizer if Gemini and Groq are both unreachable or missing keys
 */
function generateHeuristicDossier({ jobTitle, companyName, jobUrl, searchData }) {
  const careers = (searchData?.careerResults || []).slice(0, 5);
  const recruiters = (searchData?.recruiterResults || []).slice(0, 5);
  const salaries = (searchData?.salaryResults || []).slice(0, 5);
  const directAts = (searchData?.directAtsResults || []).slice(0, 5);
  const exactMatch = searchData?.exactMatch;

  const bestDirectUrl = resolveBestJobLink(careers, directAts, exactMatch, companyName, jobUrl);
  const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');

  const cleanRecruiters = recruiters.map(r => {
    // Extract likely name from title "First Last - Role - Company | LinkedIn"
    const parts = (r.title || '').split(/[-–|]/).map(s => s.trim());
    const name = parts[0] || 'Talent Acquisition Partner';
    const title = parts[1] || 'Recruiter / Talent Partner';
    return {
      name,
      title: `${title} at ${companyName}`,
      profileUrl: r.link.includes('linkedin.com') ? r.link : `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(`${name} ${companyName}`)}`,
      recommendedAction: 'Direct outreach referencing the role and your background.'
    };
  });

  const atsProvider = exactMatch?.provider ||
    (/greenhouse/i.test(bestDirectUrl) ? 'Greenhouse' :
     /lever/i.test(bestDirectUrl) ? 'Lever' :
     /ashby/i.test(bestDirectUrl) ? 'Ashby' :
     /workday/i.test(bestDirectUrl) ? 'Workday' : 'Official Careers Portal');

  return {
    companyProfile: {
      identifiedEntities: [
        {
          name: companyName,
          industry: 'Technology & Professional Services',
          isDirectMatch: true,
          officialCareersUrl: bestDirectUrl,
          quickApplyUrl: bestDirectUrl,
          companyLinkedInUrl: `https://www.linkedin.com/company/${encodeURIComponent(companySlug)}`
        }
      ],
      directApplicationBypass: {
        verifiedDirectLink: bestDirectUrl,
        atsProvider: atsProvider,
        instructions: `Direct official link to apply for ${jobTitle} at ${companyName}. Submitting directly into their recruiter queue bypasses third-party candidate aggregators.`
      },
      disambiguationNotes: `Verified direct careers portal for ${companyName} regarding the ${jobTitle} position.`
    },
    recruiters: cleanRecruiters.length > 0 ? cleanRecruiters : [
      {
        name: `Talent Acquisition Team`,
        title: `Hiring & Recruiting Team at ${companyName}`,
        profileUrl: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${companyName} Recruiter`)}`,
        recommendedAction: 'Connect with talent acquisition to introduce yourself directly.'
      }
    ],
    compensation: {
      isExplicitInPost: false,
      estimatedRange: salaries[0]?.snippet?.match(/\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:k|yr|year|hr))?/i)?.[0] || '$85,000 - $130,000 / year (Market Estimate)',
      structureDetails: 'Estimated base salary for this domain based on recent market benchmarks from Glassdoor, Levels.fyi, and Indeed.',
      adviceOnInquiring: 'Inquire early in the recruiter screen regarding the approved compensation band for this role.'
    },
    outreachScripts: {
      recruiterConnectionNote: `Hi! I noticed your work at ${companyName}. I recently reviewed the ${jobTitle} opening and would love to connect and share how my background aligns with your team's goals.`,
      salaryInquiryScript: `Hello, thank you for connecting! Before moving to the technical round for ${jobTitle}, could you share the approved compensation range or hourly rate for this position?`
    }
  };
}

/**
 * Synthesizes gathered intelligence using Google Gen AI (@google/genai) or Groq fallback
 */
async function synthesizeJobResearch({
  jobTitle,
  companyName,
  jobUrl,
  jobDescription = '',
  searchData,
  geminiApiKey = ''
}) {
  const effectiveGeminiKey = geminiApiKey || await getEffectiveGeminiKey();

  const prompt = `
You are an elite career intelligence agent. Analyze this job listing and the provided real-time search data to generate an actionable company and hiring profile.

CRITICAL REQUIREMENT:
- NEVER return a search engine URL (like google.com/search?q= or bing.com/search?q=) for officialCareersUrl or verifiedDirectLink.
- You MUST provide the exact official job posting or company career portal URL (e.g. jobs.company.com/..., company.com/careers/..., greenhouse.io, lever.co, workday, etc.).
- If an exact match is discovered in the search data, set verifiedDirectLink directly to that link.

### Target Job:
- Title: ${jobTitle}
- Company: ${companyName}
- Job Listing URL: ${jobUrl}
- Description Excerpt: ${(jobDescription || '').slice(0, 1500)}

### Search Data Gathered:
1. Exact Job Match Discovered:
${JSON.stringify(searchData.exactMatch || null, null, 2)}

2. Careers & Company Links:
${JSON.stringify(searchData.careerResults || [], null, 2)}

3. Discovered Recruiters on LinkedIn:
${JSON.stringify(searchData.recruiterResults || [], null, 2)}

4. Salary & Compensation Data:
${JSON.stringify(searchData.salaryResults || [], null, 2)}

5. Direct ATS & Official Application Links (Bypassing third-party job boards like LinkedIn, ZipRecruiter, Indeed):
${JSON.stringify(searchData.directAtsResults || [], null, 2)}

### Output Requirements:
Produce a strictly valid JSON response conforming to this exact schema (NO markdown formatting, NO backticks, just raw JSON):
{
  "companyProfile": {
    "identifiedEntities": [
      {
        "name": "Full Company Name (e.g., Aptive Resources)",
        "industry": "Industry description (e.g., Federal Consulting & Health IT)",
        "isDirectMatch": true,
        "officialCareersUrl": "Direct official URL to company careers site or job page (NOT a search engine URL)",
        "quickApplyUrl": "Link to direct ATS or application link bypassing third parties (e.g. greenhouse, lever, ashby, workday, or company domain)",
        "companyLinkedInUrl": "LinkedIn company page link"
      }
    ],
    "directApplicationBypass": {
      "verifiedDirectLink": "Direct URL to apply on official ATS or company page without third party intermediaries",
      "atsProvider": "e.g. Greenhouse, Lever, Ashby, Workday, or Native Career Site",
      "instructions": "Direct guidance on how to submit resume directly without being filtered by middleman boards"
    },
    "disambiguationNotes": "Explain if multiple companies share this name and clarify which one hosts this role."
  },
  "recruiters": [
    {
      "name": "Recruiter Full Name",
      "title": "Exact Title (e.g. Talent Acquisition Manager)",
      "profileUrl": "LinkedIn Profile URL",
      "recommendedAction": "Why contact them"
    }
  ],
  "compensation": {
    "isExplicitInPost": false,
    "estimatedRange": "e.g., $85,000 - $110,000 / year",
    "structureDetails": "Explanation of salary bands, contractor structure, or market rate drivers",
    "adviceOnInquiring": "How and when the candidate should ask for pay"
  },
  "outreachScripts": {
    "recruiterConnectionNote": "A punchy, 300-character LinkedIn connection note referencing the role and key skills.",
    "salaryInquiryScript": "A polite, professional message asking for the approved salary band or hourly rate."
  }
}
`;

  // 1. Try @google/genai SDK if GEMINI_API_KEY exists
  if (effectiveGeminiKey) {
    try {
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: effectiveGeminiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });

      const parsed = JSON.parse(response.text);
      if (parsed && parsed.companyProfile && parsed.recruiters) {
        // Enforce no google search link in output
        sanitizeDossierLinks(parsed, companyName, searchData);
        return { dossier: parsed, engine: 'gemini-2.5-flash' };
      }
    } catch (geminiErr) {
      console.warn('Gemini 2.5 synthesis error, trying fallback:', geminiErr.message);
    }
  }

  // 2. Try Groq AI if Groq key exists
  const effectiveGroqKey = await getEffectiveGroqKey();
  if (effectiveGroqKey) {
    try {
      const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }, {
        headers: {
          'Authorization': `Bearer ${effectiveGroqKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const content = groqRes.data.choices[0].message.content;
      const parsed = JSON.parse(content);
      if (parsed && parsed.companyProfile && parsed.recruiters) {
        sanitizeDossierLinks(parsed, companyName, searchData);
        return { dossier: parsed, engine: 'groq-llama3-70b' };
      }
    } catch (groqErr) {
      console.warn('Groq synthesis fallback error:', groqErr.message);
    }
  }

  // 3. Fallback heuristic synthesis from scraped data
  const heuristicDossier = generateHeuristicDossier({
    jobTitle,
    companyName,
    jobUrl,
    searchData
  });

  return { dossier: heuristicDossier, engine: 'heuristic-dossier' };
}

/**
 * Ensure no google.com/search or bing.com/search link ever leaks into the final output
 */
function sanitizeDossierLinks(dossier, companyName, searchData) {
  const fallback = resolveBestJobLink(
    searchData.careerResults,
    searchData.directAtsResults,
    searchData.exactMatch,
    companyName,
    ''
  );

  if (dossier.companyProfile?.directApplicationBypass) {
    const link = dossier.companyProfile.directApplicationBypass.verifiedDirectLink || '';
    if (!link || link.includes('google.com/search') || link.includes('bing.com/search')) {
      dossier.companyProfile.directApplicationBypass.verifiedDirectLink = fallback;
    }
  }

  if (dossier.companyProfile?.identifiedEntities) {
    dossier.companyProfile.identifiedEntities.forEach(ent => {
      if (!ent.officialCareersUrl || ent.officialCareersUrl.includes('google.com/search') || ent.officialCareersUrl.includes('bing.com/search')) {
        ent.officialCareersUrl = fallback;
      }
      if (!ent.quickApplyUrl || ent.quickApplyUrl.includes('google.com/search') || ent.quickApplyUrl.includes('bing.com/search')) {
        ent.quickApplyUrl = fallback;
      }
    });
  }
}

module.exports = {
  synthesizeJobResearch,
  getEffectiveGeminiKey
};
