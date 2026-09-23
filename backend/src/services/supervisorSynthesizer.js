const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');
const { getEffectiveGeminiKey } = require('./researchSynthesizer');

/**
 * Fallback synthesizer for academic profiles when AI API keys are unavailable
 */
function generateHeuristicAcademicDossier(proposedTopic, searchData) {
  const allResults = [
    ...(searchData.activelyRecruiting || []).map(r => ({ ...r, category: 'ACTIVELY_RECRUITING' })),
    ...(searchData.labDirectors || []).map(r => ({ ...r, category: 'LAB_DIRECTOR' })),
    ...(searchData.graduateAdvisors || []).map(r => ({ ...r, category: 'GRADUATE_COORDINATOR' }))
  ];

  const profiles = allResults.slice(0, 8).map(item => {
    // Parse "Dr. First Last - Title - University | LinkedIn"
    const parts = (item.title || '').split(/[-–|]/).map(s => s.trim());
    const rawName = parts[0] || 'Dr. Academic Faculty';
    const name = rawName.startsWith('Dr.') || rawName.startsWith('Prof.') ? rawName : `Prof. ${rawName}`;
    const academicRole = parts[1] || (item.category === 'ACTIVELY_RECRUITING' ? 'Assistant Professor / PI' : item.category === 'LAB_DIRECTOR' ? 'Professor & Lab Director' : 'Director of Graduate Studies');
    const institution = parts[2] || 'University Research Department';

    return {
      name,
      academicRole,
      institution,
      departmentOrLab: `${proposedTopic} Research Group`,
      linkedInUrl: item.link.includes('linkedin.com') ? item.link : `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(name)}`,
      category: item.category,
      researchAlignment: `Actively explores foundational and applied challenges intersecting with ${proposedTopic}.`,
      fundingSignal: item.category === 'ACTIVELY_RECRUITING' 
        ? 'Actively Advertising Funded PhD / Research Assistant Slots' 
        : 'Standard Institutional RA/TA via Department & Lab Grants',
      outreachKit: {
        linkedInNote: `Dear ${name}, I follow your lab's contributions in ${proposedTopic}. I am preparing applications for prospective research/PhD positions and would value connecting to discuss potential research synergy.`,
        formalColdEmail: {
          subjectLine: `Prospective Graduate / PhD Researcher Inquiry: ${proposedTopic} - Candidate`,
          body: `Dear ${name},\n\nI hope this email finds you well. I have been following your lab's research and was particularly drawn to your recent initiatives exploring core challenges in ${proposedTopic}.\n\nWith a strong technical and research background, I am eager to contribute to your ongoing investigations. I am writing to inquire if you have open funded graduate (PhD/RA) positions for the upcoming term, or if you are considering new students whose focus aligns with ${proposedTopic}.\n\nI have attached my academic CV and summary of research experience for your review. Thank you very much for your time and guidance.\n\nSincerely,\nProspective Researcher`
        }
      }
    };
  });

  return { profiles };
}

/**
 * Gemini Academic Synthesizer
 * Uses Google Gen AI SDK (@google/genai) with gemini-2.5-flash or Groq fallback
 */
async function synthesizeAcademicDossier(proposedTopic, searchData, geminiApiKey = '') {
  const effectiveGeminiKey = geminiApiKey || await getEffectiveGeminiKey();

  const prompt = `
You are an academic fellowship advisor and research scout. Analyze these raw LinkedIn search results for prospective supervisors, professors, and academic contact persons relevant to the user's research topic.

### Proposed Topic / Research Area:
"${proposedTopic}"

### Raw Discovered Profiles:
1. Actively Recruiting Profiles:
${JSON.stringify(searchData.activelyRecruiting || [], null, 2)}

2. Lab Directors & Professors:
${JSON.stringify(searchData.labDirectors || [], null, 2)}

3. Graduate Program Directors / Coordinators:
${JSON.stringify(searchData.graduateAdvisors || [], null, 2)}

### Task & Output Format:
Return a strictly valid JSON object matching this schema (NO markdown backticks, NO markdown formatting, just raw JSON):
{
  "profiles": [
    {
      "name": "Full name with academic title (e.g., Dr. Sarah Jenkins)",
      "academicRole": "e.g., Assistant Professor / Principal Investigator",
      "institution": "University / Institute Name",
      "departmentOrLab": "Department or Research Lab name",
      "linkedInUrl": "Direct LinkedIn profile link",
      "category": "ACTIVELY_RECRUITING" | "LAB_DIRECTOR" | "GRADUATE_COORDINATOR",
      "researchAlignment": "1-2 sentences highlighting where their lab focus intersects with '${proposedTopic}'",
      "fundingSignal": "Clear mention of funding/slots, or 'Standard Institutional RA/TA via Department'",
      "outreachKit": {
        "linkedInNote": "A polite 280-character connection note tailored to their research and asking about supervision.",
        "formalColdEmail": {
          "subjectLine": "Prospective PhD/Researcher Inquiry: [Short Research Angle] - [Student Name]",
          "body": "A professional 3-paragraph cold email explaining how the student's background aligns with their recent papers, proposing a research direction based on '${proposedTopic}', and inquiring if they have funded openings or advise students."
        }
      }
    }
  ]
}

Filter out irrelevant corporate profiles, marketing reps, or student profiles. Keep only genuine faculty, researchers, or graduate coordinators. Limit to the top 6-8 strongest candidates.
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
      if (parsed && Array.isArray(parsed.profiles)) {
        return parsed;
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
      if (parsed && Array.isArray(parsed.profiles)) {
        return parsed;
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
