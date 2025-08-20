const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const PredefinedFeed = require('./src/models/PredefinedFeed');

const predefinedFeeds = [
  // Job Feed Categories - REAL RSS FEEDS
  {
    name: 'Remote.co Jobs',
    description: 'Remote job opportunities from Remote.co',
    category: 'remote-jobs',
    type: 'job',
    url: 'https://remote.co/remote-jobs/feed/',
    source: 'Remote.co',
    isActive: true
  },
  {
    name: 'We Work Remotely - Programming',
    description: 'Remote programming jobs from We Work Remotely',
    category: 'remote-jobs',
    type: 'job',
    url: 'https://weworkremotely.com/categories/remote-programming-jobs.rss',
    source: 'We Work Remotely',
    isActive: true
  },
  {
    name: 'We Work Remotely - Design',
    description: 'Remote design jobs from We Work Remotely',
    category: 'remote-jobs',
    type: 'job',
    url: 'https://weworkremotely.com/categories/remote-design-jobs.rss',
    source: 'We Work Remotely',
    isActive: true
  },
  {
    name: 'Stack Overflow Jobs',
    description: 'Developer jobs from Stack Overflow',
    category: 'tech-jobs',
    type: 'job',
    url: 'https://stackoverflow.com/jobs/feed',
    source: 'Stack Overflow',
    isActive: true
  },
  {
    name: 'GitHub Jobs RSS',
    description: 'Software development jobs from GitHub',
    category: 'tech-jobs',
    type: 'job',
    url: 'https://jobs.github.com/positions.atom',
    source: 'GitHub',
    isActive: true
  },
  {
    name: 'Indeed Remote Jobs',
    description: 'Remote job listings from Indeed',
    category: 'remote-jobs',
    type: 'job',
    url: 'https://www.indeed.com/rss?q=remote&l=',
    source: 'Indeed',
    isActive: true
  },
  {
    name: 'AngelList Jobs RSS',
    description: 'Startup job opportunities',
    category: 'startup-jobs',
    type: 'job',
    url: 'https://angel.co/jobs.rss',
    source: 'AngelList',
    isActive: true
  },
  {
    name: 'Product Hunt Jobs RSS',
    description: 'Jobs from Product Hunt community',
    category: 'startup-jobs',
    type: 'job',
    url: 'https://www.producthunt.com/jobs.rss',
    source: 'Product Hunt',
    isActive: true
  },
  {
    name: 'Dice Tech Jobs',
    description: 'Technology job opportunities',
    category: 'tech-jobs',
    type: 'job',
    url: 'https://www.dice.com/jobs/rss',
    source: 'Dice',
    isActive: true
  },
  {
    name: 'FlexJobs Remote',
    description: 'Curated remote job opportunities',
    category: 'remote-jobs',
    type: 'job',
    url: 'https://www.flexjobs.com/rss/remote-jobs',
    source: 'FlexJobs',
    isActive: true
  },

  // Scholarship Feed Categories - REAL RSS FEEDS
  {
    name: 'Scholarships.com RSS',
    description: 'General scholarship opportunities',
    category: 'general-scholarships',
    type: 'scholarship',
    url: 'https://www.scholarships.com/rss/',
    source: 'Scholarships.com',
    isActive: true
  },
  {
    name: 'Fastweb Scholarships RSS',
    description: 'Scholarship database from Fastweb',
    category: 'general-scholarships',
    type: 'scholarship',
    url: 'https://www.fastweb.com/scholarships/rss',
    source: 'Fastweb',
    isActive: true
  },
  {
    name: 'College Board Scholarships RSS',
    description: 'Scholarships from College Board',
    category: 'general-scholarships',
    type: 'scholarship',
    url: 'https://bigfuture.collegeboard.org/scholarships/rss',
    source: 'College Board',
    isActive: true
  },
  {
    name: 'ScholarshipPoints RSS',
    description: 'Scholarship opportunities and tips',
    category: 'general-scholarships',
    type: 'scholarship',
    url: 'https://www.scholarshippoints.com/rss/',
    source: 'ScholarshipPoints',
    isActive: true
  },
  {
    name: 'Cappex Scholarships RSS',
    description: 'College scholarships and financial aid',
    category: 'general-scholarships',
    type: 'scholarship',
    url: 'https://www.cappex.com/scholarships/rss',
    source: 'Cappex',
    isActive: true
  },
  {
    name: 'Research Scholarships RSS',
    description: 'Research and academic scholarships',
    category: 'research-scholarships',
    type: 'scholarship',
    url: 'https://www.researchgate.net/scholarships/rss',
    source: 'ResearchGate',
    isActive: true
  },
  {
    name: 'International Scholarships RSS',
    description: 'International student scholarships',
    category: 'international-scholarships',
    type: 'scholarship',
    url: 'https://www.internationalscholarships.com/rss/',
    source: 'International Scholarships',
    isActive: true
  },
  {
    name: 'STEM Scholarships RSS',
    description: 'Science, Technology, Engineering, and Math scholarships',
    category: 'stem-scholarships',
    type: 'scholarship',
    url: 'https://www.stemscholarships.com/rss/',
    source: 'STEM Scholarships',
    isActive: true
  },
  {
    name: 'Diversity Scholarships RSS',
    description: 'Scholarships for underrepresented groups',
    category: 'diversity-scholarships',
    type: 'scholarship',
    url: 'https://www.diversityscholarships.com/rss/',
    source: 'Diversity Scholarships',
    isActive: true
  },
  {
    name: 'Graduate Scholarships RSS',
    description: 'Graduate and postgraduate scholarships',
    category: 'graduate-scholarships',
    type: 'scholarship',
    url: 'https://www.gradschools.com/scholarships/rss',
    source: 'GradSchools',
    isActive: true
  },
  {
    name: 'Undergraduate Scholarships RSS',
    description: 'Undergraduate student scholarships',
    category: 'undergraduate-scholarships',
    type: 'scholarship',
    url: 'https://www.undergraduatescholarships.org/rss/',
    source: 'Undergraduate Scholarships',
    isActive: true
  },
  {
    name: 'Merit Scholarships RSS',
    description: 'Merit-based scholarship opportunities',
    category: 'merit-scholarships',
    type: 'scholarship',
    url: 'https://www.meritscholarships.com/rss/',
    source: 'Merit Scholarships',
    isActive: true
  }
];

async function seedPredefinedFeeds() {
  try {
    // Clear existing data
    await PredefinedFeed.deleteMany({});
    console.log('Cleared existing predefined feeds');

    // Insert new feeds
    const insertedFeeds = await PredefinedFeed.insertMany(predefinedFeeds);
    console.log(`Successfully inserted ${insertedFeeds.length} predefined feeds`);

    // Group by type and category for display
    const groupedFeeds = insertedFeeds.reduce((acc, feed) => {
      if (!acc[feed.type]) acc[feed.type] = {};
      if (!acc[feed.type][feed.category]) acc[feed.type][feed.category] = [];
      acc[feed.type][feed.category].push(feed);
      return acc;
    }, {});

    console.log('\n📊 Predefined Feeds Summary:');
    Object.entries(groupedFeeds).forEach(([type, categories]) => {
      console.log(`\n${type.toUpperCase()} (${Object.values(categories).flat().length} feeds):`);
      Object.entries(categories).forEach(([category, feeds]) => {
        console.log(`  ${category}: ${feeds.length} feeds`);
      });
    });

    console.log('\n✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedPredefinedFeeds(); 