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
 * Queries OpenAlex for real, published faculty and lab leads in the given field and country
 */
/**
 * Queries OpenAlex for real, published faculty and lab leads in the given field and country
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
            recruitmentTimeframe: recruitmentTimeframe || 'Immediate / Ongoing Cycle',
            fundingDetails: 'Funded Departmental Graduate Assistantship / Research Grant'
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
 * Searches LinkedIn and OpenAlex for professors, PIs, and graduate coordinators matching the topic
 * using targeted search vectors with recruitment timeframe, funding detection, and automatic scholarly fallback
 */
async function findAcademicProfiles(proposedTopic, targetCountry = '', serperApiKey = '', recruitmentTimeframe = '') {
  const cleanTopic = (proposedTopic || '').trim();
  const countryTerm = targetCountry && targetCountry.trim() ? `("${targetCountry.trim()}")` : '';
  
  // Format timeframe term for targeted Google/LinkedIn search dorks
  let timeframeTerm = '';
  if (recruitmentTimeframe && recruitmentTimeframe.trim() && recruitmentTimeframe !== 'Any' && recruitmentTimeframe !== 'all') {
    const tf = recruitmentTimeframe.trim();
    timeframeTerm = `("${tf}" OR "${tf.replace(/\s+/g, ' ')}")`;
  }

  // 1. Run web search dorks (Google via Serper or Brave)
  const [activelyRecruiting, labDirectors, graduateAdvisors] = await Promise.all([
    // Vector 1: Faculty actively signaling open graduate / PhD funding with intake timeframe & benefits
    searchGoogle(
      `site:linkedin.com/in ("Assistant Professor" OR "Associate Professor" OR "Principal Investigator") "${cleanTopic}" ("accepting PhD" OR "looking for students" OR "open positions" OR "fully funded" OR "RA positions" OR "GRA" OR "tuition waiver" OR "stipend") ${timeframeTerm} ${countryTerm}`.replace(/\s+/g, ' ').trim(),
      8,
      serperApiKey
    ),

    // Vector 2: Lab directors and established domain researchers mentioning funding or intake
    searchGoogle(
      `site:linkedin.com/in ("Professor" OR "Director of Research" OR "Lab Director" OR "Head of Lab") "${cleanTopic}" ("University" OR "Institute of Technology" OR "College") ("funding" OR "funded" OR "grant" OR "students") ${timeframeTerm} ${countryTerm}`.replace(/\s+/g, ' ').trim(),
      6,
      serperApiKey
    ),

    // Vector 3: Graduate Coordinators (Gatekeepers who manage departmental assistantships and waivers)
    searchGoogle(
      `site:linkedin.com/in ("Director of Graduate Studies" OR "Graduate Program Coordinator" OR "Department Chair") "${cleanTopic}" "University" ${countryTerm}`.replace(/\s+/g, ' ').trim(),
      6,
      serperApiKey
    )
  ]);

  const totalDorkCount =
    (activelyRecruiting?.length || 0) +
    (labDirectors?.length || 0) +
    (graduateAdvisors?.length || 0);

  // 2. If search dorks returned 0 results (due to SERP rate limits or strict terms),
  // immediately query the OpenAlex Scholarly Knowledge Graph
  let openAlexFaculty = [];
  if (totalDorkCount === 0) {
    console.log(`[Supervisor Finder] SERP search returned 0 records. Querying OpenAlex Scholarly Knowledge Graph for "${cleanTopic}"...`);
    openAlexFaculty = await findOpenAlexAcademicProfiles(cleanTopic, targetCountry, recruitmentTimeframe);
  }

  return {
    activelyRecruiting,
    labDirectors,
    graduateAdvisors,
    openAlexFaculty,
    recruitmentTimeframe
  };
}

module.exports = {
  findAcademicProfiles,
  findOpenAlexAcademicProfiles
};
