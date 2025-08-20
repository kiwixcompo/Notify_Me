const axios = require('axios');
const cheerio = require('cheerio');

class SearchService {
  constructor() {
    this.jobSources = [
      {
        name: 'GitHub Jobs',
        url: 'https://jobs.github.com/positions.json',
        params: { location: 'remote', full_time: true },
        transform: (data) => data.map(job => ({
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          url: job.url,
          created_at: job.created_at,
          source: 'GitHub Jobs'
        }))
      },
      {
        name: 'Remote.co',
        url: 'https://remote.co/remote-jobs/',
        method: 'scrape',
        transform: (data) => data.map(job => ({
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          url: job.url,
          created_at: job.created_at,
          source: 'Remote.co'
        }))
      },
      {
        name: 'We Work Remotely',
        url: 'https://weworkremotely.com/categories/remote-programming-jobs',
        method: 'scrape',
        transform: (data) => data.map(job => ({
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          url: job.url,
          created_at: job.created_at,
          source: 'We Work Remotely'
        }))
      },
      {
        name: 'Stack Overflow Jobs',
        url: 'https://stackoverflow.com/jobs/feed',
        method: 'rss',
        transform: (data) => data.map(job => ({
          title: job.title,
          company: job.company,
          location: job.location,
          type: job.type,
          description: job.description,
          url: job.url,
          created_at: job.created_at,
          source: 'Stack Overflow'
        }))
      }
    ];

    this.scholarshipSources = [
      {
        name: 'Scholarships.com',
        url: 'https://www.scholarships.com/scholarships',
        method: 'scrape',
        transform: (data) => data.map(scholarship => ({
          title: scholarship.title,
          amount: scholarship.amount,
          deadline: scholarship.deadline,
          description: scholarship.description,
          url: scholarship.url,
          eligibility: scholarship.eligibility,
          level: scholarship.level,
          source: 'Scholarships.com'
        }))
      },
      {
        name: 'Fastweb',
        url: 'https://www.fastweb.com/scholarships',
        method: 'scrape',
        transform: (data) => data.map(scholarship => ({
          title: scholarship.title,
          amount: scholarship.amount,
          deadline: scholarship.deadline,
          description: scholarship.description,
          url: scholarship.url,
          eligibility: scholarship.eligibility,
          level: scholarship.level,
          source: 'Fastweb'
        }))
      },
      {
        name: 'College Board',
        url: 'https://bigfuture.collegeboard.org/scholarship-search',
        method: 'scrape',
        transform: (data) => data.map(scholarship => ({
          title: scholarship.title,
          amount: scholarship.amount,
          deadline: scholarship.deadline,
          description: scholarship.description,
          url: scholarship.url,
          eligibility: scholarship.eligibility,
          level: scholarship.level,
          source: 'College Board'
        }))
      }
    ];
  }

  async searchJobs(query = '', limit = 50) {
    const allJobs = [];
    
    for (const source of this.jobSources) {
      try {
        let data;
        
        if (source.method === 'scrape') {
          data = await this.scrapeJobs(source.url, query);
        } else if (source.method === 'rss') {
          data = await this.fetchRSS(source.url);
        } else {
          // API method
          const response = await axios.get(source.url, {
            params: { ...source.params, q: query },
            timeout: 10000
          });
          data = response.data;
        }
        
        if (data && Array.isArray(data)) {
          const transformedJobs = source.transform(data);
          allJobs.push(...transformedJobs);
        }
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error.message);
      }
    }
    
    // Sort by creation date (newest first) and limit results
    return allJobs
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit);
  }

  async searchScholarships(query = '', limit = 50) {
    const allScholarships = [];
    
    for (const source of this.scholarshipSources) {
      try {
        let data;
        
        if (source.method === 'scrape') {
          data = await this.scrapeScholarships(source.url, query);
        } else {
          const response = await axios.get(source.url, {
            params: { q: query },
            timeout: 10000
          });
          data = response.data;
        }
        
        if (data && Array.isArray(data)) {
          const transformedScholarships = source.transform(data);
          // Filter out expired scholarships
          const validScholarships = transformedScholarships.filter(scholarship => {
            if (!scholarship.deadline) return true;
            const deadline = new Date(scholarship.deadline);
            return deadline > new Date();
          });
          allScholarships.push(...validScholarships);
        }
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error.message);
      }
    }
    
    // Sort by deadline (closest first) and limit results
    return allScholarships
      .sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      })
      .slice(0, limit);
  }

  async scrapeJobs(url, query) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const jobs = [];
      
      // Generic job scraping - adjust selectors based on the site
      $('.job-listing, .job-item, .position, [class*="job"]').each((i, element) => {
        const $el = $(element);
        const title = $el.find('.title, .job-title, h2, h3').first().text().trim();
        const company = $el.find('.company, .employer, .organization').first().text().trim();
        const location = $el.find('.location, .place, .city').first().text().trim();
        const description = $el.find('.description, .summary, .details').first().text().trim();
        const url = $el.find('a').first().attr('href');
        
        if (title && (query ? title.toLowerCase().includes(query.toLowerCase()) : true)) {
          jobs.push({
            title,
            company,
            location,
            type: 'Full-time',
            description,
            url: url ? (url.startsWith('http') ? url : new URL(url, url).href) : '',
            created_at: new Date().toISOString(),
            source: 'Scraped'
          });
        }
      });
      
      return jobs;
    } catch (error) {
      console.error('Error scraping jobs:', error.message);
      return [];
    }
  }

  async scrapeScholarships(url, query) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      const scholarships = [];
      
      // Generic scholarship scraping - adjust selectors based on the site
      $('.scholarship, .award, .grant, [class*="scholarship"]').each((i, element) => {
        const $el = $(element);
        const title = $el.find('.title, .name, h2, h3').first().text().trim();
        const amount = $el.find('.amount, .value, .award-amount').first().text().trim();
        const deadline = $el.find('.deadline, .due-date, .closing-date').first().text().trim();
        const description = $el.find('.description, .summary, .details').first().text().trim();
        const url = $el.find('a').first().attr('href');
        
        if (title && (query ? title.toLowerCase().includes(query.toLowerCase()) : true)) {
          scholarships.push({
            title,
            amount,
            deadline,
            description,
            url: url ? (url.startsWith('http') ? url : new URL(url, url).href) : '',
            eligibility: '',
            level: '',
            source: 'Scraped'
          });
        }
      });
      
      return scholarships;
    } catch (error) {
      console.error('Error scraping scholarships:', error.message);
      return [];
    }
  }

  async fetchRSS(url) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      // Basic RSS parsing - you might want to use a proper RSS parser
      const $ = cheerio.load(response.data, { xmlMode: true });
      const items = [];
      
      $('item').each((i, element) => {
        const $el = $(element);
        items.push({
          title: $el.find('title').text(),
          company: $el.find('company, author').text(),
          location: $el.find('location, city').text(),
          type: $el.find('type, employmentType').text(),
          description: $el.find('description, summary').text(),
          url: $el.find('link').text(),
          created_at: $el.find('pubDate, date').text()
        });
      });
      
      return items;
    } catch (error) {
      console.error('Error fetching RSS:', error.message);
      return [];
    }
  }
}

module.exports = new SearchService(); 