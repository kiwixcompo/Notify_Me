const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const PredefinedFeed = require('./src/models/PredefinedFeed');

const predefinedFeeds = [
  // Jobs - Default Sources
  {
    name: 'Jobs Found',
    description: 'Curated remote job opportunities from Jobs Found RSS feed',
    category: 'default-jobs',
    type: 'job',
    url: 'https://rss.app/feeds/Ved3zhgCZQ7I2XNo.xml',
    source: 'Jobs Found (RSS.app)',
    isActive: true
  },
  {
    name: 'Himalayas Remote Jobs',
    description: 'Remote job opportunities from Himalayas job board',
    category: 'default-jobs',
    type: 'job',
    url: 'https://himalayas.app/jobs/rss',
    source: 'Himalayas',
    isActive: true
  },
  {
    name: 'Jobicy Remote Jobs',
    description: 'Remote job feed from Jobicy job board (Note: May be blocked by anti-bot protection)',
    category: 'default-jobs',
    type: 'job',
    url: 'https://jobicy.com/feed/job_feed',
    source: 'Jobicy',
    isActive: false  // Disabled due to 403 blocking
  },
  {
    name: 'We Work Remotely',
    description: 'Remote job opportunities from We Work Remotely',
    category: 'default-jobs',
    type: 'job',
    url: 'https://weworkremotely.com/remote-jobs.rss',
    source: 'We Work Remotely',
    isActive: true
  },

  // Scholarships - Default Sources
  {
    name: 'Scholarships Region',
    description: 'Regional scholarship opportunities and funding programs',
    category: 'default-scholarships',
    type: 'scholarship',
    url: 'https://rss.app/feeds/VxzvBe8gQnW32JhP.xml',
    source: 'Scholarships Region (RSS.app)',
    isActive: true
  },
  {
    name: 'Scholarships and Aid',
    description: 'Comprehensive scholarships and financial aid opportunities',
    category: 'default-scholarships',
    type: 'scholarship',
    url: 'https://rss.app/feeds/dh2Nxk5zrvEhzRd3.xml',
    source: 'Scholarships & Aid (RSS.app)',
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