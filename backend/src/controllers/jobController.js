const Job = require('../models/Job');
const User = require('../models/User');
const searchService = require('../services/searchService');

// GET /api/jobs - Get jobs for a specific date or today
async function getUserJobs(req, res, next) {
  try {
    const userId = req.userId;
    const User = require('../models/User');
    const RssFeed = require('../models/RssFeed');
    const { fetchItemsFromMultipleSources } = require('../services/rssService');
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const { date, last24h } = req.query;
    
    // Get user's job feeds
    const userFeeds = await RssFeed.find({ user: userId, type: 'job' });
    
    if (userFeeds.length === 0) {
      return res.json({
        jobs: [],
        message: 'No job feeds configured. Please add some RSS feeds in preferences.',
        totalJobs: 0
      });
    }
    
    // Fetch jobs from user's RSS feeds
    console.log(`Fetching jobs from ${userFeeds.length} feeds for user ${userId}`);
    const rssJobs = await fetchItemsFromMultipleSources(userFeeds, 'job');
    
    // Convert RSS jobs to the expected format
    let jobs = rssJobs.map(rssJob => ({
      title: rssJob.title,
      link: rssJob.link,
      description: rssJob.description,
      publishedDate: rssJob.pubDate ? new Date(rssJob.pubDate) : new Date(),
      source: rssJob.isXML ? 'xml' : rssJob.isJSON ? 'json' : rssJob.isCSV ? 'csv' : 'rss',
      feedUrl: rssJob.feedUrl,
      feedName: rssJob.feedName,
      categories: rssJob.categories || [],
      guid: rssJob.guid,
      // Add format indicators for frontend
      isXML: rssJob.isXML,
      isJSON: rssJob.isJSON,
      isCSV: rssJob.isCSV,
      isCodeBased: rssJob.isCodeBased
    }));
    
    // Filter by date if specified
    if (last24h === 'true') {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      jobs = jobs.filter(job => job.publishedDate >= dayAgo && job.publishedDate <= now);
      jobs.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
      
      return res.json({
        jobs,
        last24h: true,
        totalJobs: jobs.length,
        feedsCount: userFeeds.length
      });
    }
    
    if (date) {
      // Parse as local time (YYYY-MM-DD)
      const [yyyy, mm, dd] = date.split('-');
      const targetDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
      
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      jobs = jobs.filter(job => {
        const jobDate = new Date(job.publishedDate);
        return jobDate >= startOfDay && jobDate <= endOfDay;
      });
      
      jobs.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
      
      return res.json({
        jobs,
        date: `${startOfDay.getFullYear()}-${String(startOfDay.getMonth() + 1).padStart(2, '0')}-${String(startOfDay.getDate()).padStart(2, '0')}`,
        totalJobs: jobs.length,
        feedsCount: userFeeds.length
      });
    }
    
    // Default: return all jobs from today
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    jobs = jobs.filter(job => {
      const jobDate = new Date(job.publishedDate);
      return jobDate >= startOfToday && jobDate <= endOfToday;
    });
    
    // If no jobs today, return recent jobs (last 7 days)
    if (jobs.length === 0) {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      jobs = rssJobs.map(rssJob => ({
        title: rssJob.title,
        link: rssJob.link,
        description: rssJob.description,
        publishedDate: rssJob.pubDate ? new Date(rssJob.pubDate) : new Date(),
        source: rssJob.isXML ? 'xml' : rssJob.isJSON ? 'json' : rssJob.isCSV ? 'csv' : 'rss',
        feedUrl: rssJob.feedUrl,
        feedName: rssJob.feedName,
        categories: rssJob.categories || [],
        guid: rssJob.guid,
        isXML: rssJob.isXML,
        isJSON: rssJob.isJSON,
        isCSV: rssJob.isCSV,
        isCodeBased: rssJob.isCodeBased
      })).filter(job => {
        const jobDate = new Date(job.publishedDate);
        return jobDate >= weekAgo;
      });
    }
    
    jobs.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
    
    res.json({
      jobs,
      date: `${startOfToday.getFullYear()}-${String(startOfToday.getMonth() + 1).padStart(2, '0')}-${String(startOfToday.getDate()).padStart(2, '0')}`,
      totalJobs: jobs.length,
      feedsCount: userFeeds.length,
      message: jobs.length === 0 ? 'No recent jobs found from your feeds' : undefined
    });
  } catch (err) {
    console.error('Error in getUserJobs:', err);
    res.status(500).json({ error: 'Failed to fetch jobs from your feeds' });
  }
}

// GET /api/jobs/calendar - Get job counts for calendar view
async function getJobCalendar(req, res, next) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { month, year, filterByPreferences = true } = req.query;
    
    // Parse month/year or use current
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    // Set date range for the entire month
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // Build query
    let query = {
      publishedDate: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    };

    // Add preference filtering if requested
    if (filterByPreferences === true && user.jobPreferences && user.jobPreferences.length > 0) {
      const preferenceRegex = user.jobPreferences.map(pref => 
        new RegExp(pref, 'i')
      );
      
      query.$and = [
        {
          $or: [
            { title: { $in: preferenceRegex } },
            { description: { $in: preferenceRegex } }
          ]
        }
      ];
    }

    // Aggregate jobs by date
    const jobCounts = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$publishedDate"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Convert to object for easier frontend consumption
    const calendarData = {};
    jobCounts.forEach(item => {
      calendarData[item._id] = item.count;
    });

    res.json({
      calendarData,
      month: targetMonth,
      year: targetYear,
      filterByPreferences: filterByPreferences === true
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/jobs/stats - Get job statistics
async function getJobStats(req, res, next) {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { days = 30 } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Build query
    let query = {
      publishedDate: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Add preference filtering
    if (user.jobPreferences && user.jobPreferences.length > 0) {
      const preferenceRegex = user.jobPreferences.map(pref => 
        new RegExp(pref, 'i')
      );
      
      query.$and = [
        {
          $or: [
            { title: { $in: preferenceRegex } },
            { description: { $in: preferenceRegex } }
          ]
        }
      ];
    }

    // Get total jobs
    const totalJobs = await Job.countDocuments(query);
    
    // Get jobs by source
    const jobsBySource = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 }
        }
      }
    ]);

    // Get jobs by day
    const jobsByDay = await Job.aggregate([
      { $match: query },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$publishedDate"
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } },
      { $limit: 7 }
    ]);

    res.json({
      totalJobs,
      jobsBySource,
      jobsByDay,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/jobs/search - Real-time job search from multiple sources
async function searchJobsRealTime(req, res, next) {
  try {
    const { query = '', limit = 50 } = req.query;
    
    // Get real-time search results
    const searchResults = await searchService.searchJobs(query, parseInt(limit));
    
    res.json({
      success: true,
      jobs: searchResults,
      total: searchResults.length,
      query,
      sources: searchResults.map(job => job.source)
    });
  } catch (err) {
    console.error('Error in searchJobsRealTime:', err);
    res.status(500).json({ error: 'Failed to search jobs' });
  }
}

module.exports = { getUserJobs, getJobCalendar, getJobStats, searchJobsRealTime }; 