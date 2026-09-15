/**
 * sites.config.js
 * Registry for real-time target scholarship websites
 */

const TARGET_SITES = [
  {
    id: 'findaphd',
    name: 'FindAPhD',
    category: 'Doctoral Projects & Studentships',
    driver: 'stealth_browser',
    baseUrl: 'https://www.findaphd.com/phds/non-eu-students/computer-science/',
    options: {
      subject: 'computer-science',
      international: true
    }
  },
  {
    id: 'scholarshipregion',
    name: 'Scholarship Region',
    category: 'PhD & Postgraduate',
    baseUrl: 'https://www.scholarshipregion.com/category/scholarships/phd-scholarships/',
    paginationUrl: (page) => `https://www.scholarshipregion.com/category/scholarships/phd-scholarships/page/${page}/`,
    selectors: {
      listingCard: 'article, .post-item, .entry',
      titleLink: 'h2.entry-title a, h3.entry-title a, .entry-title a, h2 a, h3 a',
      dateSnippet: '.entry-date, time, .posted-on',
      contentBody: '.entry-content, article, .post-content'
    }
  },
  {
    id: 'scholarshiptab',
    name: 'ScholarshipTab',
    category: 'PhD & Research',
    baseUrl: 'https://www.scholarshiptab.com/phd',
    paginationUrl: (page) => `https://www.scholarshiptab.com/phd?page=${page}`,
    selectors: {
      listingCard: '.scholarship-item, .card, article, tr, .item',
      titleLink: 'h2 a, h3 a, .title a, a[href*="/scholarships/"]',
      dateSnippet: '.deadline, .date, td',
      contentBody: '.details-content, .card-body, .scholarship-details, article, main'
    },
    urlPrefix: 'https://www.scholarshiptab.com'
  },
  {
    id: 'scholarshipsads',
    name: 'ScholarshipsAds',
    category: 'Government & International',
    baseUrl: 'https://www.scholarshipsads.com/phd-scholarships',
    paginationUrl: (page) => `https://www.scholarshipsads.com/phd-scholarships/page/${page}/`,
    selectors: {
      listingCard: '.post-item, article, .item-list, .blog-post, .post',
      titleLink: 'h2 a, h3 a, .entry-title a',
      dateSnippet: '.post-meta, .deadline, time',
      contentBody: '.entry-content, .content-area, article'
    }
  },
  {
    id: 'scholarshipsandaid',
    name: 'Scholarships and Aid',
    category: 'Fully Funded Programs',
    baseUrl: 'https://scholarshipsandaid.org/category/scholarships/',
    paginationUrl: (page) => `https://scholarshipsandaid.org/category/scholarships/page/${page}/`,
    selectors: {
      listingCard: 'article',
      titleLink: 'a[href*="/202"]',
      dateSnippet: '.posted-on, time',
      contentBody: '.entry-content, article, main'
    }
  }
];

module.exports = {
  TARGET_SITES
};
