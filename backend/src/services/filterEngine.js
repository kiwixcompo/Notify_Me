/**
 * filterEngine.js
 * Normalization & filter engine for scholarship websites
 */

const KNOWN_COUNTRIES = [
  'United States', 'USA', 'US', 'Canada', 'United Kingdom', 'UK',
  'Germany', 'Australia', 'Netherlands', 'Sweden', 'Switzerland',
  'France', 'Singapore', 'Japan', 'South Korea', 'New Zealand', 'China',
  'Ireland', 'Norway', 'Denmark', 'Finland', 'Austria', 'Italy', 'Spain',
  'Belgium', 'UAE', 'Hong Kong', 'Saudi Arabia'
];

/**
 * Extracts structured typed attributes from scholarship page text
 */
function extractScholarshipAttributes(text) {
  if (!text) return {};

  // 1. Funding status
  const isFullyFunded = /fully[\s-]funded|full\s+tuition|100%\s+tuition|stipend\s+provided|fully\s+supported/i.test(text);
  const isPartiallyFunded = /partial\s+scholarship|tuition\s+waiver|partial\s+funding|partial\s+stipend/i.test(text);

  // 2. Deadline parsing
  const deadlinePatterns = [
    /(?:deadline|closing\s+date|apply\s+(?:before|by))[:\s*]+([A-Za-z]+\s+\d{1,2},?\s+\d{4})/i,
    /(?:deadline|closing\s+date)[:\s*]+(\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+,?\s+\d{4})/i,
    /(?:deadline|closing\s+date)[:\s*]+(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /(?:deadline|closes)[:\s*]+([A-Za-z]+\s+\d{4})/i
  ];

  let rawDeadline = null;
  let parsedDeadline = null;

  for (const pattern of deadlinePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      rawDeadline = match[1].trim();
      const timestamp = Date.parse(rawDeadline);
      if (!isNaN(timestamp)) {
        parsedDeadline = new Date(timestamp);
      }
      break;
    }
  }

  // 3. Subject / Field extraction
  const isComputerScience = /computer\s+science|software\s+engineering|artificial\s+intelligence|machine\s+learning|data\s+science|cybersecurity|informatics|computing|information\s+technology/i.test(text);

  // 4. Host countries
  const matchedCountries = KNOWN_COUNTRIES.filter(country =>
    new RegExp(`\\b${country}\\b`, 'i').test(text)
  );

  // 5. Benefits detection
  const benefits = [];
  if (/tuition\s+fee|tuition\s+waiver|free\s+tuition|100%\s+tuition/i.test(text)) benefits.push('Tuition Covered');
  if (/monthly\s+stipend|annual\s+allowance|living\s+allowance|stipend/i.test(text)) benefits.push('Living Stipend');
  if (/health\s+insurance|medical\s+insurance|insurance\s+coverage/i.test(text)) benefits.push('Health Insurance');
  if (/travel\s+(?:grant|allowance|airfare)|flight|air\s+ticket/i.test(text)) benefits.push('Travel Allowance');
  if (/accommodation|housing\s+allowance/i.test(text)) benefits.push('Housing/Accommodation');

  return {
    isFullyFunded: isFullyFunded && !isPartiallyFunded,
    isPartiallyFunded,
    deadline: parsedDeadline,
    rawDeadline: rawDeadline || 'Open / Check Portal',
    isComputerScience,
    matchedCountries: [...new Set(matchedCountries)],
    benefits
  };
}

/**
 * Validates whether an opportunity matches requested query criteria
 */
function matchesCriteria(parsedData, filters = {}) {
  // Fully Funded check
  if (filters.onlyFullyFunded && !parsedData.isFullyFunded) {
    return false;
  }

  // Active deadline check (drop past deadlines)
  if (filters.excludeExpired && parsedData.deadline) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedData.deadline < today) return false;
  }

  // Field check (e.g. Computer Science)
  if (filters.computerScienceOnly && !parsedData.isComputerScience) {
    return false;
  }

  // Country filter
  if (filters.targetCountries && filters.targetCountries.length > 0) {
    const hasCountry = parsedData.matchedCountries.some(c =>
      filters.targetCountries.map(tc => tc.toLowerCase()).includes(c.toLowerCase())
    );
    if (!hasCountry) return false;
  }

  return true;
}

module.exports = {
  extractScholarshipAttributes,
  matchesCriteria,
  KNOWN_COUNTRIES
};
