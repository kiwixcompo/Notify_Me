const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache'
};

function cleanText(str) {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Extract Gig and Seller details from Fiverr URL
 */
async function extractFiverrGig(gigUrl) {
  if (!gigUrl || !gigUrl.includes('fiverr.com')) {
    throw new Error('Please provide a valid Fiverr gig or profile URL (e.g. https://www.fiverr.com/username/gig-slug)');
  }

  const cleanUrl = gigUrl.split('?')[0];
  let html = '';
  try {
    const res = await axios.get(cleanUrl, {
      headers: DEFAULT_BROWSER_HEADERS,
      timeout: 12000
    });
    html = res.data;
  } catch (err) {
    console.warn(`[FiverrService] Axios fetch failed (${err.message}). Using fallback parsing.`);
  }

  let gigData = {
    url: cleanUrl,
    title: '',
    sellerName: '',
    sellerLevel: 'New Seller',
    sellerCountry: 'Worldwide',
    memberSince: '',
    rating: 5.0,
    reviewCount: 0,
    description: '',
    tags: [],
    category: '',
    pricingTiers: [],
    faqs: [],
    rawSnippet: ''
  };

  if (html) {
    const $ = cheerio.load(html);
    const nextDataRaw = $('script#__NEXT_DATA__').html();
    if (nextDataRaw) {
      try {
        const parsedNext = JSON.parse(nextDataRaw);
        const gigProps = parsedNext?.props?.pageProps?.gig || parsedNext?.props?.pageProps?.initialData?.gig;
        const sellerProps = parsedNext?.props?.pageProps?.seller || parsedNext?.props?.pageProps?.initialData?.seller;

        if (gigProps) {
          gigData.title = gigProps.title || gigProps.name || '';
          gigData.description = gigProps.description || '';
          gigData.tags = gigProps.tags || gigProps.search_tags || [];
          gigData.category = gigProps.category?.name || gigProps.sub_category?.name || '';
          if (gigProps.ratings) {
            gigData.rating = gigProps.ratings.avg_rating || 5.0;
            gigData.reviewCount = gigProps.ratings.count || 0;
          }
        }
        if (sellerProps) {
          gigData.sellerName = sellerProps.username || sellerProps.name || '';
          gigData.sellerLevel = sellerProps.level || (sellerProps.is_top_rated ? 'Top Rated' : 'Level 2');
          gigData.sellerCountry = sellerProps.country || '';
          gigData.memberSince = sellerProps.member_since || sellerProps.registered_at || '';
        }
      } catch (e) {
        console.warn('[FiverrService] Could not parse __NEXT_DATA__:', e.message);
      }
    }

    if (!gigData.title) {
      gigData.title = cleanText($('h1.text-display-3, h1.gig-overview-title, h1').first().text()) || $('title').text().replace(/\| Fiverr.*$/i, '').trim();
    }
    if (!gigData.description) {
      gigData.description = cleanText($('.gig-description, [data-testid="gig-description"], .description-content').text());
    }
    if (gigData.tags.length === 0) {
      $('.gig-tags-container a, .tags-list a, .related-tags a').each((_, el) => {
        const tag = cleanText($(el).text());
        if (tag && !gigData.tags.includes(tag)) gigData.tags.push(tag);
      });
    }
    if (!gigData.sellerName) {
      const sellerLink = $('a[href*="/sellers/"], .seller-card-name a, .user-name').first().text();
      gigData.sellerName = cleanText(sellerLink);
    }
    if (!gigData.sellerCountry) {
      const countryEl = $('.seller-card-from, .country-name').first().text();
      gigData.sellerCountry = cleanText(countryEl) || 'Global Freelancer';
    }
  }

  const urlParts = cleanUrl.replace(/^https?:\/\/(www\.)?fiverr\.com\//i, '').split('/');
  const inferredUsername = urlParts[0] || 'Freelancer';
  const inferredSlug = (urlParts[1] || urlParts[0] || '').replace(/-/g, ' ');

  if (!gigData.title) {
    gigData.title = inferredSlug ? `I will ${inferredSlug}` : 'Professional Freelance Service';
  }
  if (!gigData.sellerName) {
    gigData.sellerName = inferredUsername;
  }
  if (gigData.tags.length === 0) {
    const keywords = gigData.title.toLowerCase().replace(/i will/gi, '').split(/\s+/).filter(w => w.length > 3);
    gigData.tags = [...new Set(keywords)].slice(0, 5);
  }
  if (!gigData.memberSince) {
    gigData.memberSince = '2023';
  }

  return gigData;
}

function analyzeFiverrGaps(userGig) {
  const title = userGig.title || '';
  const tagList = userGig.tags || [];
  const charCount = title.length;
  const hasIWill = /^i\s+will/i.test(title);
  const titleTagOverlap = tagList.filter(t => title.toLowerCase().includes(t.toLowerCase()));
  const primaryKeywords = title.replace(/^i\s+will\s+/i, '').split(/\s+(?:and|with|for|in)\s+/i)[0] || title;

  return {
    charCount,
    isTitleOptimalLength: charCount >= 30 && charCount <= 60,
    hasIWillFormat: hasIWill,
    tagCount: tagList.length,
    hasMaxTags: tagList.length === 5,
    titleTagOverlapCount: titleTagOverlap.length,
    primaryKeywords: primaryKeywords.trim()
  };
}

async function generateFiverrOptimizations({ userGig, gapAnalysis, groqApiKey }) {
  const apiKey = groqApiKey || process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Groq API Key is required to run Fiverr SEO & Image Prompt generation.');
  }

  const systemInstruction = `
YOU ARE A WORLD-CLASS FIVERR ALGORITHM SPECIALIST, TOP-RATED FREELANCER MENTOR, AND MIDJOURNEY/GENERATIVE ART DIRECTOR.
You decode the Fiverr Search & Ranking Algorithm (Matrix) which balances:
1. Keyword relevancy & intent match (Title exact root + 5 Exact Search Tags + First 100 words of description).
2. Click-Through Rate (CTR) driven by high-converting, non-cluttered Gig Cover Images.
3. Natural client acquisition readiness (Response speed expectation, bio authority, pricing anchoring vs account age).

YOUR TASK:
Analyze the user's current Fiverr gig and seller profile details. Provide an exact, high-converting optimization plan.

INPUT DATA:
- Current Title: "${userGig.title}"
- Current Tags: ${JSON.stringify(userGig.tags)}
- Seller Username: "${userGig.sellerName}"
- Member Since / Account Age: "${userGig.memberSince}"
- Seller Level: "${userGig.sellerLevel}"
- Seller Country: "${userGig.sellerCountry}"
- Current Description: "${(userGig.description || '').slice(0, 800)}"

CRITICAL OUTPUT REQUIREMENTS:
1. "optimizedTitle": Must be strictly under 60 characters, start with "I will ", include the primary high-volume root keyword, and state a tangible client outcome.
2. "searchTags": Array of EXACTLY 5 high-traffic, low-to-medium competition search tags (max 20 chars each) that directly reinforce the title keyword.
3. "descriptionStrategy":
   - "first100WordsHook": Clear hook mentioning the primary keyword in the first 2 sentences.
   - "bulletPoints": Array of 4-6 deliverable bullets highlighting speed, quality, and guarantee.
   - "callToAction": Compelling closing message instructing buyers to message before placing an order.
4. "faqs": Exactly 3 SEO-targeted FAQs addressing client objections and embedding secondary keywords naturally.
5. "gigImagePrompt": A comprehensive, state-of-the-art generative AI prompt (for Midjourney v6 / DALL-E 3 / Flux) designed to produce an eye-catching 16:9 Fiverr gig thumbnail. Include specific composition rules: clean negative space, 3D modern isometric or studio minimalism, high-contrast focal element, zero blurry text, clear visual proof of service, hex color palette recommendations, and camera/lighting specifications.
6. "profileReadinessRating":
   - "score": Integer 0-100 indicating readiness to attract clients naturally without paid ads.
   - "accountAgeEvaluation": Detailed analysis of how their account age (${userGig.memberSince}) impacts algorithmic trust. Explain how a new vs. older profile must adjust pricing and response time.
   - "commendations": 2-3 genuine things the seller is doing right or strengths in their niche positioning.
   - "actionableChecklist": 3-5 prioritized, concrete steps the freelancer must execute today to trigger algorithmic impressions and convert organic impressions into inquiries.

RESPOND STRICTLY IN VALID JSON WITH NO MARKDOWN OR BACKTICKS.
Schema:
{
  "optimizedTitle": "string",
  "titleChangeRationale": "string",
  "searchTags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "tagsRationale": "string",
  "descriptionStrategy": {
    "first100WordsHook": "string",
    "bulletPoints": ["bullet 1", "bullet 2"],
    "callToAction": "string"
  },
  "faqs": [
    { "question": "string", "answer": "string" }
  ],
  "gigImagePrompt": {
    "masterPrompt": "string",
    "negativePrompt": "string",
    "aspectRatio": "16:9",
    "recommendedPalette": ["#Hex1", "#Hex2", "#Hex3"],
    "textBadgeGuidance": "string",
    "compositionAdvice": "string"
  },
  "profileReadinessRating": {
    "score": 85,
    "grade": "A-",
    "accountAgeEvaluation": "string",
    "commendations": ["commendation 1", "commendation 2"],
    "actionableChecklist": ["action 1", "action 2", "action 3"]
  }
}
`;

  const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
    model: 'llama3-70b-8192',
    messages: [{ role: 'user', content: systemInstruction }],
    temperature: 0.2,
    response_format: { type: 'json_object' }
  }, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 60000
  });

  const content = response.data.choices[0].message.content;
  return JSON.parse(content);
}

module.exports = {
  extractFiverrGig,
  analyzeFiverrGaps,
  generateFiverrOptimizations
};
