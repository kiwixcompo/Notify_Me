require('dotenv').config();
const mongoose = require('mongoose');
const { fetchJobsFromRSS } = require('./src/services/rssService');
const twitterService = require('./src/services/twitterService');
const Job = require('./src/models/Job');

async function testWorker() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');

    // Check current jobs in database
    const totalJobs = await Job.countDocuments({});
    console.log('Total jobs in database:', totalJobs);

    // Test RSS fetching
    console.log('\nTesting RSS fetching...');
    try {
      const rssJobs = await fetchJobsFromRSS();
      console.log('RSS jobs found:', rssJobs.length);
      if (rssJobs.length > 0) {
        console.log('First RSS job:', rssJobs[0]);
      }
    } catch (error) {
      console.error('RSS fetch error:', error.message);
    }

    // Test Twitter fetching
    console.log('\nTesting Twitter fetching...');
    try {
      const twitterJobs = await twitterService.fetchJobsFromTwitter();
      console.log('Twitter jobs found:', twitterJobs.length);
      if (twitterJobs.length > 0) {
        console.log('First Twitter job:', twitterJobs[0]);
      }
    } catch (error) {
      console.error('Twitter fetch error:', error.message);
    }

    // Show recent jobs
    console.log('\nRecent jobs in database:');
    const recentJobs = await Job.find().sort({ firstSeen: -1 }).limit(5);
    console.log('Recent jobs:', recentJobs.length);
    recentJobs.forEach(job => {
      console.log(`- ${job.title} (${job.source}) - ${job.publishedDate}`);
    });

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

testWorker(); 