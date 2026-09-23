const { searchGoogle } = require('./searchService');

/**
 * Searches LinkedIn for professors, PIs, and graduate coordinators matching the topic
 * using 3 parallel targeted search vectors
 */
async function findAcademicProfiles(proposedTopic, targetCountry = '', serperApiKey = '') {
  const cleanTopic = (proposedTopic || '').trim();
  const countryTerm = targetCountry && targetCountry.trim() ? `("${targetCountry.trim()}")` : '';

  const [activelyRecruiting, labDirectors, graduateAdvisors] = await Promise.all([
    // Vector 1: Faculty actively signaling open graduate / PhD funding
    searchGoogle(
      `site:linkedin.com/in ("Assistant Professor" OR "Associate Professor" OR "Principal Investigator") "${cleanTopic}" ("accepting PhD" OR "looking for students" OR "open positions" OR "fully funded" OR "RA positions" OR "GRA") ${countryTerm}`,
      6,
      serperApiKey
    ),

    // Vector 2: Lab directors and established domain researchers
    searchGoogle(
      `site:linkedin.com/in ("Professor" OR "Director of Research" OR "Lab Director" OR "Head of Lab") "${cleanTopic}" ("University" OR "Institute of Technology" OR "College") ${countryTerm}`,
      6,
      serperApiKey
    ),

    // Vector 3: Graduate Coordinators (Gatekeepers who manage departmental assistantships and waivers)
    searchGoogle(
      `site:linkedin.com/in ("Director of Graduate Studies" OR "Graduate Program Coordinator" OR "Department Chair") "${cleanTopic}" "University" ${countryTerm}`,
      6,
      serperApiKey
    )
  ]);

  return {
    activelyRecruiting,
    labDirectors,
    graduateAdvisors
  };
}

module.exports = {
  findAcademicProfiles
};
