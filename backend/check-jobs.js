require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./src/models/Job');

async function checkJobs() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');

    // Check total jobs
    const totalJobs = await Job.countDocuments({});
    console.log('Total jobs in database:', totalJobs);

    // Check jobs by source
    const rssJobs = await Job.countDocuments({ source: 'weworkremotely' });
    const twitterJobs = await Job.countDocuments({ source: 'twitter' });
    console.log('RSS jobs:', rssJobs);
    console.log('Twitter jobs:', twitterJobs);

    // Show recent jobs
    console.log('\nRecent jobs:');
    const recentJobs = await Job.find().sort({ firstSeen:-1 }).limit(10);
    if (recentJobs.length === 0) {
      console.log('No jobs found in database');
    } else {
      recentJobs.forEach((job, index) => {
        console.log(`${index + 1}. ${job.title} (${job.source}) - ${job.publishedDate}`);
      });
    }

    // Check jobs for today
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0,0);
    const endOfDay = new Date(today);
    endOfDay.setHours(2359, 999);

    const todayJobs = await Job.countDocuments({
      publishedDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    });
    console.log(`\nJobs for today (${today.toISOString().split('T')[0]}):`, todayJobs);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

checkJobs(); 