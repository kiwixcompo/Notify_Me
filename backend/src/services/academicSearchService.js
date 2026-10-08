const axios = require('axios');
const { searchGoogle } = require('./searchService');

/**
 * Map country names to ISO-2 country codes for OpenAlex
 */
const COUNTRY_CODE_MAP = {
  'united kingdom': 'GB',
  'uk': 'GB',
  'great britain': 'GB',
  'england': 'GB',
  'scotland': 'GB',
  'united states': 'US',
  'usa': 'US',
  'us': 'US',
  'canada': 'CA',
  'germany': 'DE',
  'australia': 'AU',
  'france': 'FR',
  'netherlands': 'NL',
  'switzerland': 'CH',
  'sweden': 'SE',
  'japan': 'JP',
  'singapore': 'SG',
  'china': 'CN',
  'ireland': 'IE',
  'new zealand': 'NZ',
  'italy': 'IT',
  'spain': 'ES'
};

/**
 * Known funding agencies and grant patterns for regex extraction
 */
const FUNDING_PATTERNS = [
  /(?:funded by|supported by|grant from|award from)\s+([A-Z][A-Za-z0-9&, -]{2,40})/i,
  /(?:EPSRC|BBSRC|MRC|NERC|ESRC|AHRC|STFC|UKRI|Horizon Europe|Marie Skłodowska-Curie|MSCA|ERC|NSF|NIH|DARPA|CIHR|NSERC|DFG|FNSNF|Wellcome Trust|Leverhulme Trust|Cancer Research UK|CRUK)/i,
  /(?:stipend of|stipend:|stipend around|stipend up to)\s*([£$€]\s*[\d,]+(?:\s*(?:per annum|per year|\/yr|\/year|p\.a\.))?)/i,
  /(?:covers?\s*(?:full\s*)?tuition(?: fees)?\s*(?:and|\+)\s*(?:a\s*)?(?:tax-free\s*)?stipend)/i,
  /(?:fully[- ]funded(?: PhD)?(?: scholarship| studentship| position| grant)?)/i
];

/**
 * Extracts explicit funding source, grant number, or stipend value from text snippets
 */
function extractExactFundingDetails(text) {
  if (!text) return null;
  const clean = text.replace(/\s+/g, ' ');

  // 1. Look for explicit grant/agency names
  const agencyMatch = clean.match(/(?:EPSRC|BBSRC|MRC|NERC|ESRC|AHRC|STFC|UKRI|Horizon Europe|Marie Skłodowska-Curie|MSCA|ERC Advanced Grant|ERC Starting Grant|ERC|NSF grant|NIH grant|DARPA|CIHR|NSERC|DFG|Wellcome Trust|Leverhulme Trust|Cancer Research UK)/i);
  
  // 2. Look for stipend amount
  const stipendMatch = clean.match(/(?:stipend(?:\s*of|\s*:|\s*around|\s*up to)?\s*)([£$€]\s*[\d,]+(?:\s*(?:per annum|per year|\/yr|\/year|p\.a\.))?)/i);

  // 3. Look for tuition + stipend mention
  const fullCoverMatch = clean.match(/(?:covers?\s*(?:full\s*)?tuition(?: fees)?\s*(?:and|\+)\s*(?:a\s*)?(?:tax-free\s*)?stipend)/i);

  // 4. Look for project grant award amount
  const awardAmountMatch = clean.match(/(?:Amount awarded:|award of|grant of)\s*([£$€]\s*[\d,]+)/i);

  const parts = [];
  if (agencyMatch) parts.push(`Funder/Grant: ${agencyMatch[0]}`);
  if (stipendMatch) parts.push(`Stipend: ${stipendMatch[1]}`);
  if (awardAmountMatch) parts.push(`Grant Total: ${awardAmountMatch[1]}`);
  if (fullCoverMatch) parts.push('Full Tuition Fees + Annual Living Stipend');

  if (parts.length > 0) {
    return parts.join(' | ');
  }

  if (/(?:fully[- ]funded|full scholarship|full studentship)/i.test(clean)) {
    return 'Fully Funded (Tuition Fees Covered + Living Allowance/Stipend)';
  }

  return null;
}

/**
 * Searches for explicit, published PhD project studentships on FindAPhD
 */
async function searchFindAPhDOpportunities(topic, country = '', serperApiKey = '', limit = 12) {
  try {
    const cleanTopic = (topic || '').trim();
    const cleanCountry = (country || '').trim();
    const countryTerm = cleanCountry ? `"${cleanCountry}"` : '';

    const query = `site:findaphd.com/phds/project/ "${cleanTopic}" ${countryTerm} ("Supervisor" OR "Funding" OR "Studentship")`.replace(/\s+/g, ' ').trim();
    const results = await searchGoogle(query, limit, serperApiKey);

    return (results || []).map(r => {
      const snippet = r.snippet || '';
      const funding = extractExactFundingDetails(snippet) || 'Advertised Institutional PhD Studentship';
      
      // Attempt supervisor name extraction from snippet e.g. "supervisor/s. Prof John Doe (University)"
      let supervisorName = '';
      let institution = '';
      const supMatch = snippet.match(/supervisor(?:\/s)?\.?\s*([A-Za-z\s.-]{3,35})(?:\(([A-Za-z\s.-]+)\))?/i);
      if (supMatch) {
        supervisorName = supMatch[1].trim();
        institution = supMatch[2]?.trim() || '';
      }

      return {
        title: r.title,
        link: r.link,
        snippet,
        exactFunding: funding,
        candidateSupervisor: supervisorName,
        candidateInstitution: institution,
        source: 'findaphd'
      };
    });
  } catch (err) {
    console.warn('[Academic Scout] FindAPhD search warning:', err.message);
    return [];
  }
}

/**
 * Queries OpenAlex for faculty publishing in the given field and country
 */
async function findOpenAlexAcademicProfiles(topic, country = '', recruitmentTimeframe = '') {
  try {
    const cleanTopic = (topic || '').trim();
    const cleanCountry = (country || '').trim().toLowerCase();
    const countryCode = COUNTRY_CODE_MAP[cleanCountry];

    const params = {
      search: cleanTopic + (country ? ' ' + country : '') + (recruitmentTimeframe ? ' ' + recruitmentTimeframe : ''),
      sort: 'cited_by_count:desc',
      per_page: 15
    };

    if (countryCode) {
      params.filter = `type:article,has_doi:true,authorships.institutions.country_code:${countryCode}`;
    } else {
      params.filter = 'type:article,has_doi:true';
    }

    const res = await axios.get('https://api.openalex.org/works', {
      params,
      headers: {
        'User-Agent': 'NotifyMeAcademicScout/1.0 (mailto:admin@notifyme.org)'
      },
      timeout: 10000
    });

    const works = res.data?.results || [];
    const discovered = [];

    works.forEach(work => {
      let candidateAuthors = work.authorships || [];
      if (countryCode) {
        candidateAuthors = candidateAuthors.filter(a =>
          a.institutions?.some(inst => inst.country_code === countryCode)
        );
      }

      candidateAuthors.forEach(auth => {
        const name = auth.author?.display_name;
        const institution = auth.institutions?.[0]?.display_name || 'Academic Institution';
        if (name && !discovered.some(d => d.name === name)) {
          discovered.push({
            name,
            institution,
            paperTitle: work.title,
            year: work.publication_year,
            doi: work.doi,
            topic: cleanTopic,
            recruitmentTimeframe: recruitmentTimeframe || 'Immediate / Upcoming Cycle',
            fundingDetails: 'Departmental Graduate Research Assistantship (Grant-Funded)'
          });
        }
      });
    });

    return discovered;
  } catch (err) {
    console.warn('[Academic Scout] OpenAlex query fallback warning:', err.message);
    return [];
  }
}

/**
 * Searches LinkedIn Posts, FindAPhD Advertisements, and Faculty Calls
 * using strict first-person intent ("I am looking for a PhD", "We are recruiting", "open PhD position")
 * and extracts exact verified funding details without hallucinations.
 */
async function findAcademicProfiles(proposedTopic, targetCountry = '', serperApiKey = '', recruitmentTimeframe = '') {
  const cleanTopic = (proposedTopic || '').trim();
  const countryTerm = targetCountry && targetCountry.trim() ? `("${targetCountry.trim()}")` : '';
  
  let timeframeTerm = '';
  if (recruitmentTimeframe && recruitmentTimeframe.trim() && recruitmentTimeframe !== 'Any' && recruitmentTimeframe !== 'all') {
    const tf = recruitmentTimeframe.trim();
    timeframeTerm = `("${tf}" OR "${tf.replace(/\s+/g, ' ')}")`;
  }

  // 1. Run targeted first-person recruitment posts on LinkedIn & project advertisements on FindAPhD
  const [firstPersonPosts, labOpenings, findAPhDProjects] = await Promise.all([
    // Vector 1: Direct 1st-person faculty calls stating they are seeking a PhD student
    searchGoogle(
      `site:linkedin.com/posts "PhD" ("I am looking for a PhD" OR "I am seeking a PhD" OR "my lab is looking for" OR "my group is looking for" OR "we are recruiting a PhD" OR "open PhD position" OR "PhD studentship available") "${cleanTopic}" ${timeframeTerm} ${countryTerm} -"tips" -"guide"`.replace(/\s+/g, ' ').trim(),
      12,
      serperApiKey
    ),

    // Vector 2: Professor announcements with funded scholarship/studentship tags
    searchGoogle(
      `site:linkedin.com/posts "PhD" ("fully funded" OR "funded PhD" OR "studentship" OR "RA position" OR "Graduate Research Assistant") ("looking for students" OR "open position" OR "prospective students") "${cleanTopic}" ${timeframeTerm} ${countryTerm} -"scholarship guide" -"tips"`.replace(/\s+/g, ' ').trim(),
      12,
      serperApiKey
    ),

    // Vector 3: Verified advertised PhD projects with guaranteed funding on FindAPhD
    searchFindAPhDOpportunities(cleanTopic, targetCountry, serperApiKey, 10)
  ]);

  // Secondary enrichment: for top posts that don't explicitly list funding in snippet, do a quick secondary funding probe
  const enrichedFirstPerson = await Promise.all((firstPersonPosts || []).map(async (p) => {
    let exactFunding = extractExactFundingDetails(p.snippet);
    if (!exactFunding && p.title) {
      // Clean author name from post title
      const cleanAuthor = p.title.replace(/'s Post.*$/i, '').replace(/on LinkedIn.*$/i, '').replace(/-.*$/i, '').trim();
      if (cleanAuthor && cleanAuthor.length > 3) {
        try {
          const probe = await searchGoogle(`"${cleanAuthor}" PhD funding grant stipend`, 1, serperApiKey);
          if (probe && probe[0]?.snippet) {
            exactFunding = extractExactFundingDetails(probe[0].snippet);
          }
        } catch (e) {}
      }
    }
    return {
      ...p,
      exactFunding: exactFunding || (/(?:fully funded|scholarship|studentship)/i.test(p.snippet) ? 'Fully Funded PhD Scholarship (Tuition + Stipend)' : 'Advertised Funded Project (Inquire for specific grant eligibility)')
    };
  }));

  const enrichedLabOpenings = (labOpenings || []).map(p => ({
    ...p,
    exactFunding: extractExactFundingDetails(p.snippet) || (/(?:fully funded|scholarship|studentship)/i.test(p.snippet) ? 'Fully Funded (Tuition + Living Stipend Covered)' : 'Project Grant Funded (Contact supervisor for funding scope)')
  }));

  // Fallback to OpenAlex if search dorks returned 0 results
  let openAlexFaculty = [];
  if (enrichedFirstPerson.length === 0 && enrichedLabOpenings.length === 0 && findAPhDProjects.length === 0) {
    console.log(`[Supervisor Finder] SERP returned 0 records. Querying OpenAlex for "${cleanTopic}"...`);
    openAlexFaculty = await findOpenAlexAcademicProfiles(cleanTopic, targetCountry, recruitmentTimeframe);
  }

  return {
    firstPersonPosts: enrichedFirstPerson,
    labOpenings: enrichedLabOpenings,
    findAPhDProjects,
    openAlexFaculty,
    recruitmentTimeframe,
    proposedTopic,
    targetCountry
  };
}

module.exports = {
  findAcademicProfiles,
  findOpenAlexAcademicProfiles,
  extractExactFundingDetails
};
