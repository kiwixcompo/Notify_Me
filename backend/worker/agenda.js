require('dotenv').config();
const mongoose = require('mongoose');
const Agenda = require('agenda');
const { fetchJobsFromRSS, fetchScholarshipsFromRSS } = require('../src/services/rssService');
const { sendJobNotification } = require('../src/services/emailService');
const Job = require('../src/models/Job');
const Scholarship = require('../src/models/Scholarship');
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
    console.log('Polling all RSS and XML feeds...');
    
    // Fetch job feeds (both RSS and XML)
    const jobFeeds = await RssFeed.find({ type: 'job' });
    const jobs = await fetchJobsFromRSS(jobFeeds);
    let newJobs = [];
    
    for (const rssJob of jobs) {
      const wwrJobId = getWWRJobId(rssJob);
      let dbJob = await Job.findOne({ wwrJobId });
      if (!dbJob) {
        const source = rssJob.isXML ? 'xml' : 'rss';
        dbJob = await Job.create({
          wwrJobId,
          title: rssJob.title,
          link: rssJob.link,
          description: rssJob.description,
          publishedDate: new Date(rssJob.pubDate),
          firstSeen: new Date(),
          notifiedUsers: [],
          source: source,
          feedUrl: rssJob.feedUrl || null
        });
        newJobs.push(dbJob);
      }
    }
    
    if (newJobs.length === 0) {
      console.log('No new RSS/XML jobs found.');
    } else {
      console.log(`Found ${newJobs.length} new RSS/XML jobs.`);
    }
    
    // Fetch scholarship feeds (both RSS and XML)
    const scholarshipFeeds = await RssFeed.find({ type: 'scholarship' });
    const scholarships = await fetchScholarshipsFromRSS(scholarshipFeeds);
    let newScholarships = [];
    
    for (const rssScholarship of scholarships) {
      const scholarshipId = getWWRJobId(rssScholarship); // Reuse the same function
      let dbScholarship = await Scholarship.findOne({ 
        title: rssScholarship.title,
        link: rssScholarship.link
      });
      
      if (!dbScholarship) {
        // Extract scholarship details using the scholarship controller logic
        const { processScholarshipFromRSS } = require('../src/controllers/scholarshipController');
        
        // Find the feed that this scholarship came from
        const feed = scholarshipFeeds.find(f => f.url === rssScholarship.feedUrl);
        if (feed) {
          const processedScholarship = await processScholarshipFromRSS(rssScholarship, feed._id);
          if (processedScholarship) {
            newScholarships.push(processedScholarship);
          }
        }
      }
    }
    
    if (newScholarships.length === 0) {
      console.log('No new RSS/XML scholarships found.');
    } else {
      console.log(`Found ${newScholarships.length} new RSS/XML scholarships.`);
    }
    
    done();
  } catch (err) {
    console.error('RSS/XML worker error:', err);
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
        // Expanded: check title, description, content, contentSnippet
        const fields = [job.title, job.description, job.content, job.contentSnippet].map(f => (f || '').toLowerCase());
        const matchedKeywords = user.jobPreferences.filter(pref => {
          const kw = pref.toLowerCase();
          return fields.some(field => field.includes(kw));
        });
        
        if (matchedKeywords.length > 0 && !job.notifiedUsers.includes(user._id)) {
          const sent = await sendJobNotification(user, job, matchedKeywords);
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
  console.log('Agenda worker started (RSS/XML for jobs and scholarships).');
})(); 