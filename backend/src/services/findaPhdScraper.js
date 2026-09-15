/**
 * findaPhdScraper.js
 * Scraper for FindAPhD using puppeteer-real-browser to bypass Cloudflare Turnstile WAF.
 */

const cheerio = require('cheerio');

function buildFindAPhDUrl({ subject = 'computer-science', keywords = '', international = true, page = 1 } = {}) {
  // Use valid facet code '?01w0' for worldwide funded PhD projects or '?01M0' for international
  const facet = international ? '01w0' : '01M0';
  const cleanSubject = (subject || 'computer-science').toLowerCase().replace(/\s+/g, '-');
  let base = `https://www.findaphd.com/phds/${cleanSubject}/?${facet}`;

  const params = new URLSearchParams();
  if (keywords) params.append('Keywords', keywords);
  if (page > 1) params.append('PG', page.toString());

  const queryString = params.toString();
  return queryString ? `${base}&${queryString}` : base;
}

async function scrapeFindAPhD(searchOptions = {}) {
  const targetUrl = buildFindAPhDUrl(searchOptions);
  console.log(`[FindAPhD] Connecting stealth browser to: ${targetUrl}`);

  let connect;
  try {
    const realBrowserModule = require('puppeteer-real-browser');
    connect = realBrowserModule.connect;
  } catch (err) {
    console.error('[FindAPhD] puppeteer-real-browser not available:', err.message);
    return [];
  }

  let browser;
  const projects = [];

  try {
    const session = await connect({
      headless: false,
      turnstile: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = session.page;
    browser = session.browser;

    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });

    // Allow Turnstile solver to complete and dynamic content to settle
    await new Promise(res => setTimeout(res, 6000));

    try {
      await page.waitForSelector('.resultsRow, .phd-result-row-standard, div[class*="phd-result"]', { timeout: 8000 });
    } catch (waitErr) {
      console.warn('[FindAPhD] Container selector wait timed out, attempting content parse anyway.');
    }

    await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.8));
    await new Promise(res => setTimeout(res, 1500));

    const html = await page.content();
    const $ = cheerio.load(html);

    $('.resultsRow, .phd-result-row-standard, div[class*="phd-result"]').each((_, el) => {
      const card = $(el);

      // Clean title from h3 or h4
      let rawTitle = card.find('h3, h4').first().text().trim();
      
      // Link to project
      const projectAnchor = card.find('a[href*="/phds/project/"]').first();
      const rawHref = projectAnchor.attr('href');
      if (!rawHref) return;

      if (!rawTitle) {
        // Fallback: title inside span
        const lines = projectAnchor.text().split('\n').map(l => l.trim()).filter(Boolean);
        rawTitle = lines.find(l => l.length > 15 && !/more details|read more/i.test(l)) || '';
      }

      if (!rawTitle) return;

      const projectUrl = rawHref.startsWith('http')
        ? rawHref
        : `https://www.findaphd.com${rawHref}`;

      // Institution / University
      let university = '';
      card.find('span, a').each((_, elem) => {
        const t = $(elem).text().trim();
        if (/University|College|Institute|School of/i.test(t) && t.length < 60 && !university) {
          university = t;
        }
      });
      if (!university) university = 'UK / European University';

      // Supervisor
      let supervisor = '';
      const superEl = card.find('.super, .phd-result__key-info.super, .badge:contains("Supervisors:")');
      if (superEl.length > 0) {
        supervisor = superEl.text().replace(/^[\s\S]*?Supervisors?:\s*/i, '').trim();
      }
      if (!supervisor) {
        card.find('span, div, a').each((_, elem) => {
          const t = $(elem).text().trim();
          if (/Supervisors?:/i.test(t) && !supervisor) {
            supervisor = t.replace(/^.*?Supervisors?:\s*/i, '').trim();
          }
        });
      }
      if (supervisor) {
        // Clean out noisy badges like 'HDR', 'Cardiff', 'Swansea' or trailing punctuation
        supervisor = supervisor.replace(/\b(HDR|PGR|PhD|MSc|FHEA|BSc|Cardiff|Swansea|Bristol|Exeter|Bath)\b/gi, '').replace(/\s+,/g, ',').replace(/\s+/g, ' ').trim();
      }
      if (!supervisor) supervisor = 'Project Supervisor';

      // Project Description
      let description = '';
      const descEl = card.find('.descFrag, .phd-result__description, .desc, p').first();
      if (descEl.length > 0) {
        description = descEl.text().replace(/Read more[\s\S]*$/i, '').trim();
      }

      // Funding
      let fundingType = 'Competition Funded PhD Project (Students Worldwide)';
      card.find('span').each((_, elem) => {
        const t = $(elem).text().trim();
        if (/Funded|Studentship|Scholarship/i.test(t) && t.length < 80) {
          fundingType = t;
        }
      });
      const isFullyFunded = /funded|studentship/i.test(fundingType);

      // Deadline
      let deadline = 'Applications Open (2026/2027)';
      card.find('span').each((_, elem) => {
        const t = $(elem).text().trim();
        const m = t.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4}|[A-Za-z]+\s+\d{1,2},?\s+\d{4})/);
        if (m && !deadline.includes(m[1])) {
          deadline = m[1];
        }
      });

      const country = 'United Kingdom';

      projects.push({
        id: 'fphd_' + Buffer.from(projectUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(-16),
        source: 'FindAPhD',
        siteId: 'findaphd',
        title: rawTitle,
        university,
        supervisor,
        description,
        country,
        matchedCountries: [country],
        fundingType,
        isFullyFunded,
        isComputerScience: true,
        deadline,
        rawDeadline: deadline,
        benefits: ['Tuition Fee Waiver', 'Annual Research Stipend', 'Research Equipment Support'],
        url: projectUrl,
        scrapedAt: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error(`[FindAPhD] Scraping exception: ${error.message}`);
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }

  return projects;
}

module.exports = {
  buildFindAPhDUrl,
  scrapeFindAPhD
};
