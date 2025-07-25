require('dotenv').config();
const mongoose = require('mongoose');
const Agenda = require('agenda');
const { fetchJobsFromRSS } = require('../src/services/rssService');
const { sendJobNotification } = require('../src/services/emailService');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
const crypto = require('crypto');
const RssFeed = require('../src/models/RssFeed');

const mongoConnectionString = process.env.MONGODB_URI;
const agenda = new Agenda({ db: { address: mongoConnectionString, collection: 'agendaJobs' } });

// Helper: generate unique job ID
function getWWRJobId(job) {
  return job.guid || crypto.createHash('sha256').update(job.link).digest('hex');
}

agenda.define('poll rss and notify', async (job, done) => {
  try {
    console.log('Polling all RSS feeds...');
    // Fetch all unique feed URLs from all users
    const feeds = await RssFeed.find({});
    const jobs = await fetchJobsFromRSS(feeds);
    let newJobs = [];
    for (const rssJob of jobs) {
      const wwrJobId = getWWRJobId(rssJob);
      let dbJob = await Job.findOne({ wwrJobId });
      if (!dbJob) {
        dbJob = await Job.create({
          wwrJobId,
          title: rssJob.title,
          link: rssJob.link,
          description: rssJob.description,
          publishedDate: new Date(rssJob.pubDate),
          firstSeen: new Date(),
          notifiedUsers: [],
          source: 'rss',
          feedUrl: rssJob.feedUrl || null
        });
        newJobs.push(dbJob);
      }
    }
    if (newJobs.length === 0) {
      console.log('No new RSS jobs found.');
    } else {
      console.log(`Found ${newJobs.length} new RSS jobs.`);
    }
    done();
  } catch (err) {
    console.error('RSS worker error:', err);
    done(err);
  }
});

agenda.define('process notifications', async (job, done) => {
  try {
    console.log('Processing notifications for new jobs...');
    
    // Get all jobs that haven't been processed for notifications yet
    const newJobs = await Job.find({
      firstSeen: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });
    
    if (newJobs.length === 0) {
      console.log('No new jobs to process for notifications.');
      return done();
    }
    
    // Get all users with preferences
    const users = await User.find({ 
      jobPreferences: { $exists: true, $not: { $size: 0 } } 
    });
    
    let notificationCount = 0;
    
    for (const user of users) {
      for (const job of newJobs) {
        // Case-insensitive keyword match in title or description
        const match = user.jobPreferences.some(pref => {
          const re = new RegExp(pref, 'i');
          return re.test(job.title) || re.test(job.description);
        });
        
        if (match && !job.notifiedUsers.includes(user._id)) {
          const sent = await sendJobNotification(user, job);
          if (sent) {
            job.notifiedUsers.push(user._id);
            await job.save();
            notificationCount++;
          }
        }
      }
    }
    
    console.log(`Sent ${notificationCount} notifications.`);
    done();
  } catch (err) {
    console.error('Notification processing error:', err);
    done(err);
  }
});

(async function () {
  await mongoose.connect(mongoConnectionString, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  await agenda.start();
  // Schedule jobs
  await agenda.every('10 minutes', 'poll rss and notify');
  await agenda.every('5 minutes', 'process notifications');
  console.log('Agenda worker started (RSS only).');
})(); 