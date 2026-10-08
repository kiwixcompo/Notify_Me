const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');
const { getEffectiveGeminiKey } = require('./researchSynthesizer');

/**
 * Fallback synthesizer for academic profiles when AI API keys are unavailable
 */
function generateHeuristicAcademicDossier(proposedTopic, searchData) {
  const timeframe = searchData.recruitmentTimeframe || 'Immediate / Upcoming Cycle';

  // Helper to extract funding or timeframe clues from raw snippet
  function extractFundingAndBenefits(snippet = '', category = '') {
    const text = snippet.toLowerCase();
    const benefits = [];
    if (text.includes('tuition waiver') || text.includes('tuition')) benefits.push('Tuition Waiver');
    if (text.includes('stipend')) benefits.push('Living Stipend');
    if (text.includes('ra') || text.includes('research assistant') || text.includes('gra')) benefits.push('Research Assistantship (RA)');
    if (text.includes('ta') || text.includes('teaching assistant')) benefits.push('Teaching Assistantship (TA)');
    if (text.includes('health') || text.includes('insurance')) benefits.push('Health Insurance');
    if (text.includes('fully funded') || text.includes('full funding')) benefits.push('Full Tuition + Monthly Stipend');

    if (benefits.length > 0) {
      return benefits.join(', ');
    }

    if (category === 'ACTIVELY_RECRUITING') {
      return 'Fully Funded Graduate Assistantship (Stipend + Tuition Covered)';
    } else if (category === 'GRADUATE_COORDINATOR') {
      return 'Departmental Fellowships, TA/RA Positions & Fee Waivers';
    }
    return 'Lab Grant / Departmental Graduate Research Assistantship';
  }

  function extractTimeframe(snippet = '') {
    const text = snippet.toLowerCase();
    if (text.includes('fall 2026') || text.includes('fall 26')) return 'Fall 2026';
    if (text.includes('spring 2026') || text.includes('spring 26')) return 'Spring 2026';
    if (text.includes('fall 2025') || text.includes('fall 25')) return 'Fall 2025';
    if (text.includes('spring 2025') || text.includes('spring 25')) return 'Spring 2025';
    if (text.includes('summer')) return 'Summer Session';
    if (text.includes('immediate') || text.includes('open now') || text.includes('asap')) return 'Immediate Opening';
    return timeframe && timeframe !== 'Any' ? timeframe : 'Upcoming Academic Intake / Ongoing';
  }

  // 1. Gather all candidates from LinkedIn vectors (Posts + Profiles)
  const linkedInResults = [
    ...(searchData.linkedinPosts || []).map(r => ({ ...r, category: 'ACTIVELY_RECRUITING' })),
    ...(searchData.activelyRecruiting || []).map(r => ({ ...r, category: 'ACTIVELY_RECRUITING' })),
    ...(searchData.labDirectors || []).map(r => ({ ...r, category: 'LAB_DIRECTOR' })),
    ...(searchData.graduateAdvisors || []).map(r => ({ ...r, category: 'GRADUATE_COORDINATOR' }))
  ];

  // 2. Gather candidates from OpenAlex scholarly graph
  const openAlexResults = (searchData.openAlexFaculty || []).map((f, i) => ({
    title: `${f.name} - Professor & Principal Investigator - ${f.institution}`,
    link: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${f.name} ${f.institution}`)}`,
    snippet: `Published author of "${f.paperTitle}" (${f.year}). Active research in ${f.topic || proposedTopic}.`,
    institution: f.institution,
    rawName: f.name,
    paperTitle: f.paperTitle,
    category: i % 2 === 0 ? 'ACTIVELY_RECRUITING' : 'LAB_DIRECTOR',
    recruitmentTimeframe: f.recruitmentTimeframe,
    fundingDetails: f.fundingDetails
  }));

  const allCandidates = linkedInResults.length > 0 ? linkedInResults : openAlexResults;

  // STRICTLY limit results to 8
  const profiles = allCandidates.slice(0, 8).map(item => {
    // Parse "Dr. First Last - Title - University | LinkedIn"
    const parts = (item.title || '').split(/[-–|]/).map(s => s.trim());
    let rawName = item.rawName || parts[0] || 'Academic Faculty';
    rawName = rawName.replace(/'s Post.*$/i, '').replace(/on LinkedIn.*$/i, '').trim();
    const name = rawName.startsWith('Dr.') || rawName.startsWith('Prof.') ? rawName : `Prof. ${rawName}`;
    const academicRole = parts[1] || (item.category === 'ACTIVELY_RECRUITING' ? 'Assistant Professor / PI' : item.category === 'LAB_DIRECTOR' ? 'Professor & Lab Director' : 'Director of Graduate Studies');
    const institution = item.institution || parts[2] || 'University Research Department';
    const profTimeframe = item.recruitmentTimeframe || extractTimeframe(item.snippet);
    const fundingAndBenefits = item.fundingDetails || extractFundingAndBenefits(item.snippet, item.category);

    return {
      name,
      academicRole,
      institution,
      departmentOrLab: `${proposedTopic} Research Group`,
      linkedInUrl: item.link.includes('linkedin.com') ? item.link : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${name} ${institution}`)}`,
      category: item.category,
      recruitmentTimeframe: profTimeframe,
      fundingAndBenefits,
      researchAlignment: item.paperTitle
        ? `Leads investigations intersecting with ${proposedTopic}, recently authoring "${item.paperTitle}".`
        : `Actively explores foundational and applied challenges intersecting with ${proposedTopic}.`,
      fundingSignal: item.category === 'ACTIVELY_RECRUITING'
        ? 'Actively Advertising Funded PhD / Research Assistant Slots'
        : 'Standard Institutional RA/TA via Department & Lab Grants',
      outreachKit: {
        linkedInNote: `Dear ${name}, I follow your lab's contributions in ${proposedTopic} at ${institution}. I am preparing applications for prospective research/PhD positions for ${profTimeframe} and would value connecting to discuss research synergy.`,
        formalColdEmail: {
          subjectLine: `Prospective Graduate / PhD Researcher Inquiry: ${proposedTopic} (${profTimeframe}) - Candidate`,
          body: `Dear ${name},\n\nI hope this email finds you well. I have been following your research at ${institution} and was particularly drawn to your contributions in ${proposedTopic}${item.paperTitle ? ` (including "${item.paperTitle}")` : ''}.\n\nWith a strong technical and research background, I am eager to contribute to your ongoing investigations. I am writing to inquire if you have open funded graduate positions (PhD/RA) for ${profTimeframe}, or if you are considering new students whose focus aligns with ${proposedTopic}.\n\nI have attached my academic CV and summary of research experience for your review. Thank you very much for your time and consideration.\n\nSincerely,\nProspective Researcher`
        }
      }
    };
  });

  return { profiles: profiles.slice(0, 8) };
}

/**
 * Gemini Academic Synthesizer
 * Uses Google Gen AI SDK (@google/genai) with gemini-2.5-flash or Groq fallback
 */
async function synthesizeAcademicDossier(proposedTopic, searchData, geminiApiKey = '') {
  const effectiveGeminiKey = geminiApiKey || await getEffectiveGeminiKey();
  const requestedTimeframe = searchData.recruitmentTimeframe || 'Any / Upcoming Intake';

  const prompt = `
You are an academic fellowship advisor and research scout. Analyze these raw search results and scholarly author records for prospective supervisors, professors, and academic contact persons relevant to the user's research topic.

### Proposed Topic / Research Area:
"${proposedTopic}"

### Desired Recruitment Timeframe:
"${requestedTimeframe}"

### Raw Discovered Profiles:
1. Direct LinkedIn Public Openings & Faculty Posts (site:linkedin.com/posts):
${JSON.stringify(searchData.linkedinPosts || [], null, 2)}

2. Actively Recruiting Profiles:
${JSON.stringify(searchData.activelyRecruiting || [], null, 2)}

3. Lab Directors & Professors:
${JSON.stringify(searchData.labDirectors || [], null, 2)}

4. Graduate Program Directors / Coordinators:
${JSON.stringify(searchData.graduateAdvisors || [], null, 2)}

5. OpenAlex Scholarly Knowledge Graph Faculty:
${JSON.stringify(searchData.openAlexFaculty || [], null, 2)}

### Task & Output Format:
Return a strictly valid JSON object matching this schema (NO markdown backticks, NO markdown formatting, just raw JSON).
IMPORTANT: Return AT MOST 8 profiles.
{
  "profiles": [
    {
      "name": "Full name with academic title (e.g., Prof. Sarah Jenkins)",
      "academicRole": "e.g., Assistant Professor / Principal Investigator",
      "institution": "University / Institute Name",
      "departmentOrLab": "Department or Research Lab name",
      "linkedInUrl": "Direct LinkedIn profile link or people search URL",
      "category": "ACTIVELY_RECRUITING" | "LAB_DIRECTOR" | "GRADUATE_COORDINATOR",
      "recruitmentTimeframe": "Specific term they are recruiting for (e.g., 'Fall 2026', 'Spring 2026', 'Fall 2025', 'Immediate', 'Upcoming Intake')",
      "fundingAndBenefits": "Specific funding & benefits available (e.g., 'Full Tuition Waiver + \$32,000/yr Stipend + Health Insurance', or 'Funded Graduate RA/TA', or 'Departmental Fellowship')",
      "researchAlignment": "1-2 sentences highlighting where their lab focus intersects with '${proposedTopic}'",
      "fundingSignal": "Clear mention of funding/slots, or 'Standard Institutional RA/TA via Department'",
      "outreachKit": {
        "linkedInNote": "A polite 280-character connection note tailored to their research and asking about supervision for their recruitment timeframe.",
        "formalColdEmail": {
          "subjectLine": "Prospective PhD/Researcher Inquiry: [Short Research Angle] - [Student Name]",
          "body": "A professional 3-paragraph cold email explaining how the student's background aligns with their recent papers, proposing a research direction based on '${proposedTopic}', mentioning their target recruitment intake, and inquiring if they have funded openings."
        }
      }
    }
  ]
}

Filter out irrelevant corporate profiles, marketing reps, or student profiles. Keep only genuine faculty, researchers, or graduate coordinators.
STRICT REQUIREMENT: You MUST limit the array to NO MORE THAN 8 profiles.
`;

  // 1. Try Google Gen AI (@google/genai) with gemini-2.5-flash
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
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return { profiles: parsed.profiles.slice(0, 8) };
      }
    } catch (geminiErr) {
      console.warn('Gemini 2.5 academic synthesis failed, attempting Groq fallback:', geminiErr.message);
    }
  }

  // 2. Try Groq fallback
  try {
    const config = await SystemConfig.findOne({ key: 'GROQ_API_KEY' });
    const groqKey = config?.value || process.env.GROQ_API_KEY;
    if (groqKey) {
      const groqRes = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }, {
        headers: {
          'Authorization': `Bearer ${groqKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const parsed = JSON.parse(groqRes.data.choices[0].message.content);
      if (parsed && Array.isArray(parsed.profiles) && parsed.profiles.length > 0) {
        return { profiles: parsed.profiles.slice(0, 8) };
      }
    }
  } catch (groqErr) {
    console.warn('Groq academic synthesis fallback failed:', groqErr.message);
  }

  // 3. Fallback to heuristic parser
  return generateHeuristicAcademicDossier(proposedTopic, searchData);
}

module.exports = {
  synthesizeAcademicDossier
};
