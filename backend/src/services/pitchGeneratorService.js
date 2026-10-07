const axios = require('axios');
const SystemConfig = require('../models/SystemConfig');

/**
 * Generates an irresistible, tailored Cold Pitch Deck & Email for a business missing a website
 */
async function generateWebsitePitch({ businessName, location, serviceNiche, websiteStatus, domain, ownerName, groqApiKey = '' }) {
  let effectiveKey = groqApiKey || process.env.GROQ_API_KEY || '';
  if (!effectiveKey) {
    try {
      const config = await SystemConfig.findOne({ key: 'GROQ_API_KEY' }).maxTimeMS(2000);
      if (config && config.value) effectiveKey = config.value;
    } catch (e) {}
  }

  const prompt = `
ACT AS AN EXPERT B2B DIGITAL AGENCY DIRECTOR & HIGH-CONVERTING COLD SALES STRATEGIST.
Your goal is to write a personalized, non-spammy, high-converting cold outreach pitch offering custom website development, mobile optimization, and local SEO services to a business that currently has NO website (or recently purchased a fresh domain).

Business Details:
- Business Name: ${businessName}
- Location: ${location || 'Local Area'}
- Industry / Niche: ${serviceNiche || 'Local Commercial Service'}
- Website Status: ${websiteStatus || 'no_website'}
- Target Domain: ${domain || 'N/A'}
- Owner / Contact Name: ${ownerName || 'Business Owner'}

KEY PRINCIPLES:
1. Empathy & Specific Value: Don't insult them. Point out how their competitors on Google Maps are taking customers who search for them on mobile.
2. Concrete Solutions: Propose a modern 1-page or 3-page high-converting site (Fast loading, Click-to-Call button, Google Reviews widget, Booking/Inquiry form).
3. Low-Friction Call-to-Action: Offer to send a free 30-second Figma mockup or demo preview with zero commitment.

RETURN STRICT JSON (NO MARKDOWN CODE BLOCKS, RAW JSON ONLY):
{
  "subjectLines": [
    "Quick question about [Business Name]'s website",
    "Figma mockup for [Business Name] (free demo)",
    "Missing out on local searches in [Location]?"
  ],
  "elevatorPitch": "1-2 sentence compelling summary of why they need this right now.",
  "emailBody": "Full formatted email with salutation, body paragraphs, and professional sign-off.",
  "recommendedTechStack": ["Next.js / Tailwind CSS", "WordPress / Elementor", "Vercel / Cloudflare Fast CDN"],
  "suggestedPackages": [
    {
      "tier": "Starter Presence",
      "priceRange": "$400 - $750",
      "deliverables": "Responsive 1-page landing site, Google Maps SEO, Click-to-call, Contact Form"
    },
    {
      "tier": "Growth & Booking Suite",
      "priceRange": "$1,000 - $2,200",
      "deliverables": "Multi-page website, Online appointment scheduler, Local SEO optimization, Review showcase"
    }
  ],
  "objectionHandlers": [
    {
      "objection": "We get enough word-of-mouth clients.",
      "rebuttal": "A professional website isn't just for strangers—it validates word-of-mouth referrals when they Google you on their phones."
    }
  ]
}
`;

  if (effectiveKey) {
    try {
      const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: 'llama3-70b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }, {
        headers: {
          'Authorization': `Bearer ${effectiveKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      const parsed = JSON.parse(response.data.choices[0].message.content);
      return parsed;
    } catch (err) {
      console.warn('Groq pitch generation failed, falling back to heuristic pitch generator:', err.message);
    }
  }

  // Heuristic template fallback (100% Free, zero external API keys needed)
  return {
    subjectLines: [
      `Quick question regarding ${businessName}'s website`,
      `Created a quick website mockup for ${businessName}`,
      `Helping ${businessName} capture more local customers in ${location || 'your area'}`
    ],
    elevatorPitch: `Over 78% of local service inquiries in ${location || 'your area'} originate from mobile searches. Without an active website, ${businessName} is losing direct booking revenue to competitors on Google Maps.`,
    emailBody: `Hi ${ownerName || 'there'},\n\nI came across ${businessName} while researching top local providers in ${location || 'your area'} and noticed you don't have an active website linked to your business profile.\n\nMost customers looking for ${serviceNiche || 'services'} now search on their smartphones and expect an instant way to view reviews, check opening hours, or tap to call/request a quote.\n\nI specialize in building lightning-fast, high-converting websites designed specifically for local businesses. I've already put together a quick interactive preview mockup showing what a modern site for ${businessName} could look like.\n\nWould you be open to seeing the free preview? No pressure or commitment at all.\n\nBest regards,\nWeb Development & Digital Lead Specialist`,
    recommendedTechStack: ["Next.js / Modern React", "Tailwind CSS", "Mobile-first responsive architecture"],
    suggestedPackages: [
      {
        tier: "Essential Local Presence",
        priceRange: "$450 - $750",
        deliverables: "High-speed mobile website, Click-to-call button, Quote request form, Google Maps integration"
      },
      {
        tier: "Full Business Growth Suite",
        priceRange: "$1,200 - $2,500",
        deliverables: "Multi-page design, Online appointment scheduling, Local SEO rank optimization, Customer review showcase"
      }
    ],
    objectionHandlers: [
      {
        objection: "We rely primarily on word-of-mouth.",
        rebuttal: "A modern website validates word-of-mouth recommendations when customers look up your phone number or credibility on their phone."
      }
    ]
  };
}

module.exports = {
  generateWebsitePitch
};
